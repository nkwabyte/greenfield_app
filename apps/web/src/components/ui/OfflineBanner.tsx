'use client';

import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { AlertCircle, WifiOff } from 'lucide-react';

/**
 * Offline Banner - Shows a prominent banner when the app is offline
 */
export function OfflineBanner() {
    const { isOnline, pendingCount } = useSelector(
        (state: RootState) => state.data.sync
    );

    if (isOnline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-2 shadow-md">
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <WifiOff className="h-5 w-5" />
                    <div>
                        <p className="font-semibold">You're offline</p>
                        <p className="text-sm">
                            Changes will sync automatically when you're back online
                            {pendingCount > 0 && ` (${pendingCount} pending)`}
                        </p>
                    </div>
                </div>
                <AlertCircle className="h-5 w-5" />
            </div>
        </div>
    );
}
