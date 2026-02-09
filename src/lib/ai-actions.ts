'use server';

import { summarizeKPIInsights } from '@/ai/flows/summarize-kpi-insights';
import { suggestBusinessDecisions } from '@/ai/flows/suggest-business-decisions';
import { generateFarmerPersona } from '@/ai/flows/generate-farmer-persona';
import { chatWithContext } from '@/ai/flows/chat-with-context';

export async function runSummarizeKpis(input: Parameters<typeof summarizeKPIInsights>[0]) {
    return await summarizeKPIInsights(input);
}

export async function runSuggestBusinessDecisions(input: Parameters<typeof suggestBusinessDecisions>[0]) {
    return await suggestBusinessDecisions(input);
}

export async function runGenerateFarmerPersona(input: Parameters<typeof generateFarmerPersona>[0]) {
    return await generateFarmerPersona(input);
}

export async function runChatWithContext(input: Parameters<typeof chatWithContext>[0]) {
    return await chatWithContext(input);
}

