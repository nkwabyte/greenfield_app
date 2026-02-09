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
    let collection = db.farmers.toCollection();

    // specific exact match filters
    if (filters.region && filters.region !== 'all') {
        collection = db.farmers.where('region').equals(filters.region);
    }

    // Applying other filters using 'and' (Dexie optimization needed for large datasets, but this is okay for <10k)
    // For much larger datasets, we'd need compound indices.
    collection = collection.filter(f => {
        if (filters.district && f.district !== filters.district) return false;
        if (filters.society && f.society !== filters.society) return false;
        if (filters.status && f.status !== filters.status) return false;
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            return f.name.toLowerCase().includes(searchLower) ||
                f.contact?.includes(searchLower) ||
                f.community?.toLowerCase().includes(searchLower);
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

    console.log(`✅ Farmer added locally: ${farmer.name}`);
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

    console.log(`✅ Farmer updated locally: ${updatedFarmer.name}`);
}

/**
 * Delete a farmer (offline-first)
 */
export async function deleteFarmer(id: string): Promise<void> {
    // 1. Delete from local database
    await db.farmers.delete(id);

    // 2. Add to sync queue
    await syncService.addToQueue('farmer', 'delete', id, null);

    console.log(`✅ Farmer deleted locally: ${id}`);
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

    console.log(`✅ ${farmers.length} farmers added locally (batch)`);
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

        console.log(`✅ Synced ${firebaseFarmers.length} farmers from Firebase`);
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
