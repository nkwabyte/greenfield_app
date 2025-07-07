'use server';

/**
 * @fileOverview A flow that summarizes key performance indicators (KPIs) from the dashboard and provides insights into trends, such as regional performance or gender ratios, to inform business decisions quickly.
 *
 * - summarizeKPIInsights - A function that summarizes key performance indicators (KPIs) and provides insights.
 * - SummarizeKPIInsightsInput - The input type for the summarizeKPIInsights function.
 * - SummarizeKPIInsightsOutput - The return type for the summarizeKPIInsights function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SummarizeKPIInsightsInputSchema = z.object({
  totalFarmers: z.number().describe('The total number of farmers.'),
  regionalCounts: z.record(z.string(), z.number()).describe('The number of farmers in each region.'),
  genderRatios: z.object({
    male: z.number().describe('The percentage of male farmers.'),
    female: z.number().describe('The percentage of female farmers.'),
  }).describe('The gender ratio of farmers.'),
  otherKPIs: z.record(z.string(), z.any()).optional().describe('Other key performance indicators.'),
});
export type SummarizeKPIInsightsInput = z.infer<typeof SummarizeKPIInsightsInputSchema>;

const SummarizeKPIInsightsOutputSchema = z.object({
  summary: z.string().describe('A summary of the KPIs and insights into trends.'),
  recommendations: z.string().describe('Business decisions suggested for optimization based on the insights.'),
});
export type SummarizeKPIInsightsOutput = z.infer<typeof SummarizeKPIInsightsOutputSchema>;

export async function summarizeKPIInsights(input: SummarizeKPIInsightsInput): Promise<SummarizeKPIInsightsOutput> {
  return summarizeKPIInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeKPIInsightsPrompt',
  input: { schema: SummarizeKPIInsightsInputSchema },
  output: { schema: SummarizeKPIInsightsOutputSchema },
  prompt: `
  You are an AI-powered business intelligence assistant for a modern agricultural CRM platform.

  Your role is to analyze the KPIs provided and deliver:
  1. A concise summary of the overall farmer distribution and dynamics.
  2. Key trends or anomalies worth noting (e.g., gender imbalance, regional concentration).
  3. Strategic business recommendations to improve farmer engagement, resource planning, or operational focus.

  Your analysis should:
  - Be written in clear, professional English.
  - Focus on what the data means, not just what it says.
  - Prioritize insights that could drive action, especially in rural/agricultural development contexts.
  - Use bullet points or paragraphs for clarity.

  Guidelines:
  - Use full sentences and paragraphs only.
  - Do not use symbols, bullet points, asterisks, or special characters of any kind.
  - Keep the tone professional and insightful.
  - Organize content into clear sections using plain language.

  Here are the KPIs:

  Total Farmers:  
  {{{totalFarmers}}}

  Farmers by Region:  
  {{#each regionalCounts}}
  - {{@key}}: {{{this}}}
  {{/each}}

  Gender Distribution:  
  - Male: {{{genderRatios.male}}}%
  - Female: {{{genderRatios.female}}}%

  {{#if otherKPIs}}
  Additional KPIs:  
  {{#each otherKPIs}}
  - {{@key}}: {{{this}}}
  {{/each}}
  {{/if}}

  Please begin with a short summary of the dataset, then follow with insights and final recommendations.
  `,
});


const summarizeKPIInsightsFlow = ai.defineFlow(
  {
    name: 'summarizeKPIInsightsFlow',
    inputSchema: SummarizeKPIInsightsInputSchema,
    outputSchema: SummarizeKPIInsightsOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
