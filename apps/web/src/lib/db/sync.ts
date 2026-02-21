/**
 * Sync Queue Service
 * Manages the queue of pending sync operations and handles background synchronization
 */

import { db } from './schema';
import type { SyncQueueItem, SyncResult, EntityType, SyncOperation } from './types';
import { connectivityService } from './connectivity';
import { store } from '@/lib/store/store';
import { setSyncStatus } from '@/lib/store/slices/dataSlice';
import { isAuthenticated } from '@/lib/auth-utils';

// Import Supabase services for syncing
import { purgeSupabaseFarmers } from '@/lib/supabase/services/farmers';
import { supabase } from '@/lib/supabase/client';
import { startRealtimeSync, stopRealtimeSync } from './realtime';
import { syncPendingMedia } from './media-sync';


const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

/** Maps entity types to Supabase table names */
function getTableName(entityType: EntityType): string {
    const tableMap: Record<string, string> = {
        farmer: 'farmers',
        employee: 'employees',
        product: 'products',
        supplier: 'suppliers',
        transaction: 'transactions',
        farmerGroup: 'farmer_groups',
        farmerRequest: 'farmer_requests',
    };
    return tableMap[entityType] || `${entityType}s`;
}

/**
 * Convert camelCase data keys to snake_case for Postgres.
 * Common field mappings used across all entities.
 */
function toSnakeCase(data: any): any {
    const keyMap: Record<string, string> = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        joinDate: 'join_date',
        startDate: 'start_date',
        educationLevel: 'education_level',
        farmSize: 'farm_size',
        cropsGrown: 'crops_grown',
        isVerified: 'is_verified',
        supplierId: 'supplier_id',
        contactPerson: 'contact_person',
        employeeName: 'employee_name',
        seasonYear: 'season_year',
        farmerIds: 'farmer_ids',
        farmerId: 'farmer_id',
        groupId: 'group_id',
        grandTotal: 'grand_total',
        requestDate: 'request_date',
        productId: 'product_id',
        productName: 'product_name',
        dynamicPrice: 'dynamic_price',
        geminiApiKey: 'gemini_api_key',
        preferredModel: 'preferred_model',
    };

    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
        const newKey = keyMap[key] || key;
        result[newKey] = value;
    }
    return result;
}

class SyncService {
    private syncInterval: NodeJS.Timeout | null = null;
    private isSyncing = false;
    private isPaused = false;

    /**
     * Add an item to the sync queue
     */
    async addToQueue(
        entityType: EntityType,
        operation: SyncOperation,
        entityId: string,
        data: any
    ): Promise<void> {
        await db.syncQueue.add({
            entityType,
            operation,
            entityId,
            data,
            timestamp: Date.now(),
            synced: 0, // 0 = false
            retryCount: 0,
            status: 'pending',
        });

        // Try to sync immediately if online and not paused
        if (connectivityService.isOnline() && !this.isPaused) {
            this.syncAll().catch(console.error);
        }
    }

