'use client';

import { useState, useEffect, useCallback } from 'react';
import { getActivityLogs, type ActivityLog } from '@/lib/supabase/services/activity-log';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';

interface UseActivityLogOptions {
    limit?: number;
    days?: number;
    /** If set, only fetch logs for this user (Admin only). Pass undefined to use RLS defaults. */
    userId?: string;
    /** Auto-refresh interval in ms. Defaults to 60000 (1 min). Set to 0 to disable. */
    refreshInterval?: number;
}

interface UseActivityLogResult {
    logs: ActivityLog[];
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

export function useActivityLog(options: UseActivityLogOptions = {}): UseActivityLogResult {
    const { limit = 50, days = 30, userId, refreshInterval = 60_000 } = options;

    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    const fetchLogs = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            setError(null);
            const data = await getActivityLogs({ limit, days, userId });
            setLogs(data);
        } catch (err: any) {
            setError(err.message ?? 'Failed to load activity logs.');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, limit, days, userId]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Auto-refresh
    useEffect(() => {
        if (!refreshInterval) return;
        const id = setInterval(fetchLogs, refreshInterval);
        return () => clearInterval(id);
    }, [fetchLogs, refreshInterval]);

    return { logs, isLoading, error, refresh: fetchLogs };
}
