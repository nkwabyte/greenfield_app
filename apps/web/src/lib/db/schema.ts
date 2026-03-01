/**
 * Dexie Database Schema for Greenfield CRM
 * Provides offline-first storage with IndexedDB
 */

import Dexie, { Table } from 'dexie';
import type { Farmer, Employee, Product, Supplier, Transaction, FarmerGroup, FarmerRequest } from '@/lib/types';
import type { SyncQueueItem } from './types';

export interface MediaItem {
    id: string;              // UUID, e.g. farmer_${farmerId}_avatar
    entityType: string;      // 'farmer' | 'employee' | etc.
    entityId: string;        // ID of the owning entity
    fieldName: string;       // Field this image maps to, e.g. 'avatarUrl'
    mimeType: string;        // e.g. 'image/jpeg'
    data: ArrayBuffer;       // The raw image bytes stored offline
    remoteUrl?: string;      // Populated after successful upload to Supabase Storage
    status: 'pending' | 'uploading' | 'uploaded' | 'error';
    retryCount: number;
    errorMessage?: string;
    createdAt: string;
    updatedAt: string;
}

/** Staging row for bulk-import preview. Written by the worker, read by the preview page. */
export interface StagingFarmer {
    _id?: number;       // Auto-incremented by Dexie — used for pagination
    name: string;
    gender: string;
    age: number;
    region: string;
    district: string;
    society: string;
    farmSize: number;
    contact: string;
    educationLevel: string;
    cropsGrown: string[];
    status: string;
    joinDate: string;
}

/** Unresolvable row from a bulk import. Stored so the user can fix region/name manually. */
export interface StagingError {
    _id?: number;       // Auto-incremented
    rowIndex: number;   // Original row number in the Excel file (for reference)
    sheet: string;      // Sheet name (= district hint)
    reason: string;     // Human-readable error description
    // Raw field values from the Excel row
    rawName: string;
    rawRegion: string;
    rawAge: string;
    rawGender: string;
    rawDistrict: string;
    rawSociety: string;
    rawFarmSize: string;
}

export class GreenfieldDB extends Dexie {
    // Entity tables
    farmers!: Table<Farmer>;
    employees!: Table<Employee>;
    products!: Table<Product>;
    suppliers!: Table<Supplier>;
    transactions!: Table<Transaction>;
    farmerGroups!: Table<FarmerGroup>;    // NEW: Phase 2 Table
    farmerRequests!: Table<FarmerRequest>; // NEW: Phase 3 Table
    statistics!: Table<{ id: string; byRegion: Record<string, number>; byGender: Record<string, number>; byFarmSize: Record<string, number>; byAge: Record<string, number>; byRegionAndGender: Record<string, Record<string, number>> }>;
    mediaStore!: Table<MediaItem>;        // Offline image store
    importStaging!: Table<StagingFarmer>; // Temporary staging table for bulk import preview
    importErrors!: Table<StagingError>;   // Unresolvable rows needing manual region/name fix

    // Sync queue table
    syncQueue!: Table<SyncQueueItem>;

