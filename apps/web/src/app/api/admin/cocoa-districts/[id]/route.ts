import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Required for `output: 'export'` (Electron build). A placeholder param is
// needed because Next.js rejects dynamic routes that return an empty array —
// it treats zero paths the same as missing generateStaticParams entirely.
// The route is never called from the static bundle; Electron communicates
// with Supabase directly via the client SDK.
export function generateStaticParams() {
    return [{ id: '_stub' }];
}

// Prevent Next.js from attempting dynamic rendering during the static export.
export const dynamic = 'force-static';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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
        const { name, is_active } = body;

        if (!name) {
            return NextResponse.json(
                { error: 'District name is required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('cocoa_districts')
            .update({
                name,
                is_active,
            })
            .eq('id', params.id)
            .eq('deleted', false)
            .select();

        if (error) {
            console.error('Failed to update cocoa district:', error);
            return NextResponse.json(
                { error: error.message || 'Failed to update cocoa district' },
                { status: 400 }
            );
        }

        if (!data || data.length === 0) {
            return NextResponse.json(
                { error: 'District not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: data[0] });
    } catch (error: any) {
        console.error('Cocoa district update error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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
            .update({ deleted: true })
            .eq('id', params.id)
            .eq('deleted', false)
            .select();

        if (error) {
            console.error('Failed to delete cocoa district:', error);
            return NextResponse.json(
                { error: error.message || 'Failed to delete cocoa district' },
                { status: 400 }
            );
        }

        if (!data || data.length === 0) {
            return NextResponse.json(
                { error: 'District not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Cocoa district deletion error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}
