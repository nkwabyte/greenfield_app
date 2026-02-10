/**
 * Sync Diagnostic Tool
 * 
 * Run this in browser console to diagnose sync issues:
 * 1. Check sync queue status
 * 2. View sample queue items
 * 3. Test manual sync
 * 4. Check Firebase connection
 */

import { db } from './schema';
import { syncService } from './sync';

// Open IndexedDB and check sync queue
export async function diagnoseSyncQueue() {
    // console.log('🔍 Diagnosing Sync Queue...\n');

    try {
        // Get queue stats
        const totalItems = await db.syncQueue.count();
        const syncedItems = await db.syncQueue.where('synced').equals(1).count();
        const pendingItems = await db.syncQueue.where('synced').equals(0).count();
        const failedItems = await db.syncQueue.where('status').equals('failed').count();

        // console.log('📊 Queue Statistics:');
        // console.log(`  Total items: ${totalItems.toLocaleString()}`);
        // console.log(`  Synced: ${syncedItems.toLocaleString()}`);
        // console.log(`  Pending: ${pendingItems.toLocaleString()}`);
        // console.log(`  Failed: ${failedItems.toLocaleString()}\n`);

        // Get sample items
        const samplePending = await db.syncQueue
            .where('synced')
            .equals(0)
            .limit(5)
            .toArray();

        // console.log('📝 Sample Pending Items:');
        // samplePending.forEach((item, i) => {
        //     console.log(`  ${i + 1}. ${item.operation} ${item.entityType} - Status: ${item.status}, Retries: ${item.retryCount || 0}`);
        //     if (item.lastError) console.log(`     Error: ${item.lastError}`);
        // });

        // Check Firebase config
        // console.log('\n🔥 Firebase Configuration:');
        const firebaseConfig = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing',
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '❌ Missing',
        };
        // console.table(firebaseConfig);

        return {
            totalItems,
            syncedItems,
            pendingItems,
            failedItems,
            samplePending
        };
    } catch (error) {
        // console.error('❌ Diagnostic failed:', error);
        throw error;
    }
}

// Test manual sync
export async function testManualSync() {
    // console.log('\n🧪 Testing manual sync...\n');

    try {
        // Trigger sync
        const result = await syncService.syncAll();

        // console.log('✅ Sync completed:');
        // console.log(`  Processed: ${result.itemsProcessed}`);
        // console.log(`  Failed: ${result.itemsFailed}`);

        if (result.errors.length > 0) {
            // console.log('\n❌ Errors:');
            result.errors.forEach((err, i) => {
                // console.log(`  ${i + 1}. ${err.error}`);
            });
        }

        return result;
    } catch (error) {
        // console.error('❌ Manual sync failed:', error);
        throw error;
    }
}

// Clear failed items
export async function clearFailedItems() {
    const deleted = await db.syncQueue.where('status').equals('failed').delete();
    // console.log(`🗑️ Cleared ${deleted} failed items`);
    return deleted;
}

// Export functions to window for console access
if (typeof window !== 'undefined') {
    (window as any).diagnoseSyncQueue = diagnoseSyncQueue;
    (window as any).testManualSync = testManualSync;
    (window as any).clearFailedItems = clearFailedItems;

    // console.log('🛠️ Sync diagnostic tools loaded!');
    // console.log('Available commands:');
    // console.log('  - diagnoseSyncQueue()  : Check queue status');
    // console.log('  - testManualSync()     : Test sync manually');
    // console.log('  - clearFailedItems()   : Clear failed queue items');
}
