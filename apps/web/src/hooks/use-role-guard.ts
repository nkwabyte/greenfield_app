'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';

/**
 * Protects a page by role.
 * If the authenticated user's role is NOT in allowedRoles, they are
 * immediately redirected to /dashboard and the hook returns { allowed: false }.
 *
 * Usage:
 *   const { allowed } = useRequireRole(['Admin']);
 *   if (!allowed) return null; // redirect is in-flight
 */
export function useRequireRole(allowedRoles: string[]): { allowed: boolean } {
    const router = useRouter();
    const user = useSelector((state: RootState) => state.auth.user);
    const isLoading = useSelector((state: RootState) => state.auth.isLoading);

    const allowed = !isLoading && !!user && allowedRoles.includes(user.role);

    useEffect(() => {
        // Wait for auth to resolve before deciding
        if (isLoading) return;

        if (!user || !allowedRoles.includes(user.role)) {
            router.replace('/dashboard');
        }
    }, [isLoading, user, router]);

    // Allow if auth is still loading (avoid flash redirect on initial load)
    if (isLoading) return { allowed: true };

    return { allowed };
}
