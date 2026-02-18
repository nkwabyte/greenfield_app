/**
 * Data Provider - Manages background sync and Redux state updates
 * This provider initializes background sync and keeps Redux metadata in sync
 * Only starts sync when a user is authenticated
 */

'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCounts, setSyncStatus } from '@/lib/store/slices/dataSlice';
import { syncService } from '@/lib/db';
import { useDashboardCounts } from '@/hooks/useData';
import { useConnectivity } from '@/hooks/useConnectivity';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/schema';
import type { RootState } from '@/lib/store/store';

export function DataProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch();
    const counts = useDashboardCounts();
    const { isOnline } = useConnectivity();
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    // Initialize background sync on mount — only when authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            // Stop any running sync when user logs out
            syncService.stopBackgroundSync();
            return;
        }

        syncService.startBackgroundSync();

        return () => {
            syncService.stopBackgroundSync();
        };
    }, [isAuthenticated]);

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
