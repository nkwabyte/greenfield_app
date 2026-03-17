/**
 * Offline-First CRUD Service for Farmers
 * Implements Dexie-first approach with automatic sync to Supabase
 */

import { db } from '../schema';
import { syncService } from '../sync';
import type { Farmer } from '@/lib/types';
import type { FarmerFormValues } from '@/components/farmers/add-edit-farmer-dialog';
import { getSupabaseFarmers, getSupabaseFarmersPaginated } from '@/lib/supabase/services/farmers';
import { normalizeRegion } from '@/lib/utils/region-normalizer';

/**
 * Get all farmers from local database
 */
export async function getAllFarmers(): Promise<Farmer[]> {
    return await db.farmers.filter(f => !f.isArchived).toArray();
}

/**
 * Get a single farmer by ID from local database
 */
export async function getFarmer(id: string): Promise<Farmer | undefined> {
    return await db.farmers.get(id);
}

/**
 * Get simple farmer options for dropdowns (Memory Optimized)
 */
export async function getFarmerOptions(): Promise<Pick<Farmer, 'id' | 'name' | 'contact' | 'society'>[]> {
    return await db.farmers
        .filter(f => !f.deleted && !f.isArchived)
        .toArray(farmers => farmers.map(f => ({
            id: f.id,
            name: f.name,
            contact: f.contact,
            society: f.society
        })));
}

/**
 * Get farmers with pagination
 */
