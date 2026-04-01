/**
 * Types for offline sync and database operations
 */

export type EntityType = 'farmer' | 'employee' | 'product' | 'supplier' | 'transaction' | 'farmerGroup' | 'farmerRequest';

export type SyncOperation = 'create' | 'update' | 'delete' | 'purge';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface SyncQueueItem {
    id?: number; // Auto-incremented by Dexie
    entityType: EntityType;
    operation: SyncOperation;
    entityId: string;
    data: any; // The actual entity data
    timestamp: number;
    synced: number; // 0 = false, 1 = true (Boolean not supported as IDB key)
    retryCount?: number;
    lastAttemptAt?: number; // Timestamp of last sync attempt (for exponential backoff)
    lastError?: string;
    status: SyncStatus;
}

export interface ConnectivityState {
    isOnline: boolean;
    lastOnlineAt?: number;
    lastOfflineAt?: number;
}

export interface SyncResult {
    success: boolean;
    itemsProcessed: number;
    itemsFailed: number;
    errors: Array<{
        item: SyncQueueItem;
        error: string;
    }>;
}
