import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = ""; // API Key must be provided by user
const genAI = new GoogleGenerativeAI(apiKey);

// Default model to use. Can be overridden in individual calls if needed.
const modelName = "gemini-2.5-flash";

export const aiModel = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
        responseMimeType: "application/json"
    }
});

/**
 * Create a generative model instance with a specific API key
 */
export const createModel = (apiKey: string, modelNameOverride?: string) => {
    const localGenAI = new GoogleGenerativeAI(apiKey);
    return localGenAI.getGenerativeModel({
        model: modelNameOverride || modelName,
        generationConfig: {
            responseMimeType: "application/json"
        }
    });
};

