import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        const { uid, adminId } = await request.json();

        if (!uid) {
            return NextResponse.json(
                { error: 'User ID is required.' },
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

        // Generate a secure temporary password
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let newPassword = '';
        const length = 12;
        for (let i = 0; i < length; i++) {
            newPassword += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        // Update password in Auth
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(uid, {
            password: newPassword,
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // Get user email for audit log
        const userEmail = await supabaseAdmin.from('users').select('email').eq('id', uid).single();

        // Log to admin audit log
        if (adminId) {
            const { error: auditError } = await supabaseAdmin
                .from('admin_audit_log')
                .insert({
                    admin_id: adminId,
                    action: 'reset_password',
                    target_user_id: uid,
                    target_email: userEmail.data?.email,
                    changes: { password_reset: true }
                });

            if (auditError) {
                console.error('Failed to log audit:', auditError.message);
            }
        }

        return NextResponse.json({ password: newPassword });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}
