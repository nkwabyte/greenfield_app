

import { createModel, aiModel } from '@/lib/gemini';
import { z } from 'zod';

const ChatWithContextInputSchema = z.object({
    message: z.string().describe('The user message.'),
    context: z.string().describe('The context (farmer data summary) to prime the chat with.'),
    history: z.array(z.object({
        role: z.enum(['user', 'model']),
        parts: z.array(z.object({ text: z.string() }))
    })).optional().describe('Chat history.'),
    apiKey: z.string().optional().describe('The Gemini API Key to use.'),
    modelName: z.string().optional().describe('The model to use.'),
});

export type ChatWithContextInput = z.infer<typeof ChatWithContextInputSchema>;

export async function chatWithContext(input: ChatWithContextInput) {
    const parsedInput = ChatWithContextInputSchema.parse(input);

    if (!parsedInput.apiKey) {
        throw new Error("Gemini API Key is required");
    }

    const model = createModel(parsedInput.apiKey, parsedInput.modelName, { responseMimeType: 'text/plain' });

    const systemInstruction = `You are a data analyst AI for Greenfield Capital CRM. You have been given a full snapshot of the business data below.

RULES — follow these strictly:
1. Answer ONLY from the data provided. Do not speculate or invent numbers.
2. Be direct. No greetings, no "Great question!", no apologies, no filler phrases.
3. If data is insufficient to answer, say exactly: "The data context does not contain enough information to answer this."
4. Format responses in Markdown. Use tables for comparisons, block-character bar charts (use the block character for filled, a dash for empty) for distributions, bold for key figures.
5. Currency is GHS. Use comma separators for large numbers.
6. When asked for analysis or recommendations, base every point on specific numbers from the data.
7. Do NOT use emojis, emoticons, or decorative special characters anywhere in your response. Use plain text and standard Markdown only.

DATA CONTEXT:
${parsedInput.context}`;


    const chat = model.startChat({
        history: [
            {
                role: 'user',
                parts: [{ text: systemInstruction }]
            },
            {
                role: 'model',
                parts: [{ text: "Data context loaded. Ready." }]
            },
            ...(parsedInput.history || [])
        ],
    });

    try {
        const result = await chat.sendMessage(parsedInput.message);
        const response = await result.response;
        return response.text();
    } catch (error) {
        // console.error('Error in chat:', error);
        throw new Error('Failed to generate chat response');
    }
}
