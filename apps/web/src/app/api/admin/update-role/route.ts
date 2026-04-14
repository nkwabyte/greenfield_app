import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        const { uid, role, adminId } = await request.json();

        if (!uid || !role) {
            return NextResponse.json(
                { error: 'User ID and Role are required.' },
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

        // 1. Update Auth user metadata
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(uid, {
            user_metadata: { role },
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // 2. Update public.users (profile row)
        // role goes to both role and job_title for simplicity, or we can just update role and job_title
        const { error: usersError } = await supabaseAdmin
            .from('users')
            .update({
                role: role,
                job_title: role,
            })
            .eq('id', uid);

        if (usersError) {
            console.error('Failed to update public.users:', usersError.message);
        }

        // 3. Update public.employees
        const { error: empError } = await supabaseAdmin
            .from('employees')
            .update({
                role: role,
                updated_at: new Date().toISOString(),
            })
            .eq('id', uid);

        if (empError) {
            console.error('Failed to update public.employees:', empError.message);
        }

        // 4. Log to admin audit log
        if (adminId) {
            const { error: auditError } = await supabaseAdmin
                .from('admin_audit_log')
                .insert({
                    admin_id: adminId,
                    action: 'update_role',
                    target_user_id: uid,
                    changes: { new_role: role }
                });

            if (auditError) {
                console.error('Failed to log audit:', auditError.message);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}
