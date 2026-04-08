import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        const { uid } = await request.json();

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

        return NextResponse.json({ password: newPassword });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}
