'use client';

import { createContext, useContext } from 'react';

export type SyncContextValue = {
    /** Pull: Supabase → local IndexedDB */
    pullFromCloud: () => Promise<void>;
    /** Push: local sync-queue → Supabase */
    pushToCloud: () => Promise<void>;
    /** Whether a pull is currently in progress */
    isPulling: boolean;
    /** Whether a push is currently in progress */
    isPushing: boolean;
    /** ISO string of the last successful pull, or null */
    lastPullAt: string | null;
};

export const SyncContext = createContext<SyncContextValue>({
    pullFromCloud: async () => { },
    pushToCloud: async () => { },
    isPulling: false,
    isPushing: false,
    lastPullAt: null,
});

export function useSyncContext() {
    return useContext(SyncContext);
}
