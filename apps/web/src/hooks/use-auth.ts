'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from '@/lib/supabase/client';
import { setUser, setSupabaseUser, setLoading, SerializableAuthUser } from '@/lib/store/slices/authSlice';

/**
 * Resolve a user profile from the DB, with upsert fallback.
 * If the public.users row doesn't exist (e.g. user signed up before the trigger was added),
 * we build it from auth metadata and upsert it in the background.
 */
async function resolveUserProfile(sbUser: any) {
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', sbUser.id)
    .single();

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

  // Profile row missing — fall back to auth metadata
  const meta = sbUser.user_metadata ?? {};
  const fallback = {
    uid: sbUser.id,
    email: sbUser.email!,
    name: (meta.name as string) ?? sbUser.email?.split('@')[0] ?? 'User',
    role: ((meta.role as string) ?? 'Employee') as 'Admin' | 'Employee',
    status: ((meta.status as string) ?? 'Active') as 'Active' | 'Pending' | 'Disabled',
    geminiApiKey: undefined as string | undefined,
    preferredModel: undefined as string | undefined,
  };

  // Background upsert so the row exists on next login
  supabase.from('users').upsert({
    id: sbUser.id,
    email: fallback.email,
    name: fallback.name,
    role: fallback.role,
    status: fallback.status,
  }, { onConflict: 'id' }).then(({ error }) => {
    if (error) console.warn('Background profile upsert failed:', error.message);
  });

  return fallback;
}

export const useAuth = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // ── Initial session check (shows loading spinner while we fetch) ──
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
        } else {
          dispatch(setSupabaseUser(null));
          dispatch(setUser(null));
        }
      } catch (error) {
        console.error('Error in useAuth init:', error);
        dispatch(setUser(null));
      } finally {
        // Only the initial check controls isLoading.
        // onAuthStateChange below does NOT touch isLoading to avoid
        // re-triggering the full-screen spinner on TOKEN_REFRESHED etc.
        dispatch(setLoading(false));
      }
    };

    initSession();

    // ── Subsequent auth events (sign in/out, token refresh) ──
    // We do NOT set isLoading here — that would cause the spinner loop.
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

            // On SIGNED_IN we need profile to update Redux → triggers redirect
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
              const resolved = await resolveUserProfile(sbUser);
              dispatch(setUser(resolved));
            }
          } else {
            // SIGNED_OUT
            dispatch(setSupabaseUser(null));
            dispatch(setUser(null));
          }
        } catch (error) {
          console.error('Error in onAuthStateChange:', error);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [dispatch]);
};