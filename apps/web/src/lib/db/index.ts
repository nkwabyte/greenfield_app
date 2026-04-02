/**
 * Main index file for offline database services
 * Exports all database functionality
 */

// Schema and database instance
export { db, requestPersistentStorage, checkStorageQuota, clearAllData, getDatabaseStats } from './schema';

// Types
export type { SyncQueueItem, SyncOperation, EntityType, SyncStatus, ConnectivityState, SyncResult } from './types';

// Connectivity
export { connectivityService } from './connectivity';

// Sync service
export { syncService } from './sync';

// Entity services
export * from './services/farmers';
export * from './services/employees';
export * from './services/products';
export * from './services/suppliers';
export * from './services/transactions';

