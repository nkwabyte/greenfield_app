'use server';

import { summarizeKPIInsights } from '@/ai/flows/summarize-kpi-insights';
import { suggestBusinessDecisions } from '@/ai/flows/suggest-business-decisions';
import { generateFarmerPersona } from '@/ai/flows/generate-farmer-persona';

export async function runSummarizeKpis(input: Parameters<typeof summarizeKPIInsights>[0]) {
    return await summarizeKPIInsights(input);
}

export async function runSuggestBusinessDecisions(input: Parameters<typeof suggestBusinessDecisions>[0]) {
    return await suggestBusinessDecisions(input);
}

export async function runGenerateFarmerPersona(input: Parameters<typeof generateFarmerPersona>[0]) {
    return await generateFarmerPersona(input);
}
