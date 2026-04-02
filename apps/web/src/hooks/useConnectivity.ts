/**
 * React hook for connectivity status
 */

'use client';

import { useEffect, useState } from 'react';
import { connectivityService } from '@/lib/db/connectivity';

export function useConnectivity() {
    const [isOnline, setIsOnline] = useState(connectivityService.isOnline());

    useEffect(() => {
        // Subscribe to connectivity changes
        const unsubscribe = connectivityService.subscribe((online) => {
            setIsOnline(online);
        });

        // Cleanup on unmount
        return unsubscribe;
    }, []);

    return {
        isOnline,
        isOffline: !isOnline,
    };
}
