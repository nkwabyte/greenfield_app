/**
 * Offline-First CRUD Service for Farmers
 * Implements Dexie-first approach with automatic sync to Firebase
 */

import { db } from '../schema';
import { syncService } from '../sync';
import type { Farmer } from '@/lib/types';
import type { FarmerFormValues } from '@/components/farmers/add-edit-farmer-dialog';
import { getFirebaseFarmers } from '@/lib/firebase/services/farmers';

/**
 * Get all farmers from local database
 */
export async function getAllFarmers(): Promise<Farmer[]> {
    return await db.farmers.toArray();
}

/**
 * Get a single farmer by ID from local database
 */
export async function getFarmer(id: string): Promise<Farmer | undefined> {
    return await db.farmers.get(id);
}

/**
 * Get farmers with pagination
 */
export async function getPaginatedFarmers(page: number, pageSize: number): Promise<{ data: Farmer[], total: number }> {
    const total = await db.farmers.count();
    const data = await db.farmers
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();
    return { data, total };
}

/**
 * Get farmers with filters
 */
export async function getFarmersFiltered(filters: {
    region?: string;
    district?: string;
    society?: string;
    status?: 'Active' | 'Inactive';
}): Promise<Farmer[]> {
    let collection = db.farmers.toCollection();

    if (filters.region) {
        collection = db.farmers.where('region').equals(filters.region);
    }
    if (filters.district) {
        collection = collection.and(f => f.district === filters.district);
    }
    if (filters.society) {
        collection = collection.and(f => f.society === filters.society);
    }
    if (filters.status) {
        collection = collection.and(f => f.status === filters.status);
    }

    return await collection.toArray();
}

/**
 * Get farmers with filters AND pagination (Optimized)
 */
export async function getFarmersPaginatedAndFiltered(
    page: number,
    pageSize: number,
    filters: {
        region?: string;
        district?: string;
        society?: string;
        status?: 'Active' | 'Inactive';
        search?: string; // Added search support
    }
): Promise<{ data: Farmer[], total: number }> {
    let collection: any = db.farmers.toCollection(); // Default to full collection scan

    // 1. Select the best index based on filters (Compound Index Optimization)
    // Dexie will use the compound index to efficiently filter without scanning all records.
    if (filters.region && filters.region !== 'all') {
        if (filters.district && filters.society) {
            // Use [region+district+society] index
            collection = db.farmers.where('[region+district+society]').equals([filters.region, filters.district, filters.society]);
        } else if (filters.district) {
            // Use [region+district] index
            collection = db.farmers.where('[region+district]').equals([filters.region, filters.district]);
        } else if (filters.status) {
            // Use [region+status] index
            collection = db.farmers.where('[region+status]').equals([filters.region, filters.status]);
        } else {
            // Use basic [region] index
            collection = db.farmers.where('region').equals(filters.region);
        }
    } else if (filters.status) {
        // Fallback for status-only filter (might need index for this if common, but less critical than region drill-down)
        collection = db.farmers.where('status').equals(filters.status);
    }
    // Note: If only 'district' is selected without region (rare drill-down), it falls back to full scan or we could add [district] index.
    // Given the hierarchy Region -> District -> Society, starting with Region is standard.

    // 2. Apply remaining filters in-memory (JS filter)
    // These run on the significantly reduced result set from step 1.
    collection = collection.filter((f: Farmer) => {
        // If we used an index for these, we technically don't need to check again, 
        // but Dexie's filter() is additive to the where() clause.
        // However, if we simply used where(), we don't need to filter those specific fields again in JS 
        // UNLESS the index lookup was partial (e.g. using between() on compound).
        // Since we used exact equals(), the index handles it.
        // We only need to handle fields NOT covered by the chosen index.

        // But for simplicity/safety against edge cases (like 'all' value leakage), we can keep checks 
        // OR better: rely on the fact that if we selected an index, we don't need to check those fields.
        // Let's iterate what MIGHT not be covered:

        // If we didn't use the [region+district] index (e.g. only region selected), we still need to check district if provided?
        // Wait, the logic above handles the combinations. 
        // If region+district are provided, we use that index.
        // If region provided but district NOT provided, we use region index.
        // Determine what is NOT handled by the index:

        let match = true;

        // If we didn't use a compound index featuring these, we must check them manually.
        // Actually, the 'if/else' chain above is mutually exclusive for the primary index selection.
        // But what if we have Region + District + Status? 
        // We used [region+district]. We still need to filter by Status.
        if (filters.region && filters.region !== 'all') {
            if (filters.district && filters.society) {
                // Covered: region, district, society. 
                // Remaining: status?
                if (filters.status && f.status !== filters.status) match = false;
            } else if (filters.district) {
                // Covered: region, district.
                // Remaining: society, status
                if (filters.society && f.society !== filters.society) match = false;
                if (filters.status && f.status !== filters.status) match = false;
            } else if (filters.status) {
                // Covered: region, status.
                // Remaining: district, society
                if (filters.district && f.district !== filters.district) match = false;
                if (filters.society && f.society !== filters.society) match = false;
            } else {
                // Covered: region.
                // Remaining: district, society, status
                if (filters.district && f.district !== filters.district) match = false;
                if (filters.society && f.society !== filters.society) match = false;
                if (filters.status && f.status !== filters.status) match = false;
            }
        } else {
            // No region selected. 
            if (filters.status) {
                // Covered: status (if we used status index).
                // Remaining: district, society
                if (filters.district && f.district !== filters.district) match = false;
                if (filters.society && f.society !== filters.society) match = false;
            } else {
                // No index used. Check everything.
                if (filters.region && filters.region !== 'all' && f.region !== filters.region) match = false;
                if (filters.district && f.district !== filters.district) match = false;
                if (filters.society && f.society !== filters.society) match = false;
                if (filters.status && f.status !== filters.status) match = false;
            }
        }

        if (!match) return false;

        // Search is always manual filter unless we use a full-text search engine or extensive indexing
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            return f.name.toLowerCase().includes(searchLower) ||
                (f.contact?.includes(searchLower) ?? false) ||
                (f.community?.toLowerCase().includes(searchLower) ?? false);
        }
        return true;
    });

    const total = await collection.count();
    const data = await collection
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();

    return { data, total };
}

