import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-static';

/**
 * POST /api/admin/create-employee
 *
 * Creates a new employee:
 *  1. Creates Supabase Auth user (email auto-confirmed)
 *  2. Upserts into public.users so the profile exists immediately on first login
 *  3. Upserts into public.employees so the record is available right away
 *
 * Uses service_role key — server-only, never exposed to the browser.
 */
export async function POST(request: NextRequest) {
    try {
        const { email, password, name, role = 'Field Agent', salary = 0 } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required.' },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json(
                { error: 'Server configuration error.' },
                { status: 500 }
            );
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // ── 1. Create Auth user ──────────────────────────────────────────────
        const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,   // employee doesn't need to confirm
            user_metadata: {
                name: name || email.split('@')[0],   // set display name in auth metadata
                role: role,   // job title (e.g. 'Field Agent') — must match users_role_check constraint
                status: 'Active',
            },
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        const uid = data.user.id;
        const displayName = name || email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        const now = new Date().toISOString();

        // ── 2. Upsert into public.users (profile row) ────────────────────────
        // The Postgres trigger may already do this, but we upsert to guarantee
        // the name/role/status are correct even if the trigger fires first.
        // job_title stores the employee's specific role (Manager, Field Agent, etc.)
        // so the app can enforce fine-grained access control.
        const { error: usersError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: uid,
                name: displayName,
                email,
                role: role,   // job title (e.g. 'Field Agent') — must match users_role_check
                status: 'Active',
                job_title: role,
            }, { onConflict: 'id' });

        if (usersError) {
            console.error('Failed to upsert public.users:', usersError.message);
            // Non-fatal — auth user exists, profile can be fixed on next sync
        }

        // ── 3. Upsert into public.employees ──────────────────────────────────
        const { error: empError } = await supabaseAdmin
            .from('employees')
            .upsert({
                id: uid,
                name: displayName,
                email,
                role,
                salary,
                start_date: now,
                status: 'Active',
                is_verified: true,
                created_at: now,
                updated_at: now,
            }, { onConflict: 'id' });

        if (empError) {
            console.error('Failed to upsert public.employees:', empError.message);
            // Non-fatal — will sync later from queue
        }

        return NextResponse.json({ uid, name: displayName });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}
