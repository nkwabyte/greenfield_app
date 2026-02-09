/**
 * Dexie Database Schema for Greenfield CRM
 * Provides offline-first storage with IndexedDB
 */

import Dexie, { Table } from 'dexie';
import type { Farmer, Employee, Product, Supplier, Transaction } from '@/lib/types';
import type { SyncQueueItem } from './types';

export class GreenfieldDB extends Dexie {
    // Entity tables
    farmers!: Table<Farmer>;
    employees!: Table<Employee>;
    products!: Table<Product>;
    suppliers!: Table<Supplier>;
    transactions!: Table<Transaction>;

    // Sync queue table
    syncQueue!: Table<SyncQueueItem>;

    constructor() {
        super('GreenfieldCRM');

        // Define schema version 1
        this.version(1).stores({
            // Farmers table - indexed fields for efficient queries
            // Matches the structure from data_modified.xlsx
            farmers: 'id, name, region, district, society, status, updatedAt, createdAt',

            // Employees table
            employees: 'id, name, email, role, status, updatedAt, createdAt',

            // Products table
            products: 'id, name, category, supplierId, updatedAt, createdAt',

            // Suppliers table
            suppliers: 'id, name, email, updatedAt, createdAt',

            // Transactions table
            transactions: 'id, type, category, date, updatedAt, createdAt',

            // Sync queue - auto-increment ID, indexed by entity type and sync status
            syncQueue: '++id, entityType, entityId, synced, status, timestamp',
        });
    }
}

// Create and export database instance
export const db = new GreenfieldDB();

/**
 * Request persistent storage to prevent browser from clearing data
 * This is especially important for offline-first applications
 */
export async function requestPersistentStorage(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log(`Persistent storage granted: ${isPersisted}`);
        return isPersisted;
    }
    return false;
}

/**
 * Check current storage quota and usage
 */
export async function checkStorageQuota(): Promise<{
    usage: number;
    quota: number;
    percentUsed: number;
}> {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

        return {
            usage,
            quota,
            percentUsed,
        };
    }

    return {
        usage: 0,
        quota: 0,
        percentUsed: 0,
    };
}

/**
 * Clear all data from the database (use with caution)
 */
export async function clearAllData(): Promise<void> {
    await db.farmers.clear();
    await db.employees.clear();
    await db.products.clear();
    await db.suppliers.clear();
    await db.transactions.clear();
    await db.syncQueue.clear();
    console.log('All local data cleared');
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
    const [
        farmersCount,
        employeesCount,
        productsCount,
        suppliersCount,
        transactionsCount,
        syncQueueCount,
    ] = await Promise.all([
        db.farmers.count(),
        db.employees.count(),
        db.products.count(),
        db.suppliers.count(),
        db.transactions.count(),
        db.syncQueue.count(),
    ]);

    return {
        farmers: farmersCount,
        employees: employeesCount,
        products: productsCount,
        suppliers: suppliersCount,
        transactions: transactionsCount,
        pendingSync: syncQueueCount,
    };
}
