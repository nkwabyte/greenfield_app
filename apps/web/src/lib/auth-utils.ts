/**
 * Auth utility helpers
 * Provides direct Firebase auth state checks usable from anywhere (non-React)
 */

import { auth } from '@/lib/firebase/config';

/**
 * Check if a user is currently authenticated with Firebase
 */
export function isAuthenticated(): boolean {
    return !!auth.currentUser;
}

/**
 * Get the current authenticated user's UID
 */
export function getCurrentUserId(): string | null {
    return auth.currentUser?.uid ?? null;
}
