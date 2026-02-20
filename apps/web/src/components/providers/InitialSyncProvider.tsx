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

export function InitialSyncProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    useEffect(() => {
        // Don't sync if user is not authenticated — Supabase will reject with permission errors
        if (!isAuthenticated) {
            return;
        }

        const performInitialSync = async () => {
            try {
                // Request persistent storage to prevent browser from clearing data
                await requestPersistentStorage();

                // Check if we need to perform initial sync
                const lastSync = localStorage.getItem('lastInitialSync');
                const now = Date.now();
                const FIVE_MINUTES = 5 * 60 * 1000;

                // Only sync if first time or data is older than 5 minutes
                if (!lastSync || now - parseInt(lastSync) > FIVE_MINUTES) {
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
        performInitialSync();
    }, [isAuthenticated, dispatch]);

    // Always render children immediately - don't block UI
    return <>{children}</>;
}
