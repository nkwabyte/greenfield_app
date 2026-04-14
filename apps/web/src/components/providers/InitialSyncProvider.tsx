/**
 * Initial Sync Provider - Performs one-time background sync from Supabase to IndexedDB
 * Exposes pullFromCloud and pushToCloud via SyncContext for manual triggering.
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
import { syncCocoaDistrictsFromSupabase } from '@/lib/supabase/services/cocoa-districts';
import { updateFarmersCache } from '@/lib/db/services/farmers';
import { connectivityService } from '@/lib/db/connectivity';
import { syncService } from '@/lib/db/sync';
import { SyncContext } from '@/lib/context/SyncContext';
import { db } from '@/lib/db/schema';
import { fetchEmployeeAssignedDistricts } from '@/lib/supabase/services/employees';

export function InitialSyncProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
    const user = useSelector((state: RootState) => state.auth.user);

    const [isPulling, setIsPulling] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [lastPullAt, setLastPullAt] = useState<string | null>(
        typeof window !== 'undefined' ? localStorage.getItem('lastInitialSync') : null
    );

    const isPullingRef = useRef(false);
    const isPushingRef = useRef(false);

    // ── Pull: Supabase → local IndexedDB ────────────────────────────────────
    const performPull = useCallback(async (force: boolean = false) => {
        if (isPullingRef.current || !isAuthenticated) return;

        try {
            await requestPersistentStorage();

            const lastSync = localStorage.getItem('lastInitialSync');
            const now = Date.now();
            const THIRTY_MINUTES = 30 * 60 * 1000;

            if (force || !lastSync || now - parseInt(lastSync) > THIRTY_MINUTES) {
                isPullingRef.current = true;
                setIsPulling(true);

                // ── Resolve district scope for field agents ─────────────────
                // Field agents should only sync farmers from their assigned districts
                // to keep the local DB lean and all queries fast. We try the local DB
                // first (from a prior sync); fall back to a single Supabase row fetch
                // if the employee record isn't cached yet.
                let agentDistricts: string[] | undefined;
                if (user?.role === 'Field Agent' && user?.uid) {
                    const localEmployee = await db.employees.get(user.uid).catch(() => null);
                    if (localEmployee?.assignedDistricts?.length) {
                        agentDistricts = localEmployee.assignedDistricts;
                    } else {
                        // Employee not yet in local DB — fetch just this row from Supabase
                        const districts = await fetchEmployeeAssignedDistricts(user.uid);
                        if (districts.length > 0) agentDistricts = districts;
                    }
                }

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
                    // Farmers are scoped to the agent's districts (undefined = all, for admins)
                    syncEntity('farmers', () => syncFarmersFromSupabase(agentDistricts)),
                    syncEntity('employees', syncEmployeesFromSupabase),
                    syncEntity('suppliers', syncSuppliersFromSupabase),
                    syncEntity('products', syncProductsFromSupabase),
                    syncTransactionsFromSupabase().catch(console.error),
                    syncFarmerGroupsFromSupabase().catch(console.error),
                    syncFarmerRequestsFromSupabase().catch(console.error),
                    syncCocoaDistrictsFromSupabase().catch(console.error),
                ]);

                // Build stats cache scoped to agent's districts (or all for admins)
                updateFarmersCache(agentDistricts).catch(console.error);

                const nowIso = new Date(now).toISOString();
                localStorage.setItem('lastInitialSync', now.toString());
                setLastPullAt(nowIso);
            } else {
                // Data is fresh — just mark entities as done
                const entities = ['farmers', 'employees', 'suppliers', 'products'] as const;
                entities.forEach(entity =>
                    dispatch(setEntitySyncStatus({ entity, status: 'done' }))
                );
            }
        } catch (error) {
            console.error('❌ Pull sync failed:', error);
        } finally {
            isPullingRef.current = false;
            setIsPulling(false);
        }
    }, [isAuthenticated, dispatch, user?.uid, user?.role]);

    /** Public API — force pull from Supabase immediately */
    const pullFromCloud = useCallback(async () => {
        await performPull(true);
    }, [performPull]);

    // ── Push: local sync-queue → Supabase ───────────────────────────────────
    const pushToCloud = useCallback(async () => {
        if (isPushingRef.current || !isAuthenticated) return;
        isPushingRef.current = true;
        setIsPushing(true);
        try {
            await syncService.syncAll();
        } catch (error) {
            console.error('❌ Push sync failed:', error);
        } finally {
            isPushingRef.current = false;
            setIsPushing(false);
        }
    }, [isAuthenticated]);

    // ── Auto-sync on mount / reconnect ──────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) return;

        let isSubscribed = true;
        let unsubscribeConnectivity: (() => void) | undefined;

        performPull(false).then(() => {
            if (isSubscribed) {
                unsubscribeConnectivity = connectivityService.subscribe((isOnline) => {
                    if (isOnline && isSubscribed) {
                        console.log('🌐 Connection restored, triggering adaptive delta sync...');
                        performPull(true);
                    }
                });
            }
        });

        return () => {
            isSubscribed = false;
            if (unsubscribeConnectivity) unsubscribeConnectivity();
        };
    }, [isAuthenticated, performPull]);

    return (
        <SyncContext.Provider value={{ pullFromCloud, pushToCloud, isPulling, isPushing, lastPullAt }}>
            {children}
        </SyncContext.Provider>
    );
}
