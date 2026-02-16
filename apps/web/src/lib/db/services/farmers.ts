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
        community?: string;
        status?: 'Active' | 'Inactive';
        minFarmSize?: number;
        maxFarmSize?: number; // Optional range support
        search?: string;
    }
): Promise<{ data: Farmer[], total: number }> {
    let collection: any = db.farmers.toCollection();

    // 1. Index Selection
    if (filters.region && filters.region !== 'all') {
        if (filters.district && filters.society) {
            collection = db.farmers.where('[region+district+society]').equals([filters.region, filters.district, filters.society]);
        } else if (filters.district) {
            collection = db.farmers.where('[region+district]').equals([filters.region, filters.district]);
        } else if (filters.status) {
            collection = db.farmers.where('[region+status]').equals([filters.region, filters.status]);
        } else {
            collection = db.farmers.where('region').equals(filters.region);
        }
    } else if (filters.status) {
        // If no region but status is present, use status index if available, or just filter
        // We don't have a simple [status] index in version 2, but 'status' is indexed in version 1
        collection = db.farmers.where('status').equals(filters.status);
    }

    // 2. In-Memory Filtering for remaining fields
    collection = collection.filter((f: Farmer) => {
        let match = true;

        if (filters.region && filters.region !== 'all' && f.region !== filters.region) match = false;
        if (filters.district && f.district !== filters.district) match = false;
        if (filters.society && f.society !== filters.society) match = false;
        if (filters.community && f.community !== filters.community) match = false;
        if (filters.status && f.status !== filters.status) match = false;

        // Farm Size Filter
        if (filters.minFarmSize !== undefined && (f.farmSize ?? 0) < filters.minFarmSize) match = false;
        if (filters.maxFarmSize !== undefined && (f.farmSize ?? 0) > filters.maxFarmSize) match = false;

        if (!match) return false;

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
 * Get unique regions for filter dropdown
 */
export async function getUniqueRegions(): Promise<string[]> {
    const regions = await db.farmers.orderBy('region').uniqueKeys() as string[];
    // Filter out empty strings but keep N/A if it exists, and ensure N/A is last
    const validRegions = regions.filter(r => r && r.trim().length > 0);

    return validRegions.sort((a, b) => {
        if (a === 'N/A') return 1;
        if (b === 'N/A') return -1;
        return a.localeCompare(b);
    });
}

/**
 * Get unique districts for filter dropdown (optionally filtered by region)
 */
export async function getUniqueDistricts(region?: string): Promise<string[]> {
    if (region && region !== 'all') {
        const farmers = await db.farmers.where('region').equals(region).toArray();
        const districts = new Set(farmers.map(f => f.district).filter(d => d && d.trim().length > 0));
        return Array.from(districts) as string[];
    }
    const districts = await db.farmers.orderBy('district').uniqueKeys() as string[];
    return districts.filter(d => d && d.trim().length > 0);
}

/**
 * Get unique societies
 */
export async function getUniqueSocieties(district?: string): Promise<string[]> {
    if (district) {
        const farmers = await db.farmers.filter(f => f.district === district).toArray();
        const societies = new Set(farmers.map(f => f.society).filter(s => s && s.trim().length > 0));
        return Array.from(societies) as string[];
    }
    const societies = await db.farmers.orderBy('society').uniqueKeys() as string[];
    return societies.filter(s => s && s.trim().length > 0);
}

/**
 * Get unique communities
 */
export async function getUniqueCommunities(society?: string): Promise<string[]> {
    if (society) {
        const farmers = await db.farmers.filter(f => f.society === society).toArray();
        const communities = new Set(farmers.map(f => f.community).filter(c => c && c.trim().length > 0));
        return Array.from(communities) as string[];
    }
    const farmers = await db.farmers.toArray();
    const communities = new Set(farmers.map(f => f.community).filter(c => c && c.trim().length > 0));
    return Array.from(communities).sort() as string[];
}

/**
 * Get Sync Stats
 */
export async function getSyncStats(): Promise<{ totalSynced: number, pending: number, total: number }> {
    const total = await db.farmers.count();
    const pending = await db.syncQueue.where('entityType').equals('farmer').count();
    // synced is approximated as total - pending
    return {
        total,
        pending,
        totalSynced: Math.max(0, total - pending)
    };
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
