import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

// Default model to use. Can be overridden in individual calls if needed.
// We use the environment variable if set, otherwise fallback to a sane default.
// Note: 'gemini-2.0-flash' was used in Genkit config, sticking to it or 'gemini-1.5-flash' depending on availability.
// The user mentioned gemini-2.5-pro in the prompt, but that might be a future model.
// Safest is to use the env var or a known stable model.
const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export const aiModel = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
        responseMimeType: "application/json"
    }
});
