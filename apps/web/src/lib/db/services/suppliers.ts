/**
 * Offline-First CRUD Service for Suppliers
 * Implements Dexie-first approach with automatic sync to Firebase
 */

import { db } from '../schema';
import { syncService } from '../sync';
import type { Supplier } from '@/lib/types';
import type { SupplierFormValues } from '@/components/suppliers/add-edit-supplier-dialog';
import { getFirebaseSuppliers } from '@/lib/firebase/services/suppliers';

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

    // 1. Save to local database immediately
    await db.suppliers.add(supplier);

    // 2. Add to sync queue
    await syncService.addToQueue('supplier', 'create', id, supplierData);

    // console.log(`✅ Supplier added locally: ${supplier.name}`);
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

    // 1. Update local database
    await db.suppliers.put(updatedSupplier);

    // 2. Add to sync queue
    await syncService.addToQueue('supplier', 'update', id, supplierData);

    // console.log(`✅ Supplier updated locally: ${updatedSupplier.name}`);
}

/**
 * Delete a supplier (offline-first)
 */
export async function deleteSupplier(id: string): Promise<void> {
    // 1. Delete from local database
    await db.suppliers.delete(id);

    // 2. Add to sync queue
    await syncService.addToQueue('supplier', 'delete', id, null);

    // console.log(`✅ Supplier deleted locally: ${id}`);
}

/**
 * Sync suppliers from Firebase to local database
 */
export async function syncSuppliersFromFirebase(): Promise<number> {
    try {
        const firebaseSuppliers = await getFirebaseSuppliers();

        // Clear local suppliers and replace with Firebase data
        await db.suppliers.clear();
        await db.suppliers.bulkAdd(firebaseSuppliers);

        // console.log(`✅ Synced ${firebaseSuppliers.length} suppliers from Firebase`);
        return firebaseSuppliers.length;
    } catch (error) {
        console.error('❌ Failed to sync suppliers from Firebase:', error);
        throw error;
    }
}

/**
 * Get suppliers count
 */
export async function getSuppliersCount(): Promise<number> {
    return await db.suppliers.count();
}