    /**
     * Sync all pending items in the queue
     */
    async syncAll(): Promise<SyncResult> {
        if (this.isSyncing) {
            return { success: true, itemsProcessed: 0, itemsFailed: 0, errors: [] };
        }

        if (!connectivityService.isOnline() || !isAuthenticated() || this.isPaused) {
            return { success: false, itemsProcessed: 0, itemsFailed: 0, errors: [] };
        }

        // Quick check before triggering Redux state updates
        const pendingCount = await db.syncQueue
            .where('synced')
            .equals(0)
            .and(item => (item.retryCount || 0) < MAX_RETRY_COUNT)
            .count();

        if (pendingCount === 0) {
            return { success: true, itemsProcessed: 0, itemsFailed: 0, errors: [] };
        }

        this.isSyncing = true;
        store.dispatch(setSyncStatus({ isSyncing: true }));
        const result: SyncResult = {
            success: true,
            itemsProcessed: 0,
            itemsFailed: 0,
            errors: [],
        };

        try {
            const pendingItems = await db.syncQueue
                .where('synced')
                .equals(0)
                .and(item => (item.retryCount || 0) < MAX_RETRY_COUNT)
                .toArray();

            // Process items in chunks
            const chunkSize = 500;
            for (let i = 0; i < pendingItems.length; i += chunkSize) {
                if (this.isPaused) break;

                const chunk = pendingItems.slice(i, i + chunkSize);
                const chunkIds = chunk.map(item => item.id as number);

                await db.syncQueue.where('id').anyOf(chunkIds).modify({ status: 'syncing' });

                try {
                    const successfulIds: number[] = [];
                    const failedItems: { item: SyncQueueItem, error: Error }[] = [];

                    for (const item of chunk) {
                        try {
                            // Handle special purge operation
                            if (item.operation === 'purge' && item.entityType === 'farmer') {
                                await purgeSupabaseFarmers();
                                successfulIds.push(item.id as number);
                                continue;
                            }

                            const tableName = getTableName(item.entityType);

                            if (item.operation === 'delete') {
                                // Soft-delete
                                const { error } = await supabase
                                    .from(tableName)
                                    .update({ deleted: true })
                                    .eq('id', item.entityId);
                                if (error) throw error;

                            } else if (item.operation === 'create') {
                                const dataToSave = toSnakeCase({ ...item.data });
                                // Remove undefined values
                                Object.keys(dataToSave).forEach(k => dataToSave[k] === undefined && delete dataToSave[k]);
                                // Remove camelCase timestamp fields (Postgres auto-manages these)
                                delete dataToSave.created_at;
                                delete dataToSave.updated_at;

                                const { error } = await supabase
                                    .from(tableName)
                                    .upsert({ id: item.entityId, ...dataToSave }, { onConflict: 'id' });
                                if (error) throw error;

                            } else if (item.operation === 'update') {
                                const dataToSave = toSnakeCase({ ...item.data });
                                Object.keys(dataToSave).forEach(k => dataToSave[k] === undefined && delete dataToSave[k]);
                                // Don't overwrite server timestamps
                                delete dataToSave.created_at;
                                delete dataToSave.updated_at;

                                const { error } = await supabase
                                    .from(tableName)
                                    .update(dataToSave)
                                    .eq('id', item.entityId);
                                if (error) throw error;
                            }

                            successfulIds.push(item.id as number);
                        } catch (err: any) {
                            failedItems.push({ item, error: err });
                        }
                    }

                    // Mark successful items
                    if (successfulIds.length > 0) {
                        await db.syncQueue.where('id').anyOf(successfulIds).modify({
                            synced: 1,
                            status: 'synced',
                        });
                        result.itemsProcessed += successfulIds.length;
                    }

                    // Mark failed items individually
                    if (failedItems.length > 0) {
                        result.itemsFailed += failedItems.length;

                        for (const { item, error } of failedItems) {
                            const newRetryCount = (item.retryCount || 0) + 1;
                            const isPermanentError = error.message?.includes('violates foreign key constraint') || error.message?.includes('row-level security');

                            // If it's a permanent DB error, don't keep retrying
                            const status = isPermanentError || newRetryCount >= MAX_RETRY_COUNT ? 'failed' : 'pending';

                            await db.syncQueue.update(item.id!, {
                                status,
                                retryCount: isPermanentError ? MAX_RETRY_COUNT : newRetryCount,
                                lastError: error.message || 'Unknown error',
                            });
                            result.errors.push({ item, error: error.message || 'Batch error' });
                        }
                    }

                } catch (error) {
                    // This catch block only triggers if something catastrophic happens to Dexie or IndexedDB
                    console.error("Catastrophic chunk sync error:", error);
                }
            }
        } catch (error) {
            result.success = false;
        } finally {
            this.isSyncing = false;
            store.dispatch(setSyncStatus({ isSyncing: false }));
        }

        return result;
    }


    startBackgroundSync(): void {
        if (this.syncInterval) {
            return;
        }

        // Start realtime subscriptions
        startRealtimeSync();

        // Sync on connection restore
        connectivityService.subscribe((isOnline) => {
            if (isOnline) {
                this.syncAll().catch(console.error);
                syncPendingMedia().catch(console.error);
                startRealtimeSync();
            } else {
                stopRealtimeSync();
            }
        });

        // Periodic sync — also flush any pending media
        this.syncInterval = setInterval(() => {
            if (connectivityService.isOnline() && isAuthenticated()) {
                this.syncAll().catch(console.error);
                syncPendingMedia().catch(console.error);
            }
        }, SYNC_INTERVAL);

        // Initial sync
        if (connectivityService.isOnline()) {
            this.syncAll().catch(console.error);
            syncPendingMedia().catch(console.error);
        }
    }

    /**
     * Stop background sync
     */
    stopBackgroundSync(): void {
        stopRealtimeSync();
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Get pending sync count
     */
    async getPendingCount(): Promise<number> {
        return await db.syncQueue
            .where('synced')
            .equals(0) // 0 = false
            .count();
    }

    /**
     * Clear synced items from queue (cleanup)
     */
    async clearSyncedItems(): Promise<void> {
        await db.syncQueue
            .where('synced')
            .equals(1) // 1 = true
            .delete();
    }

    /**
     * Clear all items from queue (use with caution)
     */
    async clearAllItems(): Promise<void> {
        await db.syncQueue.clear();
    }

    /**
     * Pause synchronization
     */
    pause(): void {
        this.isPaused = true;
        store.dispatch(setSyncStatus({ isPaused: true }));
    }

    /**
     * Resume synchronization
     */
    resume(): void {
        this.isPaused = false;
        store.dispatch(setSyncStatus({ isPaused: false }));
        if (connectivityService.isOnline()) {
            this.syncAll().catch(console.error);
        }
    }
}

// Export singleton instance
export const syncService = new SyncService();
