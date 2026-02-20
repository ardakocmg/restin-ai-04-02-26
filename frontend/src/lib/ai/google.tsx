import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from '../logger';

// 🏗️ ANTIGRAVITY AI ARCHITECTURE (Protocol v30.0)
// Primary Brain: Google Vertex AI (via Generative AI SDK)

// Security Note: In production, API calls should be proxied via Backend to hide API Key.
// For Prototype/Starters, we use env var.
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";

if (!API_KEY) {
    logger.warn("Vertex AI: No API Key found. AI features will be disabled.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export const AiModels = {
    FLASH: "gemini-2.0-flash",        // Free tier — fast, high-throughput
    STANDARD: "gemini-2.5-flash",     // Standard — best reasoning (free tier available)
    PRO: "gemini-2.5-pro",            // Premium — deep analysis (free tier: 5 RPM)
    VISION: "gemini-2.0-flash",       // Flash supports vision natively
    NEXT_GEN: "gemini-3-flash",       // Latest gen (preview)
};

export interface GenerationOptions {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
}

/**
 * Generate Text using Gemini Models.
 * Tracks usage for Billing Broker.
 */
export const generateText = async (
    prompt: string,
    modelName: string = AiModels.FLASH,
    options: GenerationOptions = {}
) => {
    try {
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: options.temperature || 0.7,
                maxOutputTokens: options.maxTokens || 1000,
                topP: options.topP || 0.95,
            }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        logger.error(`Vertex AI Error (${modelName})`, { error });
        throw error;
    }
};

/**
 * Identify Image Content (Reality-First Protocol)
 */
export const identifyImage = async (
    file: File,
    prompt: string = "Describe this image in detail for inventory purposes."
) => {
    try {
        const model = genAI.getGenerativeModel({ model: AiModels.FLASH });

        // Convert File to Base64
        const base64Data = await fileToGenerativePart(file);

        const result = await model.generateContent([prompt, base64Data]);
        return result.response.text();
    } catch (error: any) {
        logger.error("Vertex Image Analysis Error", { error });
        throw error;
    }
};

// Helper
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string, mimeType: string } }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve({
                inlineData: {
                    data: base64String,
                    mimeType: file.type
                }
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Factory for existing code compatibility (Pillars 3, 4, 6 usage)
export class AiServiceFactory {
    static async promptWithGrounding(prompt: string, modelType: string = 'GEMINI_FLASH'): Promise<string> {
        // Map legacy string to real model name
        const modelMap: Record<string, string> = {
            'GEMINI_FLASH': AiModels.FLASH,         // gemini-2.0-flash (free)
            'GEMINI_STANDARD': AiModels.STANDARD,   // gemini-2.5-flash
            'GEMINI_PRO': AiModels.PRO,             // gemini-2.5-pro
            'GEMINI_NEXT': AiModels.NEXT_GEN,       // gemini-3-flash
        };
        const modelName = modelMap[modelType] || AiModels.FLASH;
        return generateText(prompt, modelName);
    }
}
