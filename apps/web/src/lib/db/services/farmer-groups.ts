import { db } from '../schema';
import { syncService } from '../sync';
import type { FarmerGroup } from '@/lib/types';
import { getSupabaseFarmerGroups } from '@/lib/supabase/services/farmer-groups';

export async function getAllFarmerGroups(): Promise<FarmerGroup[]> {
    return await db.farmerGroups.filter(g => !g.isArchived).toArray();
}

export async function getFarmerGroup(id: string): Promise<FarmerGroup | undefined> {
    return await db.farmerGroups.get(id);
}

export async function getFarmerGroupOptions(): Promise<Pick<FarmerGroup, 'id' | 'name' | 'region' | 'district' | 'seasonYear'>[]> {
    return await db.farmerGroups
        .filter(g => !g.deleted && !g.isArchived)
        .toArray(groups => groups.map(g => ({
            id: g.id,
            name: g.name,
            region: g.region,
            district: g.district,
            seasonYear: g.seasonYear
        })));
}

export async function getFarmerGroupsByYear(seasonYear: string): Promise<FarmerGroup[]> {
    return await db.farmerGroups.where('seasonYear').equals(seasonYear).filter(g => !g.isArchived).toArray();
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

    await syncService.writeAndEnqueue(
        db.farmerGroups,
        () => db.farmerGroups.add(group),
        'farmerGroup', 'create', id, group
    );
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

    await syncService.writeAndEnqueue(
        db.farmerGroups,
        () => db.farmerGroups.put(updatedGroup),
        'farmerGroup', 'update', id, updates
    );
}

export async function deleteFarmerGroup(id: string): Promise<void> {
    const existing = await db.farmerGroups.get(id);
    await syncService.writeAndEnqueue(
        db.farmerGroups,
        () => db.farmerGroups.delete(id),
        'farmerGroup', 'delete', id, null
    );
}

export async function archiveFarmerGroup(id: string, isArchived: boolean = true): Promise<void> {
    await updateFarmerGroup(id, { isArchived });
}

export async function getArchivedFarmerGroups(): Promise<FarmerGroup[]> {
    return await db.farmerGroups.filter(g => !!g.isArchived).toArray();
}

export async function syncFarmerGroupsFromSupabase(): Promise<number> {
    try {
        const lastSync = localStorage.getItem('lastSync_farmerGroups');
        const lastSyncTime = lastSync ? parseInt(lastSync) : undefined;

        const supabaseGroups = await getSupabaseFarmerGroups(lastSyncTime);

        if (supabaseGroups.length === 0) {
            return 0;
        }

        const groupsToPut = [];
        const idsToDelete = [];

        for (const group of supabaseGroups as any[]) {
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

        return supabaseGroups.length;
    } catch (error) {
        console.error('❌ Failed to sync farmer groups from Supabase:', error);
        throw error;
    }
}
