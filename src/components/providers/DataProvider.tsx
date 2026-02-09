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

export function DataProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch();
    const counts = useDashboardCounts();
    const { isOnline } = useConnectivity();

    // Initialize background sync on mount
    useEffect(() => {
        console.log('🚀 Starting background sync service...');
        syncService.startBackgroundSync();

        return () => {
            console.log('🛑 Stopping background sync service...');
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
    useEffect(() => {
        const updateSyncStatus = async () => {
            try {
                const pendingCount = await syncService.getPendingCount();
                dispatch(setSyncStatus({
                    isOnline,
                    pendingCount,
                    lastSyncAt: Date.now(),
                    isSyncing: pendingCount > 0,
                }));
            } catch (error) {
                console.error('Failed to update sync status:', error);
            }
        };

        // Update immediately
        updateSyncStatus();

        // Then update every 10 seconds
        const interval = setInterval(updateSyncStatus, 10000);

        return () => clearInterval(interval);
    }, [isOnline, dispatch]);

    return <>{children}</>;
}