/**
 * Get farmers created within a date range
 */
export async function getFarmersByDateRange(startDate: Date, endDate: Date): Promise<Farmer[]> {
    return await db.farmers
        .where('createdAt')
        .between(startDate.toISOString(), endDate.toISOString(), true, true)
        .toArray();
}

/**
 * Add a new farmer (offline-first)
 */
export async function addFarmer(
    farmerData: FarmerFormValues,
    id: string
): Promise<void> {
    const now = new Date().toISOString();

    const farmer: Farmer = {
        id,
        name: farmerData.name,
        gender: farmerData.gender,
        region: farmerData.region,
        district: farmerData.district,
        society: farmerData.society,
        community: farmerData.community,
        contact: farmerData.contact,
        age: farmerData.age,
        educationLevel: farmerData.educationLevel,
        farmSize: farmerData.farmSize,
        cropsGrown: farmerData.cropsGrown || [],
        status: farmerData.status,
        joinDate: farmerData.joinDate ? (typeof farmerData.joinDate === 'string' ? farmerData.joinDate : farmerData.joinDate.toISOString()) : undefined,
        createdAt: now,
        updatedAt: now,
    };

    // 1. Save to local database immediately
    await db.farmers.add(farmer);

    // 2. Add to sync queue
    await syncService.addToQueue('farmer', 'create', id, farmerData);

    // console.log(`✅ Farmer added locally: ${farmer.name}`);
}

/**
 * Update an existing farmer (offline-first)
 */
export async function updateFarmer(
    id: string,
    farmerData: Partial<FarmerFormValues>
): Promise<void> {
    const now = new Date().toISOString();

    // Get existing farmer
    const existingFarmer = await db.farmers.get(id);
    if (!existingFarmer) {
        throw new Error(`Farmer with ID ${id} not found`);
    }

    // Merge updates with proper type conversion for joinDate
    // Explicitly handle fields that might be Dates to ensure type safety
    const { joinDate: newJoinDate, createdAt: _, updatedAt: __, ...safeUpdates } = farmerData;

    const updatedFarmer: Farmer = {
        ...existingFarmer,
        ...safeUpdates,
        cropsGrown: farmerData.cropsGrown || existingFarmer.cropsGrown,
        joinDate: newJoinDate
            ? (typeof newJoinDate === 'string' ? newJoinDate : newJoinDate.toISOString())
            : existingFarmer.joinDate,
        updatedAt: now,
    };

    // 1. Update local database
    await db.farmers.put(updatedFarmer);

    // 2. Add to sync queue
    await syncService.addToQueue('farmer', 'update', id, farmerData);

    // console.log(`✅ Farmer updated locally: ${updatedFarmer.name}`);
}

