import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase browser client — safe to use in client components.
 * Uses the anon (publishable) key with Row Level Security.
 *
 * The client is instantiated lazily on first access so that the missing-env-var
 * check does not fire during Next.js static-export prerendering (SSG), which runs
 * in a Node environment where NEXT_PUBLIC_* values may not be injected.
 */
let _supabase: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          'Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
        );
      }

      _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    return (_supabase as any)[prop];
  },
});
