// app/api/ai/summarize-kpis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { summarizeKPIInsights } from '@/ai/flows/summarize-kpi-insights';

export async function POST(req: NextRequest) {
    const input = await req.json();
    const result = await summarizeKPIInsights(input);
    return NextResponse.json(result);
}