/**
 * Delete a farmer (offline-first)
 */
export async function deleteFarmer(id: string): Promise<void> {
    // 1. Delete from local database
    await db.farmers.delete(id);

    // 2. Add to sync queue
    await syncService.addToQueue('farmer', 'delete', id, null);

    // console.log(`✅ Farmer deleted locally: ${id}`);
}

/**
 * Add multiple farmers in batch (for bulk upload)
 */
export async function addFarmersBatch(farmers: Farmer[]): Promise<void> {
    // 1. Add all to local database
    await db.farmers.bulkAdd(farmers);

    // 2. Add each to sync queue
    for (const farmer of farmers) {
        await syncService.addToQueue('farmer', 'create', farmer.id, farmer);
    }

    // console.log(`✅ ${farmers.length} farmers added locally (batch)`);
}

/**
 * Update multiple farmers in batch (for bulk edit)
 */
export async function updateFarmersBatch(ids: string[], updates: Partial<Farmer>): Promise<void> {
    const now = new Date().toISOString();
    const farmersToUpdate = await db.farmers.bulkGet(ids);
    const validFarmers = farmersToUpdate.filter((f): f is Farmer => !!f);

    if (validFarmers.length === 0) return;

    const updatedFarmers = validFarmers.map(farmer => ({
        ...farmer,
        ...updates,
        updatedAt: now,
    }));

    // 1. Update local database
    await db.farmers.bulkPut(updatedFarmers);

    // 2. Add each to sync queue
    // Note: Ideally we'd have a bulk update sync action, but for now we queue individual updates
    for (const farmer of updatedFarmers) {
        // Create a change object that only includes the fields that changed + id
        // But syncService expects the full object or partial? 
        // Looking at updateFarmer, it passes `farmerData` (the partial updates).
        await syncService.addToQueue('farmer', 'update', farmer.id, updates);
    }

    // console.log(`✅ ${updatedFarmers.length} farmers updated locally (batch)`);
}

/**
 * Sync farmers from Firebase to local database
 * This is used for initial load or manual refresh
 */
export async function syncFarmersFromFirebase(): Promise<number> {
    try {
        const firebaseFarmers = await getFirebaseFarmers();

        // Clear local farmers and replace with Firebase data
        await db.farmers.clear();
        await db.farmers.bulkAdd(firebaseFarmers);

        // console.log(`✅ Synced ${firebaseFarmers.length} farmers from Firebase`);
        return firebaseFarmers.length;
    } catch (error) {
        console.error('❌ Failed to sync farmers from Firebase:', error);
        throw error;
    }
}

/**
 * Get farmers count
 */
export async function getFarmersCount(): Promise<number> {
    return await db.farmers.count();
}

/**
 * Get farmers by region (for analytics)
 */
export async function getFarmersByRegion(): Promise<Record<string, number>> {
    const farmers = await db.farmers.toArray();
    const regionCounts: Record<string, number> = {};

    farmers.forEach(farmer => {
        if (farmer.region) {
            regionCounts[farmer.region] = (regionCounts[farmer.region] || 0) + 1;
        }
    });

    return regionCounts;
}

/**
 * Get farmers by gender (for analytics)
 */
export async function getFarmersByGender(): Promise<Record<string, number>> {
    const farmers = await db.farmers.toArray();
    const genderCounts: Record<string, number> = {};

    farmers.forEach(farmer => {
        if (farmer.gender) {
            genderCounts[farmer.gender] = (genderCounts[farmer.gender] || 0) + 1;
        }
    });

    return genderCounts;
}

/**
 * PURGE all farmers (Admin only)
 * Deletes all farmer data from local database.
 * CAUTION: This action is destructive and irreversible.
 */
export async function deleteAllFarmers(): Promise<void> {
    // 1. Clear local database
    await db.farmers.clear();

    // 2. Clear sync queue of any pending farmer actions
    await db.syncQueue.where('entityType').equals('farmer').delete();

    // 3. Queue a purge operation for Firebase
    await syncService.addToQueue('farmer', 'purge', 'ALL', null);

    // console.log('⚠️ All farmer data purged locally and queued for remote purge.');
}
