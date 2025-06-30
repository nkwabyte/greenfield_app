import { NextRequest, NextResponse } from 'next/server';
import { generateFarmerPersona } from '@/ai/flows/generate-farmer-persona';

export async function POST(req: NextRequest) {
    try {
        const input = await req.json();
        const result = await generateFarmerPersona(input);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[generateFarmerPersona] Error:', error);
        return NextResponse.json({ error: 'Failed to generate farmer persona' }, { status: 500 });
    }
}
