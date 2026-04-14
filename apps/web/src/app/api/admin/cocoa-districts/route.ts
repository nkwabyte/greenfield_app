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

        const { data, error } = await supabaseAdmin
            .from('cocoa_districts')
            .select('*')
            .eq('deleted', false)
            .order('name', { ascending: true });

        if (error) {
            console.error('Failed to fetch cocoa districts:', error);
            return NextResponse.json(
                { error: error.message || 'Failed to fetch cocoa districts' },
                { status: 400 }
            );
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('Cocoa districts fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { name, is_active = true } = body;

        if (!name) {
            return NextResponse.json(
                { error: 'District name is required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('cocoa_districts')
            .insert([
                {
                    name,
                    is_active,
                    deleted: false,
                },
            ])
            .select();

        if (error) {
            console.error('Failed to create cocoa district:', error);
            return NextResponse.json(
                { error: error.message || 'Failed to create cocoa district' },
                { status: 400 }
            );
        }

        return NextResponse.json({ data: data?.[0] }, { status: 201 });
    } catch (error: any) {
        console.error('Cocoa district creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}
