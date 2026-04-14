import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-static';

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

        // Get total employees (excluding deleted)
        const { count: totalEmployees, error: employeesError } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('deleted', false);

        if (employeesError) {
            console.error('Failed to fetch total employees:', employeesError);
            return NextResponse.json(
                { error: 'Failed to fetch employee count' },
                { status: 400 }
            );
        }

        // Get admin users count (excluding deleted)
        const { count: adminUsers, error: adminsError } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'Admin')
            .eq('deleted', false);

        if (adminsError) {
            console.error('Failed to fetch admin users:', adminsError);
            return NextResponse.json(
                { error: 'Failed to fetch admin count' },
                { status: 400 }
            );
        }

        // Get recent actions from last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: recentActions, error: actionsError } = await supabaseAdmin
            .from('admin_audit_log')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', twentyFourHoursAgo);

        if (actionsError) {
            console.error('Failed to fetch recent actions:', actionsError);
            return NextResponse.json(
                { error: 'Failed to fetch recent actions count' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            data: {
                totalEmployees: totalEmployees || 0,
                adminUsers: adminUsers || 0,
                recentActions: recentActions || 0,
            },
        });
    } catch (error: any) {
        console.error('Stats fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}
