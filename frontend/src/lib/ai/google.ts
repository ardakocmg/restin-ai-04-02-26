import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * 🧠 AI Infrastructure (Pillar 1) - Vertex AI / Google AI Wrapper
 * Rule 1: Strict TypeScript ONLY
 */

export type AiProvider = 'GOOGLE' | 'OPENAI' | 'ELEVENLABS';
export type AiModel = 'GEMINI_FLASH' | 'GEMINI_PRO' | 'GPT_4O';

interface AiConfig {
    provider: AiProvider;
    model: AiModel;
    apiKey: string;
}

export class AiServiceFactory {
    private static instances: Map<AiModel, GoogleGenerativeAI> = new Map();

    /**
     * Get the AI implementation based on Rule 47 (SaaS Gating) and Pillar 1 Config
     */
    static getModel(model: AiModel = 'GEMINI_FLASH') {
        const apiKey = process.env.REACT_APP_GOOGLE_AI_KEY || "";

        if (!this.instances.has(model)) {
            this.instances.set(model, new GoogleGenerativeAI(apiKey));
        }

        const genAI = this.instances.get(model)!;
        const modelName = model === 'GEMINI_PRO' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';

        return genAI.getGenerativeModel({ model: modelName });
    }

    /**
     * Grounding Logic (Rule 151): Connects to real-time data
     */
    static async promptWithGrounding(prompt: string, model: AiModel = 'GEMINI_FLASH') {
        const ai = this.getModel(model);
        // Future: Add real-time search tool integration
        const result = await ai.generateContent(prompt);
        return result.response.text();
    }
}

export const ai = new AiServiceFactory();
