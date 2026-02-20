/**
 * Auth utility helpers
 * Provides Supabase auth state checks usable from anywhere (non-React)
 */

import { supabase } from '@/lib/supabase/client';

// Cache the session check to avoid async issues in sync contexts
let _cachedUserId: string | null = null;

// Keep the cache warm by listening to auth changes
if (typeof window !== 'undefined') {
    supabase.auth.onAuthStateChange((_event, session) => {
        _cachedUserId = session?.user?.id ?? null;
    });
    // Initialize cache
    supabase.auth.getSession().then(({ data: { session } }) => {
        _cachedUserId = session?.user?.id ?? null;
    });
}

/**
 * Check if a user is currently authenticated with Supabase
 */
export function isAuthenticated(): boolean {
    return !!_cachedUserId;
}

/**
 * Get the current authenticated user's UID
 */
export function getCurrentUserId(): string | null {
    return _cachedUserId;
}
