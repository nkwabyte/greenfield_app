import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Prefer the new secret key format (sb_secret_*); fall back to legacy service_role JWT.
const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Supabase admin client — uses the secret key (sb_secret_* or legacy service_role JWT).
 * ⚠️  NEVER import this in client components or 'use client' files.
 * Only use in Next.js API routes / Server Actions.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

