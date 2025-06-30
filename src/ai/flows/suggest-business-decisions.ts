'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting business decisions based on data analysis.
 *
 * - suggestBusinessDecisions - A function that triggers the business decision suggestion flow.
 * - SuggestBusinessDecisionsInput - The input type for the suggestBusinessDecisions function.
 * - SuggestBusinessDecisionsOutput - The return type for the suggestBusinessDecisions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  input: {schema: SuggestBusinessDecisionsInputSchema},
  output: {schema: SuggestBusinessDecisionsOutputSchema},
  prompt: `You are an AI assistant that provides business insights and analytics based on the given data.

You will analyze the farmer data and inventory data summaries to suggest business decisions for optimization.

Consider factors such as underperforming regions, resource allocation, and potential areas for improvement.

Farmer Data Summary: {{{farmerDataSummary}}}
Inventory Data Summary: {{{inventoryDataSummary}}}

Based on the analysis of the above data, suggest business decisions that can optimize business operations.
`,
});

const suggestBusinessDecisionsFlow = ai.defineFlow(
  {
    name: 'suggestBusinessDecisionsFlow',
    inputSchema: SuggestBusinessDecisionsInputSchema,
    outputSchema: SuggestBusinessDecisionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
