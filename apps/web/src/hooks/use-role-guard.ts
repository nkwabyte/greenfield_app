'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';

/**
 * Protects a page by role (and optionally by job title rules).
 *
 * Options:
 *   excludeJobTitles — block these job titles even if their role is allowed.
 *   allowJobTitles   — grant access to users with these job titles regardless
 *                      of whether their role is in allowedRoles. Useful for
 *                      "Admin OR Administrative Member" patterns.
 *
 * Usage:
 *   const { allowed } = useRequireRole(['Admin', 'Employee']);
 *   const { allowed } = useRequireRole(['Admin', 'Employee'], { excludeJobTitles: ['Field Agent'] });
 *   const { allowed } = useRequireRole(['Admin'], { allowJobTitles: ['Administrative Member'] });
 *   if (!allowed) return null; // redirect is in-flight
 */
export function useRequireRole(
    allowedRoles: string[],
    options?: { excludeJobTitles?: string[]; allowJobTitles?: string[] }
): { allowed: boolean } {
    const router = useRouter();
    const user = useSelector((state: RootState) => state.auth.user);
    const isLoading = useSelector((state: RootState) => state.auth.isLoading);

    function isAllowed(u: typeof user): boolean {
        if (!u) return false;
        // Grant access via allowJobTitles regardless of role
        if (options?.allowJobTitles && u.jobTitle && options.allowJobTitles.includes(u.jobTitle)) return true;
        if (!allowedRoles.includes(u.role)) return false;
        if (u.jobTitle && (options?.excludeJobTitles ?? []).includes(u.jobTitle)) return false;
        return true;
    }

    const allowed = !isLoading && isAllowed(user);

    useEffect(() => {
        if (isLoading) return;
        if (!isAllowed(user)) {
            router.replace('/dashboard');
        }
    }, [isLoading, user, router]);

    if (isLoading) return { allowed: true };

    return { allowed };
}
