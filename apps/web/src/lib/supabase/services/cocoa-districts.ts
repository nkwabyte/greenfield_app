'use client';
import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db/schema';
import type { CocoaDistrict } from '@/lib/types';

const LAST_SYNC_KEY = 'lastSync_cocoaDistricts';

// ─── Sync ─────────────────────────────────────────────────────────────────────

/**
 * Delta-sync cocoa districts from Supabase into the local Dexie table.
 * Only fetches rows modified since the last sync timestamp.
 */
export async function syncCocoaDistrictsFromSupabase(): Promise<void> {
    const lastSyncRaw = localStorage.getItem(LAST_SYNC_KEY);
    const lastSyncTime = lastSyncRaw ? parseInt(lastSyncRaw, 10) : undefined;

    let query = supabase
        .from('cocoa_districts')
        .select('*')
        .order('updated_at', { ascending: false });

    if (lastSyncTime) {
        query = query.gt('updated_at', new Date(lastSyncTime).toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    const districts: CocoaDistrict[] = (data || []).map(mapRow);

    if (districts.length > 0) {
        await db.cocoaDistricts.bulkPut(districts);
    }

    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
}

// ─── Direct API Calls (used by admin page for immediate feedback) ──────────────

export async function addSupabaseCocoaDistrict(district: CocoaDistrict): Promise<void> {
    const { error } = await supabase.from('cocoa_districts').insert(toRow(district));
    if (error) throw error;
}

export async function updateSupabaseCocoaDistrict(id: string, changes: Partial<Pick<CocoaDistrict, 'name' | 'isActive'>>): Promise<void> {
    const row: Record<string, any> = {};
    if (changes.name !== undefined) row.name = changes.name;
    if (changes.isActive !== undefined) row.is_active = changes.isActive;
    const { error } = await supabase.from('cocoa_districts').update(row).eq('id', id);
    if (error) throw error;
}

export async function deleteSupabaseCocoaDistrict(id: string): Promise<void> {
    const { error } = await supabase.from('cocoa_districts').update({ deleted: true }).eq('id', id);
    if (error) throw error;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapRow(row: any): CocoaDistrict {
    return {
        id: row.id,
        name: row.name,
        isActive: row.is_active ?? true,
        createdBy: row.created_by ?? undefined,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
        deleted: row.deleted ?? false,
    };
}

function toRow(district: CocoaDistrict): Record<string, any> {
    return {
        id: district.id,
        name: district.name,
        is_active: district.isActive,
        created_by: district.createdBy ?? null,
        deleted: district.deleted ?? false,
    };
}
