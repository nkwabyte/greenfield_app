/**
 * Sync Queue Service
 * Manages the queue of pending sync operations and handles background synchronization
 */

import { db } from './schema';
import type { SyncQueueItem, SyncResult, EntityType, SyncOperation } from './types';
import { connectivityService } from './connectivity';
import { store } from '@/lib/store/store';
import { setSyncStatus } from '@/lib/store/slices/dataSlice';

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

        console.log(`📝 Added to sync queue: ${operation} ${entityType} ${entityId}`);

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
            console.log('⏳ Sync already in progress, skipping...');
            return { success: true, itemsProcessed: 0, itemsFailed: 0, errors: [] };
        }

        if (!connectivityService.isOnline()) {
            console.log('📡 Offline - sync deferred');
            return { success: false, itemsProcessed: 0, itemsFailed: 0, errors: [] };
        }

        if (this.isPaused) {
            console.log('⏸️ Sync is paused');
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
            // Get all pending items
            const pendingItems = await db.syncQueue
                .where('synced')
                .equals(0) // 0 = false (number)
                .and(item => (item.retryCount || 0) < MAX_RETRY_COUNT)
                .toArray();

            if (pendingItems.length === 0) {
                console.log('✅ Sync queue is empty');
                return result;
            }

            console.log(`🔄 Syncing ${pendingItems.length} items...`);

            // Process each item
            for (const item of pendingItems) {
                if (this.isPaused) {
                    console.log('⏸️ Sync paused during processing');
                    break;
                }
                try {
                    await this.syncItem(item);
                    result.itemsProcessed++;
                } catch (error) {
                    result.itemsFailed++;
                    result.errors.push({
                        item,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }

            console.log(`✅ Sync complete: ${result.itemsProcessed} synced, ${result.itemsFailed} failed`);
        } catch (error) {
            console.error('❌ Sync failed:', error);
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

        console.log(`⏳ Syncing: ${item.operation} ${item.entityType} ${item.entityId}`);

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

            console.log(`✅ Synced: ${item.operation} ${item.entityType} ${item.entityId}`);
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

        console.log(`📤 Executing Firebase ${operation} for ${entityType}:`, entityId);

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
            console.log('⚠️ Background sync already running');
            return;
        }

        console.log('🔄 Starting background sync...');

        // Sync on connection restore
        connectivityService.subscribe((isOnline) => {
            if (isOnline) {
                console.log('🟢 Connection restored - triggering sync');
                this.syncAll().catch(console.error);
            }
        });

        // Periodic sync
        this.syncInterval = setInterval(() => {
            if (connectivityService.isOnline()) {
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
            console.log('⏹️ Background sync stopped');
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
        console.log('🧹 Cleared synced items from queue');
    }

    /**
     * Clear all items from queue (use with caution)
     */
    async clearAllItems(): Promise<void> {
        await db.syncQueue.clear();
        console.log('🧹 Cleared all items from sync queue');
    }

    /**
     * Pause synchronization
     */
    pause(): void {
        this.isPaused = true;
        store.dispatch(setSyncStatus({ isPaused: true }));
        console.log('⏸️ Sync paused');
    }

    /**
     * Resume synchronization
     */
    resume(): void {
        this.isPaused = false;
        store.dispatch(setSyncStatus({ isPaused: false }));
        console.log('▶️ Sync resumed');
        if (connectivityService.isOnline()) {
            this.syncAll().catch(console.error);
        }
    }
}

// Export singleton instance
export const syncService = new SyncService();
