/**
 * Data Provider - Manages background sync and Redux state updates
 * This provider initializes background sync and keeps Redux metadata in sync
 */

'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setCounts, setSyncStatus } from '@/lib/store/slices/dataSlice';
import { syncService } from '@/lib/db';
import { useDashboardCounts } from '@/hooks/useData';
import { useConnectivity } from '@/hooks/useConnectivity';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/schema';

export function DataProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch();
    const counts = useDashboardCounts();
    const { isOnline } = useConnectivity();

    // Initialize background sync on mount
    useEffect(() => {
        // console.log('🚀 Starting background sync service...');
        syncService.startBackgroundSync();

        return () => {
            // console.log('🛑 Stopping background sync service...');
            syncService.stopBackgroundSync();
        };
    }, []);

    // Update counts in Redux when they change
    useEffect(() => {
        if (counts) {
            dispatch(setCounts(counts));
        }
    }, [counts, dispatch]);

    // Update sync status periodically
    // Real-time synchronization of queue status to Redux
    const pendingCount = useLiveQuery(async () => {
        return await db.syncQueue
            .where('synced')
            .equals(0)
            .count();
    }, []) ?? 0;

    // Update sync status when pendingCount changes
    useEffect(() => {
        dispatch(setSyncStatus({
            isOnline,
            pendingCount,
            lastSyncAt: Date.now(),
            // isSyncing managed by SyncService
        }));
    }, [pendingCount, isOnline, dispatch]);

    return <>{children}</>;
}
