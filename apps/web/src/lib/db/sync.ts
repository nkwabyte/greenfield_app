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

// Import Firebase services for syncing
import {
    addFirebaseFarmer,
    updateFirebaseFarmer,
    deleteFirebaseFarmer,
    purgeFirebaseFarmers
} from '@/lib/firebase/services/farmers';
import {
    addFirebaseEmployee,
    updateFirebaseEmployee,
    deleteFirebaseEmployee
} from '@/lib/firebase/services/employees';
import {
    addFirebaseProduct,
    updateFirebaseProduct,
    deleteFirebaseProduct
} from '@/lib/firebase/services/products';
import {
    addFirebaseSupplier,
    updateFirebaseSupplier,
    deleteFirebaseSupplier
} from '@/lib/firebase/services/suppliers';
import {
    addFirebaseTransaction,
    updateFirebaseTransaction,
    deleteFirebaseTransaction
} from '@/lib/firebase/services/transactions';
import { db as firebaseDb } from '@/lib/firebase/config';
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';

const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

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

            // Process each item in batches of 500 (Firestore's limit)
            const batchSize = 500;
            for (let i = 0; i < pendingItems.length; i += batchSize) {
                if (this.isPaused) break;

                const chunk = pendingItems.slice(i, i + batchSize);
                const batch = writeBatch(firebaseDb);
                const chunkIds = chunk.map(item => item.id as number);

                await db.syncQueue.where('id').anyOf(chunkIds).modify({ status: 'syncing' });

                try {
                    for (const item of chunk) {
                        if (item.operation === 'purge' && item.entityType === 'farmer') {
                            await purgeFirebaseFarmers();
                            continue;
                        }

                        // Collection names match entityTypes + 's' generally
                        const collectionName = item.entityType === 'transaction' ? 'transactions' : `${item.entityType}s`;
                        const docRef = doc(firebaseDb, collectionName, item.entityId);

                        if (item.operation === 'delete') {
                            // Implement Soft Deletes for all entities to avoid orphan records on other devices
                            batch.update(docRef, { deleted: true, updatedAt: serverTimestamp() });
                        } else if (item.operation === 'create') {
                            const dataToSave = { ...item.data };
                            if (typeof dataToSave.joinDate === 'string') dataToSave.joinDate = new Date(dataToSave.joinDate);
                            Object.keys(dataToSave).forEach(k => dataToSave[k] === undefined && delete dataToSave[k]);

                            batch.set(docRef, {
                                ...dataToSave,
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp()
                            });
                        } else if (item.operation === 'update') {
                            const dataToSave = { ...item.data };
                            if (typeof dataToSave.joinDate === 'string') dataToSave.joinDate = new Date(dataToSave.joinDate);
                            Object.keys(dataToSave).forEach(k => dataToSave[k] === undefined && delete dataToSave[k]);

                            batch.update(docRef, {
                                ...dataToSave,
                                updatedAt: serverTimestamp()
                            });
                        }
                    }

                    await batch.commit();

                    await db.syncQueue.where('id').anyOf(chunkIds).modify({
                        synced: 1,
                        status: 'synced',
                    });

                    result.itemsProcessed += chunk.length;
                } catch (error) {
                    result.itemsFailed += chunk.length;

                    // Increment retry counts for failed batch
                    for (const item of chunk) {
                        const newRetryCount = (item.retryCount || 0) + 1;
                        await db.syncQueue.update(item.id!, {
                            status: newRetryCount >= MAX_RETRY_COUNT ? 'failed' : 'pending',
                            retryCount: newRetryCount,
                            lastError: error instanceof Error ? error.message : 'Unknown error',
                        });
                        result.errors.push({ item, error: error instanceof Error ? error.message : 'Batch error' });
                    }
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

    /**
     * Sync a single item from the queue
     */
    private async syncItem(item: SyncQueueItem): Promise<void> {
        if (!item.id) {
            throw new Error('Queue item missing ID');
        }

        // console.log(`⏳ Syncing: ${item.operation} ${item.entityType} ${item.entityId}`);

        // Update status to syncing
        await db.syncQueue.update(item.id, { status: 'syncing' });

        try {
            // Call appropriate Firebase service based on entity type and operation
            await this.executeSync(item);

            // Mark as synced
            await db.syncQueue.update(item.id, {
                synced: 1, // 1 = true (number)
                status: 'synced',
            });

            // console.log(`✅ Synced: ${item.operation} ${item.entityType} ${item.entityId}`);
        } catch (error) {
            const retryCount = (item.retryCount || 0) + 1;
            const lastError = error instanceof Error ? error.message : 'Unknown error';

            await db.syncQueue.update(item.id, {
                status: retryCount >= MAX_RETRY_COUNT ? 'failed' : 'pending',
                retryCount,
                lastError,
            });

            console.error(`❌ Sync failed (attempt ${retryCount}/${MAX_RETRY_COUNT}):`, lastError);
            throw error;
        }
    }

    /**
     * Execute the actual sync operation to Firebase
     */
    private async executeSync(item: SyncQueueItem): Promise<void> {
        const { entityType, operation, entityId, data } = item;

        // console.log(`📤 Executing Firebase ${operation} for ${entityType}:`, entityId);

        switch (entityType) {
            case 'farmer':
                if (operation === 'create') await addFirebaseFarmer(data, entityId);
                else if (operation === 'update') await updateFirebaseFarmer(entityId, data);
                else if (operation === 'delete') await deleteFirebaseFarmer(entityId);
                else if (operation === 'purge') await purgeFirebaseFarmers();
                break;

            case 'employee':
                if (operation === 'create') await addFirebaseEmployee(data, entityId);
                else if (operation === 'update') await updateFirebaseEmployee(entityId, data);
                else if (operation === 'delete') await deleteFirebaseEmployee(entityId);
                break;

            case 'product':
                if (operation === 'create') await addFirebaseProduct(data, entityId);
                else if (operation === 'update') await updateFirebaseProduct(entityId, data);
                else if (operation === 'delete') await deleteFirebaseProduct(entityId);
                break;

            case 'supplier':
                if (operation === 'create') await addFirebaseSupplier(data, entityId);
                else if (operation === 'update') await updateFirebaseSupplier(entityId, data);
                else if (operation === 'delete') await deleteFirebaseSupplier(entityId);
                break;

            case 'transaction':
                if (operation === 'create') await addFirebaseTransaction(data, entityId);
                else if (operation === 'update') await updateFirebaseTransaction(entityId, data);
                else if (operation === 'delete') await deleteFirebaseTransaction(entityId);
                break;

            default:
                throw new Error(`Unknown entity type: ${entityType}`);
        }
    }

    /**
     * Start background sync
     */
    startBackgroundSync(): void {
        if (this.syncInterval) {
            // console.log('⚠️ Background sync already running');
            return;
        }

        // console.log('🔄 Starting background sync...');

        // Sync on connection restore
        connectivityService.subscribe((isOnline) => {
            if (isOnline) {
                // console.log('🟢 Connection restored - triggering sync');
                this.syncAll().catch(console.error);
            }
        });

        // Periodic sync
        this.syncInterval = setInterval(() => {
            if (connectivityService.isOnline() && isAuthenticated()) {
                this.syncAll().catch(console.error);
            }
        }, SYNC_INTERVAL);

        // Initial sync
        if (connectivityService.isOnline()) {
            this.syncAll().catch(console.error);
        }
    }

    /**
     * Stop background sync
     */
    stopBackgroundSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            // console.log('⏹️ Background sync stopped');
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
        // console.log('🧹 Cleared synced items from queue');
    }

    /**
     * Clear all items from queue (use with caution)
     */
    async clearAllItems(): Promise<void> {
        await db.syncQueue.clear();
        // console.log('🧹 Cleared all items from sync queue');
    }

    /**
     * Pause synchronization
     */
    pause(): void {
        this.isPaused = true;
        store.dispatch(setSyncStatus({ isPaused: true }));
        // console.log('⏸️ Sync paused');
    }

    /**
     * Resume synchronization
     */
    resume(): void {
        this.isPaused = false;
        store.dispatch(setSyncStatus({ isPaused: false }));
        // console.log('▶️ Sync resumed');
        if (connectivityService.isOnline()) {
            this.syncAll().catch(console.error);
        }
    }
}

// Export singleton instance
export const syncService = new SyncService();
