/**
 * Initial Sync Provider - Performs one-time background sync from Supabase to IndexedDB
 * This runs in the background without blocking the UI
 * Only syncs when a user is authenticated to avoid permission errors
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { setEntitySyncStatus } from '@/lib/store/slices/dataSlice';
import { requestPersistentStorage } from '@/lib/db';
import {
    syncFarmersFromSupabase,
    syncEmployeesFromSupabase,
    syncProductsFromSupabase,
    syncSuppliersFromSupabase,
    syncTransactionsFromSupabase,
} from '@/lib/db';
import { syncFarmerGroupsFromSupabase } from '@/lib/db/services/farmer-groups';
import { syncFarmerRequestsFromSupabase } from '@/lib/db/services/farmer-requests';
import { db } from '@/lib/db/schema';
import { updateFarmersCache } from '@/lib/db/services/farmers';
import { connectivityService } from '@/lib/db/connectivity';
import { SyncContext } from '@/lib/context/SyncContext';

export function InitialSyncProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState<string | null>(
        typeof window !== 'undefined' ? localStorage.getItem('lastInitialSync') : null
    );
    // Use a ref so forceSync always sees the latest isSyncing without stale closure
    const isSyncingRef = useRef(false);

    const performInitialSync = useCallback(async (force: boolean = false) => {
        if (isSyncingRef.current) return;
        if (!isAuthenticated) return;

        try {
            await requestPersistentStorage();

            const lastSync = localStorage.getItem('lastInitialSync');
            const now = Date.now();
            const THIRTY_MINUTES = 30 * 60 * 1000;

            if (force || !lastSync || now - parseInt(lastSync) > THIRTY_MINUTES) {
                isSyncingRef.current = true;
                setIsSyncing(true);

                const syncEntity = async (
                    entity: 'farmers' | 'employees' | 'suppliers' | 'products',
                    syncFn: () => Promise<number>
                ): Promise<void> => {
                    dispatch(setEntitySyncStatus({ entity, status: 'syncing' }));
                    try {
                        const count = await syncFn();
                        dispatch(setEntitySyncStatus({ entity, status: 'done', count }));
                    } catch (err) {
                        dispatch(setEntitySyncStatus({ entity, status: 'error' }));
                        throw err;
                    }
                };

                await Promise.allSettled([
                    syncEntity('farmers', syncFarmersFromSupabase),
                    syncEntity('employees', syncEmployeesFromSupabase),
                    syncEntity('suppliers', syncSuppliersFromSupabase),
                    syncEntity('products', syncProductsFromSupabase),
                    syncTransactionsFromSupabase().catch(console.error),
                ]);

                updateFarmersCache().catch(console.error);

                const nowIso = new Date(now).toISOString();
                localStorage.setItem('lastInitialSync', now.toString());
                setLastSyncAt(nowIso);
            } else {
                const entities = ['farmers', 'employees', 'suppliers', 'products'] as const;
                entities.forEach(entity =>
                    dispatch(setEntitySyncStatus({ entity, status: 'done' }))
                );
            }
        } catch (error) {
            console.error('❌ Failed to initialize sync:', error);
        } finally {
            isSyncingRef.current = false;
            setIsSyncing(false);
        }
    }, [isAuthenticated, dispatch]);

    /** Public API: force a fresh full resync immediately */
    const forceSync = useCallback(async () => {
        await performInitialSync(true);
    }, [performInitialSync]);

    useEffect(() => {
        if (!isAuthenticated) return;

        let isSubscribed = true;
        let unsubscribeConnectivity: (() => void) | undefined;

        performInitialSync(false).then(() => {
            if (isSubscribed) {
                unsubscribeConnectivity = connectivityService.subscribe((isOnline) => {
                    if (isOnline && isSubscribed) {
                        console.log('🌐 Connection restored, triggering adaptive delta sync...');
                        performInitialSync(true);
                    }
                });
            }
        });

        return () => {
            isSubscribed = false;
            if (unsubscribeConnectivity) unsubscribeConnectivity();
        };
    }, [isAuthenticated, performInitialSync]);

    return (
        <SyncContext.Provider value={{ forceSync, isSyncing, lastSyncAt }}>
            {children}
        </SyncContext.Provider>
    );
}
