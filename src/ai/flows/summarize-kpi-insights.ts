'use server';

/**
 * @fileOverview A flow that summarizes key performance indicators (KPIs) from the dashboard and provides insights into trends, such as regional performance or gender ratios, to inform business decisions quickly.
 *
 * - summarizeKPIInsights - A function that summarizes key performance indicators (KPIs) and provides insights.
 * - SummarizeKPIInsightsInput - The input type for the summarizeKPIInsights function.
 * - SummarizeKPIInsightsOutput - The return type for the summarizeKPIInsights function.
 */

'use server';

/**
 * @fileOverview A function that summarizes key performance indicators (KPIs) and provides insights using Google Generative AI.
 */

import { createModel, aiModel } from '@/lib/gemini';
import { z } from 'zod';

const SummarizeKPIInsightsInputSchema = z.object({
  totalFarmers: z.number().describe('The total number of farmers.'),
  regionalCounts: z.record(z.string(), z.number()).describe('The number of farmers in each region.'),
  genderRatios: z.object({
    male: z.number().describe('The percentage of male farmers.'),
    female: z.number().describe('The percentage of female farmers.'),
  }).describe('The gender ratio of farmers.'),
  otherKPIs: z.record(z.string(), z.any()).optional().describe('Other key performance indicators.'),
  apiKey: z.string().optional().describe('The Gemini API Key to use.'),
  modelName: z.string().optional().describe('The model to use.'),
});
export type SummarizeKPIInsightsInput = z.infer<typeof SummarizeKPIInsightsInputSchema>;

const SummarizeKPIInsightsOutputSchema = z.object({
  summary: z.string().describe('A summary of the KPIs and insights into trends.'),
  recommendations: z.string().describe('Business decisions suggested for optimization based on the insights.'),
});
export type SummarizeKPIInsightsOutput = z.infer<typeof SummarizeKPIInsightsOutputSchema>;

export async function summarizeKPIInsights(input: SummarizeKPIInsightsInput): Promise<SummarizeKPIInsightsOutput> {
  const parsedInput = SummarizeKPIInsightsInputSchema.parse(input);

  const regionalCountsStr = Object.entries(parsedInput.regionalCounts)
    .map(([region, count]) => `- ${region}: ${count}`)
    .join('\n');

  const otherKPIsStr = parsedInput.otherKPIs
    ? Object.entries(parsedInput.otherKPIs)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n')
    : '';

  const prompt = `
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
  ${parsedInput.totalFarmers}

  Farmers by Region:  
  ${regionalCountsStr}

  Gender Distribution:  
  - Male: ${parsedInput.genderRatios.male}%
  - Female: ${parsedInput.genderRatios.female}%

  ${otherKPIsStr ? `Additional KPIs:\n${otherKPIsStr}` : ''}

  Please begin with a short summary of the dataset, then follow with insights and final recommendations.

  Return the response as a JSON object:
  {
    "summary": "Summary text...",
    "recommendations": "Recommendations text..."
  }
  `;

  try {
    if (!parsedInput.apiKey) throw new Error("API Key required");
    const model = createModel(parsedInput.apiKey, parsedInput.modelName);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const data = JSON.parse(text);
    return SummarizeKPIInsightsOutputSchema.parse(data);
  } catch (error) {
    console.error('Error summarizing KPIs:', error);
    throw new Error('Failed to summarize KPIs');
  }
}

