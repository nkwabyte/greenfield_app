import { NextRequest, NextResponse } from 'next/server';
import { suggestBusinessDecisions } from '@/ai/flows/suggest-business-decisions';

export async function POST(req: NextRequest) {
    try {
        const input = await req.json();
        const result = await suggestBusinessDecisions(input);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[suggestBusinessDecisions] Error:', error);
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
    }
}
