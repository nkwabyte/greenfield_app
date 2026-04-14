import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
    try {
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

        const { data, error } = await supabaseAdmin
            .from('admin_audit_log')
            .select(`
                id,
                admin_id,
                action,
                target_user_id,
                target_email,
                changes,
                created_at
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Failed to fetch audit logs:', error);
            return NextResponse.json(
                { error: error.message || 'Failed to fetch audit logs' },
                { status: 400 }
            );
        }

        // Fetch admin details for each log entry
        const logsWithAdminInfo = await Promise.all(
            (data || []).map(async (log: any) => {
                const { data: admin } = await supabaseAdmin
                    .from('users')
                    .select('email')
                    .eq('id', log.admin_id)
                    .single();

                return {
                    ...log,
                    admin_name: admin?.email?.split('@')[0] || 'Unknown',
                };
            })
        );

        return NextResponse.json({ data: logsWithAdminInfo });
    } catch (error: any) {
        console.error('Audit log fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}
