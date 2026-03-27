/**
 * Offline-First CRUD Service for Suppliers
 * Implements Dexie-first approach with automatic sync to Supabase
 */

import { db } from '../schema';
import { syncService } from '../sync';
import type { Supplier } from '@/lib/types';
import type { SupplierFormValues } from '@/components/suppliers/add-edit-supplier-dialog';
import { getSupabaseSuppliers } from '@/lib/supabase/services/suppliers';

/**
 * Get all suppliers from local database
 */
export async function getAllSuppliers(): Promise<Supplier[]> {
    return await db.suppliers.toArray();
}

/**
 * Get a single supplier by ID from local database
 */
export async function getSupplier(id: string): Promise<Supplier | undefined> {
    return await db.suppliers.get(id);
}

/**
 * Get simple supplier options for dropdowns (Memory Optimized)
 */
export async function getSupplierOptions(): Promise<Pick<Supplier, 'id' | 'name'>[]> {
    return await db.suppliers
        .toArray(suppliers => suppliers.map(s => ({
            id: s.id,
            name: s.name
        })));
}

/**
 * Get suppliers with pagination
 */
export async function getPaginatedSuppliers(page: number, pageSize: number): Promise<{ data: Supplier[], total: number }> {
    const total = await db.suppliers.count();
    const data = await db.suppliers
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();
    return { data, total };
}

/**
 * Search suppliers by name or email
 */
export async function searchSuppliers(query: string): Promise<Supplier[]> {
    const lowerQuery = query.toLowerCase();
    return await db.suppliers
        .filter(supplier =>
            supplier.name.toLowerCase().includes(lowerQuery) ||
            supplier.email.toLowerCase().includes(lowerQuery)
        )
        .toArray();
}

/**
 * Add a new supplier (offline-first)
 */
export async function addSupplier(
    supplierData: SupplierFormValues,
    id: string
): Promise<void> {
    const now = new Date().toISOString();

    const supplier: Supplier = {
        id,
        name: supplierData.name,
        contactPerson: supplierData.contactPerson,
        email: supplierData.email,
        phone: supplierData.phone,
        createdAt: now,
        updatedAt: now,
    };

    await syncService.writeAndEnqueue(
        db.suppliers,
        () => db.suppliers.add(supplier),
        'supplier', 'create', id, supplierData
    );
}

/**
 * Update an existing supplier (offline-first)
 */
export async function updateSupplier(
    id: string,
    supplierData: Partial<SupplierFormValues>
): Promise<void> {
    const now = new Date().toISOString();

    // Get existing supplier
    const existingSupplier = await db.suppliers.get(id);
    if (!existingSupplier) {
        throw new Error(`Supplier with ID ${id} not found`);
    }

    // Merge updates
    const safeUpdates = supplierData;

    const updatedSupplier: Supplier = {
        ...existingSupplier,
        ...safeUpdates,
        updatedAt: now,
    };

    await syncService.writeAndEnqueue(
        db.suppliers,
        () => db.suppliers.put(updatedSupplier),
        'supplier', 'update', id, supplierData
    );
}

/**
 * Delete a supplier (offline-first)
 */
export async function deleteSupplier(id: string): Promise<void> {
    const existing = await db.suppliers.get(id);

    await syncService.writeAndEnqueue(
        db.suppliers,
        () => db.suppliers.delete(id),
        'supplier', 'delete', id, null
    );
}

/**
 * Sync suppliers from Supabase to local database (delta sync)
 */
export async function syncSuppliersFromSupabase(): Promise<number> {
    try {
        const lastSync = localStorage.getItem('lastSync_suppliers');
        const lastSyncTime = lastSync ? parseInt(lastSync) : undefined;

        // Capture start time BEFORE the query to avoid race conditions
        const syncStartTime = Date.now();

        let hasMore = true;
        let offset = 0;
        const chunkSize = 1000;
        let totalSynced = 0;

        while (hasMore) {
            const result = await import('@/lib/supabase/services/suppliers').then(m => m.getSupabaseSuppliersPaginated(lastSyncTime, offset, chunkSize));
            const supabaseSuppliers = result.suppliers;
            hasMore = result.hasMore;

            if (supabaseSuppliers.length > 0) {
                const suppliersToPut: Supplier[] = [];
                const idsToDelete: string[] = [];

                for (const supplier of supabaseSuppliers as (Supplier & { deleted?: boolean })[]) {
                    if (supplier.deleted) {
                        idsToDelete.push(supplier.id);
                    } else {
                        delete supplier.deleted;
                        suppliersToPut.push(supplier);
                    }
                }

                if (suppliersToPut.length > 0) {
                    await db.suppliers.bulkPut(suppliersToPut);
                }

                if (idsToDelete.length > 0) {
                    await db.suppliers.bulkDelete(idsToDelete);
                }

                totalSynced += supabaseSuppliers.length;

                // Yield to main thread to prevent UI freezing
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            offset += chunkSize;
        }

        localStorage.setItem('lastSync_suppliers', syncStartTime.toString());

        return totalSynced;
    } catch (error) {
        console.error('❌ Failed to sync suppliers from Supabase:', error);
        throw error;
    }
}

/**
 * Get suppliers count
 */
export async function getSuppliersCount(): Promise<number> {
    return await db.suppliers.count();
}
