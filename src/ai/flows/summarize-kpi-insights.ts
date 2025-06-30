'use server';

/**
 * @fileOverview A flow that summarizes key performance indicators (KPIs) from the dashboard and provides insights into trends, such as regional performance or gender ratios, to inform business decisions quickly.
 *
 * - summarizeKPIInsights - A function that summarizes key performance indicators (KPIs) and provides insights.
 * - SummarizeKPIInsightsInput - The input type for the summarizeKPIInsights function.
 * - SummarizeKPIInsightsOutput - The return type for the summarizeKPIInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  input: {schema: SummarizeKPIInsightsInputSchema},
  output: {schema: SummarizeKPIInsightsOutputSchema},
  prompt: `You are an AI assistant providing business insights and analytics based on key performance indicators (KPIs).  Provide a concise summary of the KPIs, highlight any significant trends (e.g., regional performance, gender ratios), and suggest business decisions for optimization.

Here are the KPIs:

Total Farmers: {{{totalFarmers}}}
Regional Counts: {{#each regionalCounts}}{{{@key}}}: {{{this}}}
{{/each}}
Gender Ratios: Male: {{{genderRatios.male}}}, Female: {{{genderRatios.female}}}
{{#if otherKPIs}}
Other KPIs: {{#each otherKPIs}}{{{@key}}}: {{{this}}}
{{/each}}
{{/if}}`,
});

const summarizeKPIInsightsFlow = ai.defineFlow(
  {
    name: 'summarizeKPIInsightsFlow',
    inputSchema: SummarizeKPIInsightsInputSchema,
    outputSchema: SummarizeKPIInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
