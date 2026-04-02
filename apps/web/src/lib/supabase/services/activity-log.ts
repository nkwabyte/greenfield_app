/**
 * Activity Log Service
 * Logs user actions to Supabase. Logs are automatically deleted after 30 days.
 * All calls are fire-and-forget — failures are silent so offline-first is never blocked.
 */

import { supabase } from '@/lib/supabase/client';

export type ActivityAction = 'create' | 'update' | 'delete';
export type ActivityEntityType =
    | 'farmer'
    | 'employee'
    | 'product'
    | 'supplier'
    | 'transaction'
    | 'farmer_group'
    | 'farmer_request';

export interface ActivityLog {
    id: string;
    user_id: string;
    user_name: string;
    user_role: string;
    action: ActivityAction;
    entity_type: ActivityEntityType;
    entity_id: string;
    entity_name: string;
    metadata?: Record<string, any>;
    created_at: string;
}

export interface LogActivityParams {
    action: ActivityAction;
    entityType: ActivityEntityType;
    entityId: string;
    entityName: string;
    metadata?: Record<string, any>;
}

/**
 * Get the current user's profile from the session.
 * Returns null if not authenticated.
 */
async function getCurrentUserProfile(): Promise<{ id: string; name: string; role: string } | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data: profile } = await supabase
            .from('users')
            .select('name, role')
            .eq('id', session.user.id)
            .single();

        if (!profile) return null;

        return {
            id: session.user.id,
            name: profile.name,
            role: profile.role,
        };
    } catch {
        return null;
    }
}

/**
 * Log a user activity to Supabase.
 * This is fire-and-forget: it will NOT throw. If offline or auth fails, the log is silently skipped.
 *
 * Usage (call after a successful local write, no await needed):
 *   logActivity({ action: 'create', entityType: 'farmer', entityId: id, entityName: farmer.name });
 */
export function logActivity(params: LogActivityParams): void {
    // Non-blocking: run in background
    (async () => {
        try {
            const user = await getCurrentUserProfile();
            if (!user) return; // Not authenticated — skip silently

            await supabase.from('activity_logs').insert({
                user_id: user.id,
                user_name: user.name,
                user_role: user.role,
                action: params.action,
                entity_type: params.entityType,
                entity_id: params.entityId,
                entity_name: params.entityName,
                metadata: params.metadata ?? null,
            });
        } catch {
            // Silent fail — activity logging should never affect core operations
        }
    })();
}

/**
 * Fetch activity logs from Supabase.
 * Admins see all logs. Employees only see their own (enforced by RLS).
 *
 * @param limit  Max records to return (default 50)
 * @param days   Filter to last N days (default 30)
 * @param userId Optional filter to a specific user (Admin only)
 */
export async function getActivityLogs(options: {
    limit?: number;
    days?: number;
    userId?: string;
} = {}): Promise<ActivityLog[]> {
    const { limit = 50, days = 30, userId } = options;

    const since = new Date();
    since.setDate(since.getDate() - days);

    let query = supabase
        .from('activity_logs')
        .select('*')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

    if (userId) {
        query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []) as ActivityLog[];
}

/**
 * Trigger server-side cleanup of logs older than 30 days.
 * Call this on app startup (Free tier fallback for pg_cron).
 * Throttled to run at most once per day via localStorage.
 */
export async function triggerActivityLogCleanup(): Promise<void> {
    if (typeof window === 'undefined') return;

    const CLEANUP_KEY = 'activity_log_last_cleanup';
    const last = localStorage.getItem(CLEANUP_KEY);
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (last && Date.now() - parseInt(last) < oneDayMs) {
        return; // Already ran today
    }

    try {
        await supabase.rpc('cleanup_old_activity_logs');
        localStorage.setItem(CLEANUP_KEY, Date.now().toString());
    } catch {
        // Silent fail — cleanup is best-effort
    }
}
