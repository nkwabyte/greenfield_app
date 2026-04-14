import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        const { uid, status, adminId } = await request.json();

        if (!uid || !status) {
            return NextResponse.json(
                { error: 'User ID and Status are required.' },
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

        // If status is Disabled or Terminated, we ban the user to prevent login
        const banDuration = (status === 'Disabled' || status === 'Terminated') ? '876000h' : 'none';
        const userStatus = status === 'Active' ? 'Active' : 'Disabled';
        const empStatus = status === 'Active' ? 'Active' : 'Terminated';

        // 1. Update Auth user metadata & ban duration
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(uid, {
            user_metadata: { status: userStatus },
            ban_duration: banDuration,
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // 2. Update public.users (profile row)
        const { error: usersError } = await supabaseAdmin
            .from('users')
            .update({ status: userStatus })
            .eq('id', uid);

        if (usersError) {
            console.error('Failed to update public.users status:', usersError.message);
        }

        // 3. Update public.employees
        // Note: employees table status enum is usually Active/On Leave/Terminated. Disabled maps to Terminated?
        // Let's just update it directly, assuming schema allows.
        const { error: empError } = await supabaseAdmin
            .from('employees')
            .update({
                status: empStatus,
                updated_at: new Date().toISOString(),
            })
            .eq('id', uid);

        if (empError) {
            console.error('Failed to update public.employees status:', empError.message);
        }

        // Get user email for audit log
        const userEmail = await supabaseAdmin.from('users').select('email').eq('id', uid).single();

        // 4. Log to admin audit log
        if (adminId) {
            const { error: auditError } = await supabaseAdmin
                .from('admin_audit_log')
                .insert({
                    admin_id: adminId,
                    action: 'set_status',
                    target_user_id: uid,
                    target_email: userEmail.data?.email,
                    changes: { new_status: status }
                });

            if (auditError) {
                console.error('Failed to log audit:', auditError.message);
            }
        }

        return NextResponse.json({ success: true, status });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}
