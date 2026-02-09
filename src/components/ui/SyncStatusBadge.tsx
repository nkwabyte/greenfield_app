/**
 * Sync Status Badge - Shows online/offline status, pending sync count, and manual sync button
 */

'use client';

import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { syncService } from '@/lib/db/sync';
import { useState } from 'react';

export function SyncStatusBadge() {
    const { isOnline, pendingCount, isSyncing } = useSelector(
        (state: RootState) => state.data.sync
    );
    const [isManualSyncing, setIsManualSyncing] = useState(false);

    const handleManualSync = async () => {
        if (!isOnline || isSyncing || isManualSyncing) return;

        setIsManualSyncing(true);
        try {
            await syncService.syncAll();
        } catch (error) {
            console.error('Manual sync failed:', error);
        } finally {
            setIsManualSyncing(false);
        }
    };

    return (
        <div className="flex items-center gap-3 text-sm">
            {/* Online/Offline indicator */}
            {isOnline ? (
                <span className="flex items-center gap-1.5 text-green-600">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                    </span>
                    <span className="font-medium">Online</span>
                </span>
            ) : (
                <span className="flex items-center gap-1.5 text-red-600">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    <span className="font-medium">Offline</span>
                </span>
            )}

            {/* Pending sync count */}
            {pendingCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                    {isSyncing && (
                        <svg
                            className="mr-1 h-3 w-3 animate-spin text-yellow-600"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            ></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                    )}
                    {pendingCount} pending
                </span>
            )}

            {/* Manual sync button */}
            {isOnline && pendingCount > 0 && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleManualSync}
                    disabled={isSyncing || isManualSyncing}
                    className="h-7 px-2"
                    title="Sync now"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${(isSyncing || isManualSyncing) ? 'animate-spin' : ''}`} />
                </Button>
            )}
        </div>
    );
}
