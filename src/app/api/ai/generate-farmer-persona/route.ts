import { NextRequest, NextResponse } from 'next/server';
import { generateFarmerPersona } from '@/ai/flows/generate-farmer-persona';

import { rateLimit } from '@/lib/rate-limiter';

const limiter = rateLimit({
    interval: 60 * 1000, // 60 seconds
    uniqueTokenPerInterval: 500, // Max 500 users per second
    limit: 10, // 10 requests per minute
});

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
        try {
            await limiter.check(null, 10, ip);
        } catch {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }

        const input = await req.json();
        const result = await generateFarmerPersona(input);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[generateFarmerPersona] Error:', error);
        return NextResponse.json({ error: 'Failed to generate farmer persona' }, { status: 500 });
    }
}
