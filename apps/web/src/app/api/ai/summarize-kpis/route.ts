import { NextRequest, NextResponse } from 'next/server';
import { summarizeKPIInsights } from '@/ai/flows/summarize-kpi-insights';


import { rateLimit } from '@/lib/rate-limiter';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
    limit: 10,
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
        const result = await summarizeKPIInsights(input);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[summarize-kpis] API Error:', error);
        return NextResponse.json(
            { error: 'Failed to summarize KPIs' },
            { status: 500 }
        );
    }
} 
