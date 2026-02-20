import { db } from '../schema';
import { syncService } from '../sync';
import type { FarmerRequest } from '@/lib/types';
import { getSupabaseFarmerRequests } from '@/lib/supabase/services/farmer-requests';

export async function getAllFarmerRequests(): Promise<FarmerRequest[]> {
    return await db.farmerRequests.toArray();
}

export async function getFarmerRequest(id: string): Promise<FarmerRequest | undefined> {
    return await db.farmerRequests.get(id);
}

export async function getFarmerRequestsByFarmer(farmerId: string): Promise<FarmerRequest[]> {
    return await db.farmerRequests.where('farmerId').equals(farmerId).toArray();
}

export async function getFarmerRequestsByGroup(groupId: string): Promise<FarmerRequest[]> {
    return await db.farmerRequests.where('groupId').equals(groupId).toArray();
}

export async function addFarmerRequest(
    requestData: Omit<FarmerRequest, 'id' | 'createdAt' | 'updatedAt'>,
    id: string
): Promise<void> {
    const now = new Date().toISOString();

    const newRequest: FarmerRequest = {
        ...requestData,
        id,
        createdAt: now,
        updatedAt: now,
    };

    await db.farmerRequests.add(newRequest);
    await syncService.addToQueue('farmerRequest', 'create', id, newRequest);
}

export async function updateFarmerRequest(
    id: string,
    updates: Partial<Omit<FarmerRequest, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    const now = new Date().toISOString();
    const existingReq = await db.farmerRequests.get(id);

    if (!existingReq) {
        throw new Error(`Farmer request with ID ${id} not found`);
    }

    const updatedReq: FarmerRequest = {
        ...existingReq,
        ...updates,
        updatedAt: now,
    };

    await db.farmerRequests.put(updatedReq);
    await syncService.addToQueue('farmerRequest', 'update', id, updates);
}

export async function deleteFarmerRequest(id: string): Promise<void> {
    await db.farmerRequests.delete(id);
    await syncService.addToQueue('farmerRequest', 'delete', id, null);
}

export async function syncFarmerRequestsFromSupabase(): Promise<number> {
    try {
        const lastSync = localStorage.getItem('lastSync_farmerRequests');
        const lastSyncTime = lastSync ? parseInt(lastSync) : undefined;

        const supabaseReqs = await getSupabaseFarmerRequests(lastSyncTime);

        if (supabaseReqs.length === 0) {
            return 0;
        }

        const toPut = [];
        const idsToDelete = [];

        for (const req of supabaseReqs as any[]) {
            if (req.deleted) {
                idsToDelete.push(req.id);
            } else {
                delete req.deleted;
                toPut.push(req as FarmerRequest);
            }
        }

        if (toPut.length > 0) {
            await db.farmerRequests.bulkPut(toPut);
        }

        if (idsToDelete.length > 0) {
            await db.farmerRequests.bulkDelete(idsToDelete);
        }

        localStorage.setItem('lastSync_farmerRequests', Date.now().toString());

        return supabaseReqs.length;
    } catch (error) {
        console.error('❌ Failed to sync farmer requests from Supabase:', error);
        throw error;
    }
}
