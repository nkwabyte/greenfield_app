import { supabase } from '@/lib/supabase/client';
import type { FarmerGroup } from '@/lib/types';

/**
 * Get all farmer groups from Supabase.
 * Optionally filter by lastSyncTime for incremental updates.
 */
export async function getSupabaseFarmerGroups(lastSyncTime?: number): Promise<FarmerGroup[]> {
    try {
        let query = supabase.from('farmer_groups').select('*');

        if (lastSyncTime) {
            const isoDate = new Date(lastSyncTime).toISOString();
            query = query.gte('updated_at', isoDate);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(mapFarmerGroupRow);
    } catch (error) {
        console.error('Error fetching farmer groups from Supabase:', error);
        throw error;
    }
}

/**
 * Add a new farmer group
 */
export async function addSupabaseFarmerGroup(groupId: string, groupData: Partial<FarmerGroup>): Promise<void> {
    try {
        const { name, description, region, district, cocoaDistrict, society, leaderId, seasonYear } = groupData as any;
        const { error } = await supabase.from('farmer_groups').insert({
            id: groupId,
            name,
            description,
            region,
            district,
            cocoa_district: cocoaDistrict || null,
            society,
            leader_id: leaderId,
            season_year: seasonYear,
            created_at: groupData.createdAt || new Date().toISOString(),
            updated_at: groupData.updatedAt || new Date().toISOString(),
        });
        if (error) throw error;
    } catch (error) {
        console.error('Error adding farmer group to Supabase:', error);
        throw error;
    }
}

/**
 * Update a farmer group
 */
export async function updateSupabaseFarmerGroup(groupId: string, updates: Partial<FarmerGroup>): Promise<void> {
    try {
        const mappedUpdates: any = {};
        if (updates.name !== undefined) mappedUpdates.name = updates.name;
        if (updates.description !== undefined) mappedUpdates.description = updates.description;
        if (updates.region !== undefined) mappedUpdates.region = updates.region;
        if (updates.district !== undefined) mappedUpdates.district = updates.district;
        if (updates.society !== undefined) mappedUpdates.society = updates.society;
        if (updates.leaderId !== undefined) mappedUpdates.leader_id = updates.leaderId;
        if (updates.seasonYear !== undefined) mappedUpdates.season_year = updates.seasonYear;
        if (updates.updatedAt !== undefined) mappedUpdates.updated_at = updates.updatedAt;
        if (updates.cocoaDistrict !== undefined) mappedUpdates.cocoa_district = updates.cocoaDistrict;
        if (updates.isArchived !== undefined) mappedUpdates.isArchived = updates.isArchived;

        const { error } = await supabase.from('farmer_groups').upsert({
            id: groupId,
            ...mappedUpdates,
        }, { onConflict: 'id' });
        if (error) throw error;
    } catch (error) {
        console.error(`Error updating farmer group ${groupId} in Supabase:`, error);
        throw error;
    }
}

/**
 * Delete a farmer group (soft delete)
 */
export async function deleteSupabaseFarmerGroup(groupId: string): Promise<void> {
    try {
        const { error } = await supabase.from('farmer_groups').update({
            deleted: true,
        }).eq('id', groupId);
        if (error) throw error;
    } catch (error) {
        console.error(`Error deleting farmer group ${groupId} in Supabase:`, error);
        throw error;
    }
}

/**
 * Sync offline batch farmer group updates to Supabase
 */
export async function syncFarmerGroupsBatch(operations: { id: string, type: 'create' | 'update' | 'delete', data?: any }[]): Promise<void> {
    try {
        for (const op of operations) {
            if (op.type === 'delete') {
                await supabase.from('farmer_groups').update({ deleted: true }).eq('id', op.id);
            } else if (op.type === 'create' && op.data) {
                const { seasonYear, leaderId, farmerIds, cocoaDistrict, ...rest } = op.data;
                await supabase.from('farmer_groups').insert({
                    id: op.id,
                    ...rest,
                    season_year: seasonYear,
                    leader_id: leaderId,
                    cocoa_district: cocoaDistrict || null,
                });
            } else if (op.type === 'update' && op.data) {
                const mappedData: any = { ...op.data };
                if (mappedData.seasonYear !== undefined) {
                    mappedData.season_year = mappedData.seasonYear;
                    delete mappedData.seasonYear;
                }
                if (mappedData.leaderId !== undefined) {
                    mappedData.leader_id = mappedData.leaderId;
                    delete mappedData.leaderId;
                }
                if (mappedData.cocoaDistrict !== undefined) {
                    mappedData.cocoa_district = mappedData.cocoaDistrict;
                    delete mappedData.cocoaDistrict;
                }
                delete mappedData.farmerIds; // Not tracked as an array in DB
                await supabase.from('farmer_groups').update(mappedData).eq('id', op.id);
            }
        }
    } catch (error) {
        console.error('Error in batch sync of farmer groups:', error);
        throw error;
    }
}

/** Maps a Postgres snake_case row to a camelCase FarmerGroup object */
function mapFarmerGroupRow(row: any): FarmerGroup {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        region: row.region || '',
        district: row.district || '',
        cocoaDistrict: row.cocoa_district || undefined,
        society: row.society || row.community || '',
        leaderId: row.leader_id,
        seasonYear: row.season_year,
        farmerIds: row.farmer_ids || [],
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
        deleted: row.deleted,
        isArchived: row.isArchived || false,
    };
}
