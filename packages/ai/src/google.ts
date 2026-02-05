import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';

/**
 * 🧠 Restin AI Infrastructure (Step 2)
 * Unified Wrapper for Vertex AI (Gemini 1.5)
 */
export class AiServiceFactory {
    private vertexAi: VertexAI;
    private project: string;
    private location: string;

    constructor(project: string, location: string = 'us-central1') {
        this.project = project;
        this.location = location;
        this.vertexAi = new VertexAI({ project, location });
    }

    /**
     * Get a model instance based on selection (Default: Gemini 1.5 Flash)
     */
    public getModel(modelName: 'gemini-1.5-flash' | 'gemini-1.5-pro' = 'gemini-1.5-flash'): GenerativeModel {
        return this.vertexAi.getGenerativeModel({
            model: modelName,
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.4,
                topP: 1,
            },
        });
    }

    /**
     * Simple Prompt Execution
     */
    async prompt(text: string, model: 'gemini-1.5-flash' | 'gemini-1.5-pro' = 'gemini-1.5-flash'): Promise<string> {
        const generativeModel = this.getModel(model);
        const request = {
            contents: [{ role: 'user', parts: [{ text }] }],
        };

        const result = await generativeModel.generateContent(request);
        const response = result.response;
        return response.candidates[0].content.parts[0].text || '';
    }
}

// Global Singleton for easy access (configurable via environment)
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'restin-ai-dev';
export const ai = new AiServiceFactory(PROJECT_ID);
