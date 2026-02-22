'use client';

import { createContext, useContext } from 'react';

export type SyncContextValue = {
    /** Trigger a full resync from Supabase → local IndexedDB */
    forceSync: () => Promise<void>;
    /** Whether a sync is currently in progress */
    isSyncing: boolean;
    /** ISO string of the last successful sync time, or null */
    lastSyncAt: string | null;
};

export const SyncContext = createContext<SyncContextValue>({
    forceSync: async () => { },
    isSyncing: false,
    lastSyncAt: null,
});

export function useSyncContext() {
    return useContext(SyncContext);
}
