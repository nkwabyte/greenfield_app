'use server';

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

    const model = createModel(parsedInput.apiKey, parsedInput.modelName);

    const systemInstruction = `
  You are a helpful AI assistant for the Greenfield Capital CRM.
  You have access to the following summary data about the farmers in the system:
  
  ${parsedInput.context}
  
  Use this context to answer user questions. If the answer is not in the context, say so politely.
  Keep answers concise and helpful.
  `;

    const chat = model.startChat({
        history: [
            {
                role: 'user',
                parts: [{ text: systemInstruction }]
            },
            {
                role: 'model',
                parts: [{ text: "Understood. I have reviewed the farmer data summary and am ready to answer your questions about the CRM data." }]
            },
            ...(parsedInput.history || [])
        ],
    });

    try {
        const result = await chat.sendMessage(parsedInput.message);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error in chat:', error);
        throw new Error('Failed to generate chat response');
    }
}
