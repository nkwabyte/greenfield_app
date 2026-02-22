'use client';
import { supabase } from '@/lib/supabase/client';
import type { Product } from '@/lib/types';
import type { ProductFormValues } from '@/components/products/add-edit-product-dialog';

/**
 * Delta sync: fetches only products modified since lastSyncTime.
 * Includes soft-deleted records so the local DB can remove them.
 */
export async function getSupabaseProducts(lastSyncTime?: number): Promise<Product[]> {
    let query = supabase.from('products').select('*').order('updated_at', { ascending: false });

    if (lastSyncTime) {
        const isoDate = new Date(lastSyncTime).toISOString();
        query = query.gt('updated_at', isoDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(mapProductRow);
}

/**
 * Paginated delta sync for products.
 */
export async function getSupabaseProductsPaginated(
    lastSyncTime?: number,
    offset = 0,
    chunkSize = 500
): Promise<{ products: Product[]; hasMore: boolean }> {
    let query = supabase
        .from('products')
        .select('*')
        .order('updated_at', { ascending: false })
        .range(offset, offset + chunkSize - 1);

    if (lastSyncTime) {
        const isoDate = new Date(lastSyncTime).toISOString();
        query = query.gt('updated_at', isoDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const products = (data || []).map(mapProductRow);
    return {
        products,
        hasMore: products.length === chunkSize,
    };
}

export async function addSupabaseProduct(productData: ProductFormValues, id: string) {
    const { supplierId, ...rest } = productData as any;
    const { error } = await supabase.from('products').insert({
        id,
        ...rest,
        supplier_id: supplierId,
    });
    if (error) throw error;
}

export async function updateSupabaseProduct(id: string, productData: ProductFormValues) {
    const { supplierId, ...rest } = productData as any;
    const { error } = await supabase.from('products').update({
        ...rest,
        supplier_id: supplierId,
    }).eq('id', id);
    if (error) throw error;
}

/**
 * Soft-delete: marks the record as deleted so other devices pick it up via delta sync.
 */
export async function deleteSupabaseProduct(id: string) {
    const { error } = await supabase.from('products').update({ deleted: true }).eq('id', id);
    if (error) throw error;
}

/** Maps a Postgres snake_case row to a camelCase Product object */
function mapProductRow(row: any): Product {
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        supplierId: row.supplier_id,
        quantity: row.quantity,
        price: row.price,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
        deleted: row.deleted,
    };
}
