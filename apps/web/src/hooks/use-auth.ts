'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AuthApiError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { setUser, setSupabaseUser, setLoading, SerializableAuthUser } from '@/lib/store/slices/authSlice';

/**
 * Resolve a user profile from the DB, with upsert fallback.
 * If the public.users row doesn't exist we build it from auth metadata.
 */
async function resolveUserProfile(sbUser: any) {
  // 5-second timeout so a slow Supabase response never hangs the app
  const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
  const fetchPromise = supabase
    .from('users')
    .select('*')
    .eq('id', sbUser.id)
    .single()
    .then(({ data }) => data);

  const profile = await Promise.race([fetchPromise, timeoutPromise]);

  if (profile) {
    return {
      uid: sbUser.id,
      email: sbUser.email!,
      name: profile.name,
      role: profile.role,
      status: profile.status || 'Active',
      phone: profile.phone as string | undefined,
      jobTitle: profile.job_title as string | undefined,
      avatarUrl: profile.avatar_url as string | undefined,
      geminiApiKey: profile.gemini_api_key as string | undefined,
      preferredModel: profile.preferred_model as string | undefined,
    };
  }

  // Profile row missing (or Supabase timed out).
  // Prefer the last-known role from localStorage over auth metadata — the DB
  // is the source of truth, and writing a stale metadata role back via upsert
  // would silently overwrite a role promotion that happened while offline.
  const meta = sbUser.user_metadata ?? {};
  const persistedRole = (() => {
    try {
      const stored = localStorage.getItem('greenfield_user_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.uid === sbUser.id && parsed?.role) return parsed.role;
      }
    } catch { /* ignore */ }
    return null;
  })();

  const fallback = {
    uid: sbUser.id,
    email: sbUser.email!,
    name: (meta.name as string) ?? sbUser.email?.split('@')[0] ?? 'User',
    role: (persistedRole ?? (meta.role as string) ?? 'Field Agent') as import('@/lib/types').User['role'],
    status: ((meta.status as string) ?? 'Active') as 'Active' | 'Pending' | 'Disabled',
    geminiApiKey: undefined as string | undefined,
    preferredModel: 'models/gemini-2.5-flash',
  };

  // Background upsert so the row exists for genuinely new users.
  // Do NOT include `role` — the DB trigger sets it from auth metadata, and
  // overwriting it here would silently revert any role promotion.
  supabase.from('users').upsert({
    id: sbUser.id,
    email: fallback.email,
    name: fallback.name,
    status: fallback.status,
    preferred_model: 'models/gemini-2.5-flash',
  }, { onConflict: 'id' }).then(({ error }) => {
    if (error) console.warn('Background profile upsert failed:', error.message);
  });

  return fallback;
}

export const useAuth = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let initialSessionHandled = false; // prevent double resolveUserProfile

    // ── Subsequent auth events (sign in/out, token refresh) ──
    // Register BEFORE initSession so we don't miss events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user) {
            const sbUser = session.user;
            dispatch(setSupabaseUser({
              id: sbUser.id,
              email: sbUser.email ?? null,
              phone: sbUser.phone ?? null,
              emailConfirmedAt: sbUser.email_confirmed_at ?? null,
              lastSignInAt: sbUser.last_sign_in_at ?? null,
            } satisfies SerializableAuthUser));

            // INITIAL_SESSION fires alongside initSession — skip to avoid double fetch
            if (event === 'INITIAL_SESSION') return;

            if (event === 'SIGNED_IN') {
              const resolved = await resolveUserProfile(sbUser);
              dispatch(setUser(resolved));
              dispatch(setLoading(false));
            }
          } else {
            // SIGNED_OUT
            dispatch(setSupabaseUser(null));
            dispatch(setUser(null));
            dispatch(setLoading(false));
          }
        } catch (error) {
          console.error('Error in onAuthStateChange:', error);
          dispatch(setLoading(false));
        }
      }
    );

    // ── Initial session check ──
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const sbUser = session.user;
          dispatch(setSupabaseUser({
            id: sbUser.id,
            email: sbUser.email ?? null,
            phone: sbUser.phone ?? null,
            emailConfirmedAt: sbUser.email_confirmed_at ?? null,
            lastSignInAt: sbUser.last_sign_in_at ?? null,
          } satisfies SerializableAuthUser));
          const resolved = await resolveUserProfile(sbUser);
          dispatch(setUser(resolved));
          initialSessionHandled = true;
        } else {
          dispatch(setSupabaseUser(null));
          dispatch(setUser(null));
          initialSessionHandled = true;
        }
      } catch (error) {
        // If the stored refresh token is stale or missing, Supabase throws AuthApiError
        // on getSession(). Calling signOut() clears the bad token from storage so the
        // user is taken to the login screen rather than being stuck in a broken loop.
        if (
          error instanceof AuthApiError &&
          (error.message.toLowerCase().includes('refresh token') ||
           error.message.toLowerCase().includes('invalid token'))
        ) {
          await supabase.auth.signOut().catch(() => {});
          dispatch(setSupabaseUser(null));
          dispatch(setUser(null));
        } else {
          console.error('Error in useAuth init:', error);
          dispatch(setUser(null));
        }
      } finally {
        dispatch(setLoading(false));
      }
    };

    initSession();

    return () => subscription.unsubscribe();
  }, [dispatch]);
};