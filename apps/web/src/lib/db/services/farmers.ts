/**
 * Offline-First CRUD Service for Farmers
 * Implements Dexie-first approach with automatic sync to Firebase
 */

import { db } from '../schema';
import { syncService } from '../sync';
import type { Farmer } from '@/lib/types';
import type { FarmerFormValues } from '@/components/farmers/add-edit-farmer-dialog';
import { getFirebaseFarmers, getFirebaseFarmersPaginated } from '@/lib/firebase/services/farmers';

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
        gender?: string;
        minAge?: number;
        maxAge?: number;
        startDate?: Date;
        endDate?: Date;
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

        // Gender Filter
        if (filters.gender && filters.gender !== 'all' && f.gender !== filters.gender) match = false;

        // Age Range Filter
        if (filters.minAge !== undefined && (f.age ?? 0) < filters.minAge) match = false;
        if (filters.maxAge !== undefined && (f.age ?? 0) > filters.maxAge) match = false;

        // Farm Size Filter
        if (filters.minFarmSize !== undefined && (f.farmSize ?? 0) < filters.minFarmSize) match = false;
        if (filters.maxFarmSize !== undefined && (f.farmSize ?? 0) > filters.maxFarmSize) match = false;

        // Date Range Filter (using joinDate or createdAt)
        if (filters.startDate && filters.endDate) {
            const dateToCheck = f.joinDate ? new Date(f.joinDate) : new Date(f.createdAt);
            if (dateToCheck < filters.startDate || dateToCheck > filters.endDate) match = false;
        }

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

    // 3. Update cache
    await updateFarmersCache();
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

    // 3. Update cache
    await updateFarmersCache();
}

/**
 * Delete a farmer (offline-first)
 */
export async function deleteFarmer(id: string): Promise<void> {
    // 1. Delete from local database
    await db.farmers.delete(id);

    // 2. Add to sync queue
    await syncService.addToQueue('farmer', 'delete', id, null);

    // 3. Update cache
    await updateFarmersCache();
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

    // 3. Update cache
    await updateFarmersCache();
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

    for (const farmer of updatedFarmers) {
        await syncService.addToQueue('farmer', 'update', farmer.id, updates);
    }

    // 3. Update cache
    await updateFarmersCache();
}

/**
 * Sync farmers from Firebase to local database
 * This is used for initial load or manual refresh
 */
export async function syncFarmersFromFirebase(): Promise<number> {
    try {
        const lastSync = localStorage.getItem('lastSync_farmers');
        const lastSyncTime = lastSync ? parseInt(lastSync) : undefined;

        // ✅ Capture the exact time BEFORE the query to avoid race conditions:
        // If another device updates a record during our fetch, its updatedAt will
        // be >= syncStartTime, so we'll catch it on the next sync.
        const syncStartTime = Date.now();

        const firebaseFarmers = await getFirebaseFarmers(lastSyncTime);

        if (firebaseFarmers.length === 0) {
            localStorage.setItem('lastSync_farmers', syncStartTime.toString());
            return 0;
        }

        const farmersToPut: Farmer[] = [];
        const idsToDelete: string[] = [];

        for (const farmer of firebaseFarmers as (Farmer & { deleted?: boolean })[]) {
            if (farmer.deleted) {
                idsToDelete.push(farmer.id);
            } else {
                delete farmer.deleted;
                farmersToPut.push(farmer);
            }
        }

        if (farmersToPut.length > 0) {
            await db.farmers.bulkPut(farmersToPut);
        }

        if (idsToDelete.length > 0) {
            await db.farmers.bulkDelete(idsToDelete);
        }

        // ✅ Save the start time (not completion time) to localStorage
        localStorage.setItem('lastSync_farmers', syncStartTime.toString());

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
 * Helper to update the aggregation cache
 * Should be called whenever a farmer is added, updated, or deleted natively 
 */
export async function updateFarmersCache(): Promise<void> {
    const farmers = await db.farmers.toArray();

    const byRegion: Record<string, number> = {};
    const byGender: Record<string, number> = {};

    farmers.forEach(farmer => {
        if (farmer.region) {
            byRegion[farmer.region] = (byRegion[farmer.region] || 0) + 1;
        }
        if (farmer.gender) {
            byGender[farmer.gender] = (byGender[farmer.gender] || 0) + 1;
        }
    });

    await db.statistics.put({
        id: 'farmer_counts',
        byRegion,
        byGender
    });
}

/**
 * Get farmers by region (for analytics) using Aggregation Cache
 */
export async function getFarmersByRegion(): Promise<Record<string, number>> {
    const stats = await db.statistics.get('farmer_counts');
    if (stats && stats.byRegion) {
        return stats.byRegion;
    }

    // Fallback if cache isn't built yet
    await updateFarmersCache();
    const newStats = await db.statistics.get('farmer_counts');
    return newStats?.byRegion || {};
}

/**
 * Get farmers by gender (for analytics) using Aggregation Cache
 */
export async function getFarmersByGender(): Promise<Record<string, number>> {
    const stats = await db.statistics.get('farmer_counts');
    if (stats && stats.byGender) {
        return stats.byGender;
    }

    // Fallback if cache isn't built yet
    await updateFarmersCache();
    const newStats = await db.statistics.get('farmer_counts');
    return newStats?.byGender || {};
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
