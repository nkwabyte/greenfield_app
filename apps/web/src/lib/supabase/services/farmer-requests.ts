import { supabase } from '@/lib/supabase/client';
import type { FarmerRequest } from '@/lib/types';

/**
 * Get farmer requests from Supabase.
 * Optionally filter by lastSyncTime for incremental updates.
 */
export async function getSupabaseFarmerRequests(lastSyncTime?: number): Promise<FarmerRequest[]> {
    try {
        let query = supabase.from('farmer_requests').select('*');

        if (lastSyncTime) {
            const isoDate = new Date(lastSyncTime).toISOString();
            query = query.gte('updated_at', isoDate);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(mapFarmerRequestRow);
    } catch (error) {
        console.error('Error fetching farmer requests from Supabase:', error);
        throw error;
    }
}

export async function addSupabaseFarmerRequest(requestId: string, requestData: Partial<FarmerRequest>): Promise<void> {
    try {
        const { farmerId, groupId, seasonYear, grandTotal, requestDate, ...rest } = requestData as any;
        const { error } = await supabase.from('farmer_requests').insert({
            id: requestId,
            farmer_id: farmerId,
            group_id: groupId || null,
            season_year: seasonYear,
            items: rest.items || [],
            grand_total: grandTotal || 0,
            status: rest.status || 'Pending',
            request_date: requestDate ? new Date(requestDate).toISOString() : new Date().toISOString(),
            created_at: rest.createdAt || new Date().toISOString(),
            updated_at: rest.updatedAt || new Date().toISOString(),
        });
        if (error) throw error;
    } catch (error) {
        console.error('Error adding farmer request to Supabase:', error);
        throw error;
    }
}

export async function updateSupabaseFarmerRequest(requestId: string, updates: Partial<FarmerRequest>): Promise<void> {
    try {
        const mappedUpdates: any = {};
        if (updates.status !== undefined) mappedUpdates.status = updates.status;
        if ((updates as any).farmerId !== undefined) mappedUpdates.farmer_id = (updates as any).farmerId;
        if ((updates as any).groupId !== undefined) mappedUpdates.group_id = (updates as any).groupId;
        if ((updates as any).seasonYear !== undefined) mappedUpdates.season_year = (updates as any).seasonYear;
        if (updates.items !== undefined) mappedUpdates.items = updates.items;
        if ((updates as any).grandTotal !== undefined) mappedUpdates.grand_total = (updates as any).grandTotal;
        if ((updates as any).requestDate !== undefined) mappedUpdates.request_date = (updates as any).requestDate;
        if (updates.updatedAt !== undefined) mappedUpdates.updated_at = updates.updatedAt;

        const { error } = await supabase.from('farmer_requests').upsert({
            id: requestId,
            ...mappedUpdates,
        }, { onConflict: 'id' });
        if (error) throw error;
    } catch (error) {
        console.error(`Error updating farmer request ${requestId} in Supabase:`, error);
        throw error;
    }
}

export async function deleteSupabaseFarmerRequest(requestId: string): Promise<void> {
    try {
        const { error } = await supabase.from('farmer_requests').update({
            deleted: true,
        }).eq('id', requestId);
        if (error) throw error;
    } catch (error) {
        console.error(`Error deleting farmer request ${requestId} in Supabase:`, error);
        throw error;
    }
}

export async function syncFarmerRequestsBatch(operations: { id: string, type: 'create' | 'update' | 'delete', data?: any }[]): Promise<void> {
    try {
        for (const op of operations) {
            if (op.type === 'delete') {
                await supabase.from('farmer_requests').update({ deleted: true }).eq('id', op.id);
            } else if (op.type === 'create' && op.data) {
                const { farmerId, groupId, seasonYear, grandTotal, requestDate, ...rest } = op.data;
                await supabase.from('farmer_requests').insert({
                    id: op.id,
                    farmer_id: farmerId,
                    group_id: groupId || null,
                    season_year: seasonYear,
                    items: rest.items || [],
                    grand_total: grandTotal || 0,
                    status: rest.status || 'Pending',
                    request_date: requestDate ? new Date(requestDate).toISOString() : new Date().toISOString(),
                });
            } else if (op.type === 'update' && op.data) {
                const mappedData: any = { ...op.data };
                if (mappedData.farmerId !== undefined) { mappedData.farmer_id = mappedData.farmerId; delete mappedData.farmerId; }
                if (mappedData.groupId !== undefined) { mappedData.group_id = mappedData.groupId; delete mappedData.groupId; }
                if (mappedData.seasonYear !== undefined) { mappedData.season_year = mappedData.seasonYear; delete mappedData.seasonYear; }
                if (mappedData.grandTotal !== undefined) { mappedData.grand_total = mappedData.grandTotal; delete mappedData.grandTotal; }
                if (mappedData.requestDate !== undefined) { mappedData.request_date = mappedData.requestDate; delete mappedData.requestDate; }
                await supabase.from('farmer_requests').update(mappedData).eq('id', op.id);
            }
        }
    } catch (error) {
        console.error('Error in batch sync of farmer requests:', error);
        throw error;
    }
}

/** Maps a Postgres snake_case row to a camelCase FarmerRequest object */
function mapFarmerRequestRow(row: any): FarmerRequest {
    return {
        id: row.id,
        farmerId: row.farmer_id,
        groupId: row.group_id,
        seasonYear: row.season_year,
        items: row.items || [],
        grandTotal: row.grand_total,
        status: row.status,
        requestDate: row.request_date ? new Date(row.request_date).toISOString() : '',
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
    };
}
