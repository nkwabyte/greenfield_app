import { db } from '../schema';
import { syncService } from '../sync';
import type { FarmerGroup } from '@/lib/types';
import { getFirebaseFarmerGroups } from '@/lib/firebase/services/farmer-groups';

export async function getAllFarmerGroups(): Promise<FarmerGroup[]> {
    return await db.farmerGroups.toArray();
}

export async function getFarmerGroup(id: string): Promise<FarmerGroup | undefined> {
    return await db.farmerGroups.get(id);
}

export async function getFarmerGroupsByYear(seasonYear: string): Promise<FarmerGroup[]> {
    return await db.farmerGroups.where('seasonYear').equals(seasonYear).toArray();
}

export async function addFarmerGroup(
    groupData: Omit<FarmerGroup, 'id' | 'createdAt' | 'updatedAt'>,
    id: string
): Promise<void> {
    const now = new Date().toISOString();

    const group: FarmerGroup = {
        ...groupData,
        id,
        createdAt: now,
        updatedAt: now,
    };

    await db.farmerGroups.add(group);
    await syncService.addToQueue('farmerGroup', 'create', id, group);
}

export async function updateFarmerGroup(
    id: string,
    updates: Partial<Omit<FarmerGroup, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    const now = new Date().toISOString();
    const existingGroup = await db.farmerGroups.get(id);

    if (!existingGroup) {
        throw new Error(`Farmer group with ID ${id} not found`);
    }

    const updatedGroup: FarmerGroup = {
        ...existingGroup,
        ...updates,
        updatedAt: now,
    };

    await db.farmerGroups.put(updatedGroup);
    await syncService.addToQueue('farmerGroup', 'update', id, updates);
}

export async function deleteFarmerGroup(id: string): Promise<void> {
    await db.farmerGroups.delete(id);
    await syncService.addToQueue('farmerGroup', 'delete', id, null);
}

export async function syncFarmerGroupsFromFirebase(): Promise<number> {
    try {
        const lastSync = localStorage.getItem('lastSync_farmerGroups');
        const lastSyncTime = lastSync ? parseInt(lastSync) : undefined;

        const firebaseGroups = await getFirebaseFarmerGroups(lastSyncTime);

        if (firebaseGroups.length === 0) {
            return 0;
        }

        const groupsToPut = [];
        const idsToDelete = [];

        for (const group of firebaseGroups as any[]) {
            if (group.deleted) {
                idsToDelete.push(group.id);
            } else {
                delete group.deleted;
                groupsToPut.push(group as FarmerGroup);
            }
        }

        if (groupsToPut.length > 0) {
            await db.farmerGroups.bulkPut(groupsToPut);
        }

        if (idsToDelete.length > 0) {
            await db.farmerGroups.bulkDelete(idsToDelete);
        }

        localStorage.setItem('lastSync_farmerGroups', Date.now().toString());

        return firebaseGroups.length;
    } catch (error) {
        console.error('❌ Failed to sync farmer groups from Firebase:', error);
        throw error;
    }
}
