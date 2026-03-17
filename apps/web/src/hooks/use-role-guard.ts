'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';

/**
 * Protects a page by role (and optionally by job title exclusions).
 * If the authenticated user's role is NOT in allowedRoles, or their jobTitle
 * is in excludeJobTitles, they are redirected to /dashboard.
 *
 * Usage:
 *   const { allowed } = useRequireRole(['Admin', 'Employee']);
 *   const { allowed } = useRequireRole(['Admin', 'Employee'], { excludeJobTitles: ['Field Agent'] });
 *   if (!allowed) return null; // redirect is in-flight
 */
export function useRequireRole(
    allowedRoles: string[],
    options?: { excludeJobTitles?: string[] }
): { allowed: boolean } {
    const router = useRouter();
    const user = useSelector((state: RootState) => state.auth.user);
    const isLoading = useSelector((state: RootState) => state.auth.isLoading);

    const roleAllowed = !isLoading && !!user && allowedRoles.includes(user.role);
    const jobTitleBlocked = roleAllowed && !!user?.jobTitle && (options?.excludeJobTitles ?? []).includes(user.jobTitle);
    const allowed = roleAllowed && !jobTitleBlocked;

    useEffect(() => {
        if (isLoading) return;

        if (!user || !allowedRoles.includes(user.role)) {
            router.replace('/dashboard');
            return;
        }

        if (user.jobTitle && (options?.excludeJobTitles ?? []).includes(user.jobTitle)) {
            router.replace('/dashboard');
        }
    }, [isLoading, user, router]);

    if (isLoading) return { allowed: true };

    return { allowed };
}
