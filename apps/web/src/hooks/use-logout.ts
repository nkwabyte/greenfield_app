'use client';

import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { supabase } from '@/lib/supabase/client';
import { logout as logoutAction } from '@/lib/store/slices/authSlice';

/**
 * Returns a handleLogout function that:
 * 1. Signs out from Supabase (clears the server session & refresh token)
 * 2. Dispatches the Redux logout action (clears local state & localStorage)
 * 3. Redirects to the login/home page
 */
export function useLogout() {
    const dispatch = useDispatch();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch {
            // Even if signOut fails (e.g. offline), clear local state
        } finally {
            dispatch(logoutAction());
            router.push('/');
        }
    };

    return handleLogout;
}