export async function getPaginatedFarmers(page: number, pageSize: number): Promise<{ data: Farmer[], total: number }> {
    const collection = db.farmers.filter(f => !f.isArchived);
    const total = await collection.count();
    const data = await collection
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

    return await collection.filter(f => !f.isArchived).toArray();
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
        minFarmSize?: number;
        maxFarmSize?: number; // Optional range support
        gender?: string;
        minAge?: number;
        maxAge?: number;
        startDate?: Date;
        endDate?: Date;
        search?: string;
        allowedDistricts?: string[]; // Field Agent district restriction
    }
): Promise<{ data: Farmer[], total: number }> {
    let collection: any = db.farmers.toCollection();

    // 1. Index Selection (Prioritize highly restrictive search)
    // NOTE: region values stored in DB are raw/non-normalized, so we cannot use compound
    // indexes that include region — they would do an exact-match against the raw stored value
    // which won't match the normalized filter value. Instead we use single-field indexes and
    // rely on in-memory filtering for region normalization.
    if (filters.search) {
        collection = db.farmers.where('name').startsWithIgnoreCase(filters.search);
    } else if (filters.society && filters.society !== 'all') {
        collection = db.farmers.where('society').equals(filters.society);
    } else if (filters.district && filters.district !== 'all') {
        collection = db.farmers.where('district').equals(filters.district);
    } else if (filters.status) {
        collection = db.farmers.where('status').equals(filters.status);
    }

    // 2. In-Memory Filtering for remaining fields
    collection = collection.filter((f: Farmer) => {
        if (f.deleted || f.isArchived) return false;

        let match = true;

        // Field Agent district restriction: farmer must be in one of the allowed districts
        if (filters.allowedDistricts && filters.allowedDistricts.length > 0) {
            if (!f.district || !filters.allowedDistricts.includes(f.district)) return false;
        }

        if (filters.region && filters.region !== 'all') {
            const normFilter = normalizeRegion(filters.region);
            if (f.region && normalizeRegion(f.region) !== normFilter) match = false;
        }
        if (filters.district && f.district !== filters.district) match = false;
        if (filters.society && f.society !== filters.society) match = false;
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

        // If search is active, the Dexie index `startsWithIgnoreCase` already filtered the collection by name.
        // We do not need to do further string matching here, just return true since the name matched.
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
    const farmers = await db.farmers.filter(f => !f.isArchived).toArray();

    // Normalize regions when building the set
    const regionsSet = new Set<string>();
    farmers.forEach(f => {
        if (f.region && f.region.trim().length > 0) {
            const norm = normalizeRegion(f.region);
            if (norm !== 'N/A') {
                regionsSet.add(norm);
            }
        }
    });

    const validRegions = Array.from(regionsSet);

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
        const normFilter = normalizeRegion(region);
        const farmers = await db.farmers.filter(f => !f.isArchived && !!f.region && normalizeRegion(f.region) === normFilter).toArray();
        const districts = new Set(farmers.map(f => f.district).filter(d => d && d.trim().length > 0));
        return Array.from(districts) as string[];
    }
    const farmers = await db.farmers.filter(f => !f.isArchived).toArray();
    const districts = Array.from(new Set(farmers.map(f => f.district).filter(Boolean))) as string[];
    return districts.filter(d => d && d.trim().length > 0);
}

/**
 * Get unique societies (Memory-Optimized)
 */
export async function getUniqueSocieties(district?: string): Promise<string[]> {
    if (district) {
        const societies = new Set<string>();
        await db.farmers.where('district').equals(district).filter(f => !f.isArchived).each(f => {
            if (f.society && f.society.trim().length > 0) {
                societies.add(f.society);
            }
        });
        return Array.from(societies).sort();
    }
    const societies = await db.farmers.orderBy('society').uniqueKeys() as string[];
    return societies.filter(s => s && s.trim().length > 0).sort();
}

/**
 * Get unique communities — now an alias for getUniqueSocieties since they are merged.
 */
export async function getUniqueCommunities(society?: string): Promise<string[]> {
    return getUniqueSocieties(society);
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
    farmerData: Partial<FarmerFormValues> & { isArchived?: boolean }
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
 * Archive or Restore a farmer
 */
export async function archiveFarmer(id: string, isArchived: boolean = true): Promise<void> {
    await updateFarmer(id, { isArchived });
}

/**
 * Get all archived farmers
 */
export async function getArchivedFarmers(): Promise<Farmer[]> {
    return await db.farmers.filter(f => !!f.isArchived).toArray();
}

/**
 * Delete a farmer (offline-first)
 */
export async function deleteFarmer(id: string): Promise<void> {
    // Capture name before deletion
    const existing = await db.farmers.get(id);

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
 * Sync farmers from Supabase to local database
 * This is used for initial load or manual refresh
 */
export async function syncFarmersFromSupabase(): Promise<number> {
    try {
        const lastSync = localStorage.getItem('lastSync_farmers');
        const lastSyncTime = lastSync ? parseInt(lastSync) : undefined;

        // ✅ Capture the exact time BEFORE the query to avoid race conditions:
        // If another device updates a record during our fetch, its updatedAt will
        // be >= syncStartTime, so we'll catch it on the next sync.
        const syncStartTime = Date.now();

        let hasMore = true;
        let offset = 0;
        const chunkSize = 1000;
        let totalSynced = 0;

        while (hasMore) {
            const result = await getSupabaseFarmersPaginated(lastSyncTime, offset, chunkSize);
            const supabaseFarmers = result.farmers;
            hasMore = result.hasMore;

            if (supabaseFarmers.length > 0) {
                const farmersToPut: Farmer[] = [];
                const idsToDelete: string[] = [];

                for (const farmer of supabaseFarmers as (Farmer & { deleted?: boolean })[]) {
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

                totalSynced += supabaseFarmers.length;

                // Yield to main thread to prevent UI freezing
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            offset += chunkSize;
        }

        // ✅ Save the start time (not completion time) to localStorage
        localStorage.setItem('lastSync_farmers', syncStartTime.toString());

        return totalSynced;
    } catch (error) {
        console.error('❌ Failed to sync farmers from Supabase:', error);
        throw error;
    }
}

/**
 * Get farmers count
 */
export async function getFarmersCount(): Promise<number> {
    return await db.farmers.filter(f => !f.isArchived).count();
}

/**
 * Helper to update the aggregation cache
 * Should be called whenever a farmer is added, updated, or deleted natively 
 */
export async function updateFarmersCache(): Promise<void> {
    const farmers = await db.farmers.toArray();

    const byRegion: Record<string, number> = {};
    const byGender: Record<string, number> = {};
    const byFarmSize: Record<string, number> = {
        'Small (< 2 acres)': 0,
        'Medium (2-5 acres)': 0,
        'Large (5-10 acres)': 0,
        'Estates (> 10 acres)': 0,
    };
    const byAge: Record<string, number> = {
        '18-25': 0, '26-35': 0, '36-45': 0, '46-60': 0, '60+': 0
    };
    const byRegionAndGender: Record<string, Record<string, number>> = {};

    farmers.forEach(farmer => {
        if (!farmer.deleted && !farmer.isArchived) {
            // Only aggregate if region is known
            if (farmer.region && farmer.region !== 'Unknown' && farmer.region.trim() !== '') {
                const normRegion = normalizeRegion(farmer.region);
                if (normRegion !== 'N/A') {
                    byRegion[normRegion] = (byRegion[normRegion] || 0) + 1;

                    if (farmer.gender) {
                        const g = farmer.gender;
                        if (!byRegionAndGender[normRegion]) byRegionAndGender[normRegion] = {};
                        byRegionAndGender[normRegion][g] = (byRegionAndGender[normRegion][g] || 0) + 1;
                    }
                }
            }

            if (farmer.gender) {
                byGender[farmer.gender] = (byGender[farmer.gender] || 0) + 1;
            }

            const size = farmer.farmSize || 0;
            if (size < 2) byFarmSize['Small (< 2 acres)']++;
            else if (size < 5) byFarmSize['Medium (2-5 acres)']++;
            else if (size < 10) byFarmSize['Large (5-10 acres)']++;
            else byFarmSize['Estates (> 10 acres)']++;

            const age = farmer.age;
            if (typeof age === 'number') {
                if (age >= 18 && age <= 25) byAge['18-25']++;
                else if (age >= 26 && age <= 35) byAge['26-35']++;
                else if (age >= 36 && age <= 45) byAge['36-45']++;
                else if (age >= 46 && age <= 60) byAge['46-60']++;
                else if (age > 60) byAge['60+']++;
            }
        }
    });

    await db.statistics.put({
        id: 'farmer_counts',
        byRegion,
        byGender,
        byFarmSize,
        byAge,
        byRegionAndGender
    });
}

/**
 * Get farmers by region (for analytics) using Aggregation Cache
 */
export async function getFarmersByRegion(): Promise<Record<string, number>> {
    const stats = await db.statistics.get('farmer_counts');
    return stats?.byRegion ?? {};
}

/**
 * Get farmers by gender (for analytics) using Aggregation Cache
 */
export async function getFarmersByGender(): Promise<Record<string, number>> {
    const stats = await db.statistics.get('farmer_counts');
    return stats?.byGender ?? {};
}

/**
 * Get farmers by farm size (for analytics) using Aggregation Cache
 */
export async function getFarmersByFarmSize(): Promise<Record<string, number>> {
    const stats = await db.statistics.get('farmer_counts');
    return stats?.byFarmSize ?? {};
}

/**
 * Get farmers by age (for analytics) using Aggregation Cache
 */
export async function getFarmersByAge(): Promise<Record<string, number>> {
    const stats = await db.statistics.get('farmer_counts');
    return stats?.byAge ?? {};
}

/**
 * Get farmers by region and gender (for analytics) using Aggregation Cache
 */
export async function getFarmersByRegionAndGender(): Promise<Record<string, Record<string, number>>> {
    const stats = await db.statistics.get('farmer_counts');
    return stats?.byRegionAndGender ?? {};
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

    // 3. Queue a purge operation for Supabase
    await syncService.addToQueue('farmer', 'purge', 'ALL', null);

    // console.log('⚠️ All farmer data purged locally and queued for remote purge.');
}
