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
const SYNCED_ITEM_TTL = 24 * 60 * 60 * 1000; // 24 hours — synced items older than this are pruned

/** Minimum wait (ms) before retrying a failed item — exponential backoff per retry count */
const BACKOFF_DELAYS_MS = [0, 60_000, 5 * 60_000, 30 * 60_000] as const;

/**
 * Returns the required backoff delay (ms) for the given retry count.
 * Returns 0 for the first attempt, then exponentially increases.
 */
function getBackoffDelay(retryCount: number): number {
    return BACKOFF_DELAYS_MS[Math.min(retryCount, BACKOFF_DELAYS_MS.length - 1)];
}

/** Returns true if an item is past its backoff period and eligible to sync. */
function isEligibleForSync(item: SyncQueueItem, now: number): boolean {
    if ((item.retryCount ?? 0) >= MAX_RETRY_COUNT) return false;
    const delay = getBackoffDelay(item.retryCount ?? 0);
    return delay === 0 || !item.lastAttemptAt || now - item.lastAttemptAt >= delay;
}

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
        assignedDistricts: 'assigned_districts',
        grandTotal: 'grand_total',
        requestDate: 'request_date',
        paymentPlan: 'payment_plan',
        otherPaymentPlan: 'other_payment_plan',
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
     * Add an item to the sync queue.
     * For `update` operations, deduplicates by replacing any existing pending update
     * for the same entity — so only the latest state is synced instead of every intermediate edit.
     *
     * ⚠️  Prefer `writeAndEnqueue` / `batchWriteAndEnqueue` for all mutations.
     * This method is kept for callers (e.g. admin purge) that perform non-entity writes.
     */
    async addToQueue(
        entityType: EntityType,
        operation: SyncOperation,
        entityId: string,
        data: any
    ): Promise<void> {
        // Deduplication: collapse multiple pending updates for the same entity into one.
        // This avoids redundant round-trips when a user edits the same record repeatedly while offline.
        if (operation === 'update') {
            const existing = await db.syncQueue
                .where('entityId').equals(entityId)
                .filter(item => item.operation === 'update' && item.synced === 0)
                .first();

            if (existing?.id != null) {
                await db.syncQueue.update(existing.id, {
                    data,
                    timestamp: Date.now(),
                    status: 'pending',
                });
                // Still attempt an immediate sync if online
                if (connectivityService.isOnline() && !this.isPaused) {
                    this.syncAll().catch(console.error);
                }
                return;
            }
        }

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
     * **Atomic single-record write + enqueue.**
     *
     * Wraps the local Dexie write *and* the sync-queue insert inside a single
     * IndexedDB transaction so both operations either commit together or both
     * roll back.  This is the ACID-safe replacement for the old pattern:
     *
     *   await db.[table].add/put/delete(entity);   // ← could succeed
     *   await syncService.addToQueue(...);          // ← could fail → orphan record
     *
     * `writeOp` receives no arguments — it should close over the Dexie table
     * and entity data directly.  Dexie automatically enlists all operations
     * on the declared tables into the current transaction context.
     *
     * For `update` operations the same deduplication as `addToQueue` applies:
     * an existing pending update for the same entity is replaced in-place.
     */
    async writeAndEnqueue<T>(
        table: import('dexie').Table<T, any>,
        writeOp: () => Promise<void>,
        entityType: EntityType,
        operation: SyncOperation,
        entityId: string,
        data: any
    ): Promise<void> {
        await db.transaction('rw', [table, db.syncQueue], async () => {
            // 1. Local write
            await writeOp();

            // 2. Sync-queue insert (with update deduplication)
            if (operation === 'update') {
                const existing = await db.syncQueue
                    .where('entityId').equals(entityId)
                    .filter(item => item.operation === 'update' && item.synced === 0)
                    .first();

                if (existing?.id != null) {
                    await db.syncQueue.update(existing.id, {
                        data,
                        timestamp: Date.now(),
                        status: 'pending',
                    });
                    return;
                }
            }

            await db.syncQueue.add({
                entityType,
                operation,
                entityId,
                data,
                timestamp: Date.now(),
                synced: 0,
                retryCount: 0,
                status: 'pending',
            });
        });

        // 3. After the transaction commits, attempt an immediate push if online
        if (connectivityService.isOnline() && !this.isPaused) {
            this.syncAll().catch(console.error);
        }
    }

    /**
     * **Atomic batch write + enqueue.**
     *
     * Same atomicity guarantee as `writeAndEnqueue` but for operations that
     * write multiple records at once (e.g. `bulkAdd` / `bulkPut`).
     * All sync-queue entries for the batch are inserted inside the same
     * transaction as the bulk write so partial failures are impossible.
     */
    async batchWriteAndEnqueue<T>(
        table: import('dexie').Table<T, any>,
        writeOp: () => Promise<void>,
        queueItems: Array<{
            entityType: EntityType;
            operation: SyncOperation;
            entityId: string;
            data: any;
        }>
    ): Promise<void> {
        const now = Date.now();
        await db.transaction('rw', [table, db.syncQueue], async () => {
            await writeOp();
            for (const item of queueItems) {
                await db.syncQueue.add({
                    entityType: item.entityType,
                    operation: item.operation,
                    entityId: item.entityId,
                    data: item.data,
                    timestamp: now,
                    synced: 0,
                    retryCount: 0,
                    status: 'pending',
                });
            }
        });

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

        const now = Date.now();

        // Quick check before triggering Redux state updates
        const pendingCount = await db.syncQueue
            .where('synced')
            .equals(0)
            .and(item => isEligibleForSync(item, now))
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
                .and(item => isEligibleForSync(item, now))
                .toArray();

            // Process items in chunks
            const chunkSize = 500;
            for (let i = 0; i < pendingItems.length; i += chunkSize) {
                if (this.isPaused) break;

                const chunk = pendingItems.slice(i, i + chunkSize);
                const chunkIds = chunk.map(item => item.id as number);

                await db.syncQueue.where('id').anyOf(chunkIds).modify({ status: 'syncing', lastAttemptAt: now });

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

        // Propagate initial connectivity state to Redux
        store.dispatch(setSyncStatus({ isOnline: connectivityService.isOnline() }));

        // Sync on connection restore
        connectivityService.subscribe((isOnline) => {
            // Keep Redux store in sync with actual connectivity
            store.dispatch(setSyncStatus({ isOnline }));
            if (isOnline) {
                this.syncAll().catch(console.error);
                syncPendingMedia().catch(console.error);
                startRealtimeSync();
            } else {
                stopRealtimeSync();
            }
        });

        // Periodic sync — also flush any pending media and prune stale synced items
        this.syncInterval = setInterval(() => {
            if (connectivityService.isOnline() && isAuthenticated()) {
                this.syncAll().catch(console.error);
                syncPendingMedia().catch(console.error);
                this.pruneStaleItems().catch(console.error);
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
     * Prune synced items older than SYNCED_ITEM_TTL (called automatically during background sync).
     * This prevents the sync queue from growing unbounded over time.
     */
    async pruneStaleItems(): Promise<void> {
        const cutoff = Date.now() - SYNCED_ITEM_TTL;
        await db.syncQueue
            .where('synced').equals(1)
            .and(item => item.timestamp < cutoff)
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
