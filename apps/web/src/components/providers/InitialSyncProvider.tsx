/**
 * Initial Sync Provider - Performs one-time background sync from Firebase to IndexedDB
 * This runs in the background without blocking the UI
 */

'use client';

import { useEffect, useState } from 'react';
import { requestPersistentStorage } from '@/lib/db';
import {
    syncFarmersFromFirebase,
    syncEmployeesFromFirebase,
    syncProductsFromFirebase,
    syncSuppliersFromFirebase,
    syncTransactionsFromFirebase,
} from '@/lib/db';

export function InitialSyncProvider({ children }: { children: React.ReactNode }) {
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        const performInitialSync = async () => {
            try {
                // Request persistent storage to prevent browser from clearing data
                await requestPersistentStorage();

                // Check if we need to perform initial sync
                const lastSync = localStorage.getItem('lastInitialSync');
                const now = Date.now();
                const SIX_HOURS = 6 * 60 * 60 * 1000;

                // Only sync if first time or data is older than 6 hours
                if (!lastSync || now - parseInt(lastSync) > SIX_HOURS) {
                    setSyncing(true);
                    // console.log('🔄 Starting initial background sync from Firebase...');

                    // Sync all entities in parallel (non-blocking)
                    Promise.all([
                        syncFarmersFromFirebase(),
                        syncEmployeesFromFirebase(),
                        syncProductsFromFirebase(),
                        syncSuppliersFromFirebase(),
                        syncTransactionsFromFirebase(),
                    ])
                        .then(([farmersCount, employeesCount, productsCount, suppliersCount, transactionsCount]) => {
                            localStorage.setItem('lastInitialSync', now.toString());
                            // console.log('✅ Initial sync complete:', {
                            //     farmers: farmersCount,
                            //     employees: employeesCount,
                            //     products: productsCount,
                            //     suppliers: suppliersCount,
                            //     transactions: transactionsCount,
                            // });
                            setSyncing(false);
                        })
                        .catch(error => {
                            console.error('❌ Initial sync failed:', error);
                            setSyncing(false);
                        });
                } else {
                    // console.log('✓ Data is fresh, skipping initial sync');
                }
            } catch (error) {
                console.error('❌ Failed to initialize sync:', error);
            }
        };

        // Run in background - don't block rendering
        performInitialSync();
    }, []);

    // Always render children immediately - don't block UI
    return <>{children}</>;
}
