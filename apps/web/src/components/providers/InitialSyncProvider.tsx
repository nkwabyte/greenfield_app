/**
 * Initial Sync Provider - Performs one-time background sync from Supabase to IndexedDB
 * This runs in the background without blocking the UI
 * Only syncs when a user is authenticated to avoid permission errors
 */

'use client';

import { useEffect } from 'react';
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
import { db } from '@/lib/db/schema';
import { syncService } from '@/lib/db/sync';
import { connectivityService } from '@/lib/db/connectivity';

export function InitialSyncProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    useEffect(() => {
        // Don't sync if user is not authenticated — Supabase will reject with permission errors
        if (!isAuthenticated) {
            return;
        }

        let isSubscribed = true;
        let unsubscribeConnectivity: (() => void) | undefined;

        const performInitialSync = async (force: boolean = false) => {
            if (!isSubscribed) return;
            try {
                // Request persistent storage to prevent browser from clearing data
                await requestPersistentStorage();

                // ── One-time salary NaN fix (runs once, then never again) ──
                const salaryFixed = localStorage.getItem('migration_salary_nan_fix_v1');
                if (!salaryFixed) {
                    const all = await db.employees.toArray();
                    const toFix = all.filter(e => e.salary === null || e.salary === undefined || Number.isNaN(e.salary));
                    if (toFix.length > 0) {
                        const now = new Date().toISOString();
                        await Promise.all(
                            toFix.map(async (e) => {
                                await db.employees.update(e.id, { salary: 0, updatedAt: now });
                                await syncService.addToQueue('employee', 'update', e.id, { salary: 0 });
                            })
                        );
                        console.log(`✅ Salary migration: fixed ${toFix.length} employee(s) with NaN/null salary → 0`);
                    }
                    localStorage.setItem('migration_salary_nan_fix_v1', 'done');
                }

                // ── One-time: clear stale employee sync-queue items ──────────
                // Employees are now written directly to Supabase by the API route,
                // so any queued 'employee' operations are redundant.
                const queueCleared = localStorage.getItem('migration_clear_employee_queue_v1');
                if (!queueCleared) {
                    const deleted = await db.syncQueue
                        .filter(item => item.entityType === 'employee')
                        .delete();
                    if (deleted > 0) {
                        console.log(`✅ Queue migration: removed ${deleted} stale employee sync item(s)`);
                    }
                    localStorage.setItem('migration_clear_employee_queue_v1', 'done');
                }

                // Check if we need to perform initial sync
                const lastSync = localStorage.getItem('lastInitialSync');
                const now = Date.now();
                const THIRTY_MINUTES = 30 * 60 * 1000;

                // Sync if first time, if forced by reconnection, or data is older than 30 minutes
                if (force || !lastSync || now - parseInt(lastSync) > THIRTY_MINUTES) {
                    // Helper: wraps a sync function with per-entity status dispatching
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

                    // Sync all entities in parallel — each updates its own status independently
                    await Promise.allSettled([
                        syncEntity('farmers', syncFarmersFromSupabase),
                        syncEntity('employees', syncEmployeesFromSupabase),
                        syncEntity('suppliers', syncSuppliersFromSupabase),
                        syncEntity('products', syncProductsFromSupabase),
                        // Transactions don't need a header indicator but still sync
                        syncTransactionsFromSupabase().catch(console.error),
                    ]);

                    localStorage.setItem('lastInitialSync', now.toString());
                } else {
                    // Data is fresh — mark all as done without re-syncing
                    const entities = ['farmers', 'employees', 'suppliers', 'products'] as const;
                    entities.forEach(entity =>
                        dispatch(setEntitySyncStatus({ entity, status: 'done' }))
                    );
                }
            } catch (error) {
                console.error('❌ Failed to initialize sync:', error);
            }
        };

        // Run in background - don't block rendering
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
    }, [isAuthenticated, dispatch]);

    // Always render children immediately - don't block UI
    return <>{children}</>;
}