    constructor() {
        super('GreenfieldCRM');

        // Define schema version 1
        this.version(1).stores({
            farmers: 'id, name, region, district, society, status, updatedAt, createdAt',
            employees: 'id, name, email, role, status, updatedAt, createdAt',
            products: 'id, name, category, supplierId, updatedAt, createdAt',
            suppliers: 'id, name, email, updatedAt, createdAt',
            transactions: 'id, type, category, date, updatedAt, createdAt',
            syncQueue: '++id, entityType, entityId, synced, status, timestamp',
        });

        // Upgrade schema version 2: Add compound indices for fast filtering
        this.version(2).stores({
            farmers: 'id, name, region, district, society, status, updatedAt, createdAt, [region+district], [region+district+society], [region+status]',
        });

        // Upgrade schema version 3: Add new indices for querying optimizations
        this.version(3).stores({
            farmers: 'id, name, region, district, society, community, status, updatedAt, createdAt, [region+district], [region+district+society], [region+status]',
            statistics: 'id',
        });

        // Upgrade schema version 4: Add Farmer Groups and Requests
        this.version(4).stores({
            farmerGroups: 'id, name, seasonYear, *farmerIds, syncStatus, updatedAt, createdAt',
            farmerRequests: 'id, farmerId, groupId, seasonYear, status, requestDate, updatedAt, createdAt'
        });

        // Version 5: Migrated from Firebase → Supabase.
        // Clear all entity tables so Supabase sync can repopulate with clean data.
        this.version(5).stores({
            farmers: 'id, name, region, district, society, community, status, updatedAt, createdAt, [region+district], [region+district+society], [region+status]',
            employees: 'id, name, email, role, status, updatedAt, createdAt',
            products: 'id, name, category, supplierId, updatedAt, createdAt',
            suppliers: 'id, name, email, updatedAt, createdAt',
            transactions: 'id, type, category, date, updatedAt, createdAt',
            farmerGroups: 'id, name, seasonYear, *farmerIds, updatedAt, createdAt',
            farmerRequests: 'id, farmerId, groupId, seasonYear, status, requestDate, updatedAt, createdAt',
            statistics: 'id',
            syncQueue: '++id, entityType, entityId, synced, status, timestamp',
        }).upgrade(async tx => {
            // Wipe Firebase-era data — Supabase sync will repopulate on next load
            await Promise.all([
                tx.table('farmers').clear(),
                tx.table('employees').clear(),
                tx.table('products').clear(),
                tx.table('suppliers').clear(),
                tx.table('transactions').clear(),
                tx.table('farmerGroups').clear(),
                tx.table('farmerRequests').clear(),
                tx.table('statistics').clear(),
                tx.table('syncQueue').clear(),
            ]);
        });

        // Version 6: Expanded Farmer Groups Schema (Regions, Dynamic Pricing, Deletion flags)
        this.version(6).stores({
            farmers: 'id, name, region, district, society, community, groupId, status, deleted, updatedAt, createdAt, [region+district], [region+district+society], [region+status]',
            employees: 'id, name, email, role, status, deleted, updatedAt, createdAt',
            products: 'id, name, category, supplierId, deleted, updatedAt, createdAt',
            suppliers: 'id, name, email, deleted, updatedAt, createdAt',
            transactions: 'id, type, category, date, deleted, updatedAt, createdAt',
            farmerGroups: 'id, name, region, district, society, leaderId, seasonYear, *farmerIds, deleted, updatedAt, createdAt',
            farmerRequests: 'id, farmerId, groupId, seasonYear, status, requestDate, deleted, updatedAt, createdAt',
            statistics: 'id',
            syncQueue: '++id, entityType, entityId, synced, status, timestamp',
        });

        // Version 7: Add Payment Plans and Transactions to Farmer Requests
        this.version(7).stores({
            farmerRequests: 'id, farmerId, groupId, seasonYear, status, requestDate, paymentPlan, deleted, updatedAt, createdAt',
        });

        // Version 8: Add offline media store for images
        this.version(8).stores({
            mediaStore: 'id, entityType, entityId, fieldName, status, createdAt',
        });

        // Version 9: Add temporary staging table for bulk-import preview
        this.version(9).stores({
            importStaging: '++_id, region, district',
        });

        // Version 10: Add error table for rows that need manual region/name fix
        this.version(10).stores({
            importErrors: '++_id, sheet',
        });

        // Version 11: Merge community into society (society takes preference).
        // Also removes community index from farmers and farmerGroups.
        this.version(11).stores({
            farmers: 'id, name, region, district, society, groupId, status, deleted, updatedAt, createdAt, [region+district], [region+district+society], [region+status]',
            farmerGroups: 'id, name, region, district, society, leaderId, seasonYear, *farmerIds, deleted, updatedAt, createdAt',
        }).upgrade(async tx => {
            // For every farmer where society is blank, copy community → society
            await tx.table('farmers').toCollection().modify((farmer: any) => {
                if ((!farmer.society || farmer.society.trim() === '') && farmer.community) {
                    farmer.society = farmer.community;
                }
                delete farmer.community; // remove the field from the record
            });
            // Same for farmerGroups
            await tx.table('farmerGroups').toCollection().modify((group: any) => {
                if ((!group.society || group.society.trim() === '') && group.community) {
                    group.society = group.community;
                }
                delete group.community;
            });
        });

        // Version 12: Add isArchived flag for hiding farmers and groups without deleting them
        this.version(12).stores({
            farmers: 'id, name, region, district, society, groupId, status, deleted, isArchived, updatedAt, createdAt, [region+district], [region+district+society], [region+status]',
            farmerGroups: 'id, name, region, district, society, leaderId, seasonYear, *farmerIds, deleted, isArchived, updatedAt, createdAt',
        });
    }
}

// Create and export database instance
export const db = new GreenfieldDB();

// Recover from schema version conflicts (common in Electron after upgrades)
// If the DB fails to open, delete it and reload — data will re-sync from Supabase
if (typeof window !== 'undefined') {
    db.open().catch((err) => {
        console.error('[Dexie] Failed to open DB, deleting and reloading:', err);
        db.delete().then(() => {
            window.location.reload();
        });
    });
}

/**
 * Request persistent storage to prevent browser from clearing data
 * This is especially important for offline-first applications
 */
export async function requestPersistentStorage(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        // console.log(`Persistent storage granted: ${isPersisted}`);
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
    await db.farmerGroups.clear();
    await db.farmerRequests.clear();
    await db.syncQueue.clear();

    // Clear all sync timestamps from localStorage
    if (typeof window !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('lastSync_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }
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
