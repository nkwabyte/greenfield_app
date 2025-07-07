'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate a representative farmer persona based on existing CRM data.
 *
 * - generateFarmerPersona - A function that generates a farmer persona.
 * - GenerateFarmerPersonaInput - The input type for the generateFarmerPersona function.
 * - GenerateFarmerPersonaOutput - The return type for the generateFarmerPersona function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateFarmerPersonaInputSchema = z.object({
  farmerDataSummary: z
    .string()
    .describe(
      'A summary of the farmer data, including demographics, farm size, crop types, and challenges.'
    ),
});
export type GenerateFarmerPersonaInput = z.infer<typeof GenerateFarmerPersonaInputSchema>;

const GenerateFarmerPersonaOutputSchema = z.object({
  personaName: z.string().describe('The name of the generated farmer persona.'),
  personaDescription: z
    .string()
    .describe('A detailed description of the generated farmer persona.'),
});
export type GenerateFarmerPersonaOutput = z.infer<typeof GenerateFarmerPersonaOutputSchema>;

export async function generateFarmerPersona(
  input: GenerateFarmerPersonaInput
): Promise<GenerateFarmerPersonaOutput> {
  return generateFarmerPersonaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFarmerPersonaPrompt',
  input: { schema: GenerateFarmerPersonaInputSchema },
  output: { schema: GenerateFarmerPersonaOutputSchema },
  prompt: `
  You are an expert agricultural anthropologist and behavioral strategist.

  Your task is to craft a realistic and insightful farmer persona based on the summary provided. The goal is to help product teams, field officers, and AI systems better understand the typical user of our agriculture CRM system.

  Please include:
  - A unique and plausible name for the persona
  - Demographic background (age, gender, region, education, family situation)
  - Farming experience and primary crops or activities
  - Daily routine and tools used (including any tech or lack of it)
  - Aspirations, challenges, and pain points
  - Communication preferences (how they like to be reached)
  - Behavioral insights (how they make decisions, adopt new practices, etc.)

  Guidelines:
  - Use full sentences and paragraphs only.
  - Do not use symbols, bullet points, asterisks, or special characters of any kind.
  - Keep the tone professional and insightful.
  - Organize content into clear sections using plain language.

  The tone should be vivid, grounded in rural West African context, and written in concise paragraphs.

  Use this data to guide your persona creation:

  Farmer Data Summary:
  {{{farmerDataSummary}}}
  `,
});

const generateFarmerPersonaFlow = ai.defineFlow(
  {
    name: 'generateFarmerPersonaFlow',
    inputSchema: GenerateFarmerPersonaInputSchema,
    outputSchema: GenerateFarmerPersonaOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
