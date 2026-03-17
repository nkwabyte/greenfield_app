'use client';
import { supabase } from '@/lib/supabase/client';
import type { Farmer } from '@/lib/types';
import type { FarmerFormValues } from '@/components/farmers/add-edit-farmer-dialog';

/**
 * Delta sync: fetches only farmers modified since lastSyncTime.
 * Includes soft-deleted records so the local DB can remove them.
 */
export async function getSupabaseFarmers(lastSyncTime?: number): Promise<Farmer[]> {
    let query = supabase.from('farmers').select('*').order('updated_at', { ascending: false });

    if (lastSyncTime) {
        const isoDate = new Date(lastSyncTime).toISOString();
        query = query.gt('updated_at', isoDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(mapFarmerRow);
}

/**
 * Paginated delta sync for farmers.
 */
export async function getSupabaseFarmersPaginated(
    lastSyncTime?: number,
    offset = 0,
    chunkSize = 500
): Promise<{ farmers: Farmer[]; hasMore: boolean }> {
    let query = supabase
        .from('farmers')
        .select('*')
        .order('updated_at', { ascending: false })
        .range(offset, offset + chunkSize - 1);

    if (lastSyncTime) {
        const isoDate = new Date(lastSyncTime).toISOString();
        query = query.gt('updated_at', isoDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const farmers = (data || []).map(mapFarmerRow);
    return {
        farmers,
        hasMore: farmers.length === chunkSize,
    };
}

export async function addSupabaseFarmer(farmerData: FarmerFormValues, id: string) {
    const dataToSave = prepareFarmerData(farmerData);
    const { error } = await supabase.from('farmers').insert({ id, ...dataToSave });
    if (error) throw error;
}

export async function addSupabaseFarmersBatch(farmers: Farmer[]) {
    const rows = farmers.map(farmer => {
        const { id, createdAt, updatedAt, ...rest } = farmer;
        return {
            id,
            name: rest.name,
            gender: rest.gender,
            region: rest.region,
            district: rest.district,
            cocoa_district: rest.cocoaDistrict || null,
            society: rest.society,
            contact: rest.contact,
            age: rest.age,
            group_id: rest.groupId,
            education_level: rest.educationLevel,
            farm_size: rest.farmSize,
            crops_grown: rest.cropsGrown || [],
            status: rest.status,
            join_date: rest.joinDate ? new Date(rest.joinDate).toISOString() : null,
            deleted: rest.deleted || false,
        };
    });

    const { error } = await supabase.from('farmers').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
}

export async function updateSupabaseFarmer(id: string, farmerData: FarmerFormValues) {
    const dataToSave = prepareFarmerData(farmerData);
    const { error } = await supabase.from('farmers').update(dataToSave).eq('id', id);
    if (error) throw error;
}

export async function deleteSupabaseFarmer(id: string) {
    const { error } = await supabase.from('farmers').update({ deleted: true }).eq('id', id);
    if (error) throw error;
}

export async function purgeSupabaseFarmers() {
    const { error } = await supabase.from('farmers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function prepareFarmerData(farmerData: FarmerFormValues) {
    const { joinDate, cropsGrown, educationLevel, farmSize, groupId, cocoaDistrict, ...rest } = farmerData as any;
    const dataToSave: any = {
        ...rest,
        group_id: groupId,
        crops_grown: cropsGrown || [],
        education_level: educationLevel,
        farm_size: farmSize,
        cocoa_district: cocoaDistrict || null,
        join_date: joinDate ? new Date(joinDate).toISOString() : null,
    };

    // Remove undefined fields
    Object.keys(dataToSave).forEach(k => dataToSave[k] === undefined && delete dataToSave[k]);
    return dataToSave;
}

/** Maps a Postgres snake_case row to a camelCase Farmer object */
function mapFarmerRow(row: any): Farmer {
    return {
        id: row.id,
        name: row.name ?? 'Unnamed Farmer',
        gender: row.gender,
        region: row.region,
        district: row.district,
        cocoaDistrict: row.cocoa_district,
        society: row.society,
        contact: row.contact,
        age: row.age,
        educationLevel: row.education_level,
        farmSize: row.farm_size,
        cropsGrown: row.crops_grown || [],
        status: row.status,
        groupId: row.group_id,
        joinDate: row.join_date ? new Date(row.join_date).toISOString() : undefined,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
        deleted: row.deleted,
    };
}
