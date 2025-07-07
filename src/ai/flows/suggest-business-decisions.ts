'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting business decisions based on data analysis.
 *
 * - suggestBusinessDecisions - A function that triggers the business decision suggestion flow.
 * - SuggestBusinessDecisionsInput - The input type for the suggestBusinessDecisions function.
 * - SuggestBusinessDecisionsOutput - The return type for the suggestBusinessDecisions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestBusinessDecisionsInputSchema = z.object({
  farmerDataSummary: z
    .string()
    .describe(
      'A summary of the farmer data, including KPIs such as total farmers, counts by region, and gender ratios.'
    ),
  inventoryDataSummary: z
    .string()
    .describe(
      'A summary of the inventory data, including types of resources, quantities, and distribution across regions.'
    ),
});
export type SuggestBusinessDecisionsInput = z.infer<
  typeof SuggestBusinessDecisionsInputSchema
>;

const SuggestBusinessDecisionsOutputSchema = z.object({
  suggestedDecisions: z
    .string()
    .describe(
      'A list of suggested business decisions based on the data analysis, such as identifying underperforming regions or recommending resource allocation strategies.'
    ),
});
export type SuggestBusinessDecisionsOutput = z.infer<
  typeof SuggestBusinessDecisionsOutputSchema
>;

export async function suggestBusinessDecisions(
  input: SuggestBusinessDecisionsInput
): Promise<SuggestBusinessDecisionsOutput> {
  return suggestBusinessDecisionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBusinessDecisionsPrompt',
  input: { schema: SuggestBusinessDecisionsInputSchema },
  output: { schema: SuggestBusinessDecisionsOutputSchema },
  prompt: `
  You are an intelligent strategy advisor for a data-driven agribusiness organization operating across multiple rural regions.

  Your task is to analyze the farmer data and inventory summaries below and suggest practical business decisions to improve operations, impact, and scalability.

  Focus your analysis on the following dimensions:
  - Regional performance (identify high-potential vs. underperforming areas)
  - Resource allocation (prioritize where tools, seeds, training, or agents should go)
  - Gender balance and inclusion strategies
  - Potential for partnerships, training, or tech interventions
  - Short-term actions and long-term strategic opportunities

  Recommendations should be:
  - Prioritized (most urgent/value-driven decisions first)
  - Concise and data-informed
  - Written in business-friendly language
  - Local-context aware (rural West African realities)

  Guidelines:
  - Use full sentences and paragraphs only.
  - Do not use symbols, bullet points, asterisks, or special characters of any kind.
  - Keep the tone professional and insightful.
  - Organize content into clear sections using plain language.

  Here is the data:

  Farmer Data Summary:  
  {{{farmerDataSummary}}}

  Inventory Data Summary:  
  {{{inventoryDataSummary}}}

  Based on the insights from this data, list strategic business decisions that can enhance operational effectiveness and community impact.
  `,
});


const suggestBusinessDecisionsFlow = ai.defineFlow(
  {
    name: 'suggestBusinessDecisionsFlow',
    inputSchema: SuggestBusinessDecisionsInputSchema,
    outputSchema: SuggestBusinessDecisionsOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
