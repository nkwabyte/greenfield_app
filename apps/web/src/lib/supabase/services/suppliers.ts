'use client';
import { supabase } from '@/lib/supabase/client';
import type { Supplier } from '@/lib/types';
import type { SupplierFormValues } from '@/components/suppliers/add-edit-supplier-dialog';

/**
 * Delta sync: fetches only suppliers modified since lastSyncTime.
 * Includes soft-deleted records so the local DB can remove them.
 */
export async function getSupabaseSuppliers(lastSyncTime?: number): Promise<Supplier[]> {
    let query = supabase.from('suppliers').select('*').order('updated_at', { ascending: false });

    if (lastSyncTime) {
        const isoDate = new Date(lastSyncTime).toISOString();
        query = query.gt('updated_at', isoDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(mapSupplierRow);
}

/**
 * Paginated delta sync for suppliers.
 */
export async function getSupabaseSuppliersPaginated(
    lastSyncTime?: number,
    offset = 0,
    chunkSize = 500
): Promise<{ suppliers: Supplier[]; hasMore: boolean }> {
    let query = supabase
        .from('suppliers')
        .select('*')
        .order('updated_at', { ascending: false })
        .range(offset, offset + chunkSize - 1);

    if (lastSyncTime) {
        const isoDate = new Date(lastSyncTime).toISOString();
        query = query.gt('updated_at', isoDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const suppliers = (data || []).map(mapSupplierRow);
    return {
        suppliers,
        hasMore: suppliers.length === chunkSize,
    };
}

export async function addSupabaseSupplier(supplierData: SupplierFormValues, id: string) {
    const { contactPerson, ...rest } = supplierData as any;
    const { error } = await supabase.from('suppliers').insert({
        id,
        ...rest,
        contact_person: contactPerson,
    });
    if (error) throw error;
}

export async function updateSupabaseSupplier(id: string, supplierData: SupplierFormValues) {
    const { contactPerson, ...rest } = supplierData as any;
    const { error } = await supabase.from('suppliers').update({
        ...rest,
        contact_person: contactPerson,
    }).eq('id', id);
    if (error) throw error;
}

/**
 * Soft-delete: marks the record as deleted so other devices pick it up via delta sync.
 */
export async function deleteSupabaseSupplier(id: string) {
    const { error } = await supabase.from('suppliers').update({ deleted: true }).eq('id', id);
    if (error) throw error;
}

/** Maps a Postgres snake_case row to a camelCase Supplier object */
function mapSupplierRow(row: any): Supplier {
    return {
        id: row.id,
        name: row.name,
        contactPerson: row.contact_person,
        email: row.email,
        phone: row.phone,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
        deleted: row.deleted,
    };
}
