import { NextRequest, NextResponse } from 'next/server';
import { summarizeKPIInsights } from '@/ai/flows/summarize-kpi-insights';


export async function POST(req: NextRequest) {
    try {
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
