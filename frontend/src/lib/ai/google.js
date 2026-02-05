import api from '../api';

/**
 * GOOGLE VERTEX AI WRAPPER (ANTIGRAVITY v18.0)
 * 
 * Unifies all AI interactions under the "Google-First" policy.
 * Handles:
 * - Text Generation (Gemini 1.5 Flash/Pro)
 * - Grounding (Search/Maps)
 * - Cost Tracking via Billing Broker
 */

export const GOOGLE_MODELS = {
    FLASH: 'gemini-1.5-flash-001',
    PRO: 'gemini-1.5-pro-001',
    VISION: 'gemini-pro-vision',
    EMBEDDING: 'text-embedding-004'
};

class GoogleAI {
    constructor() {
        this.defaultModel = GOOGLE_MODELS.FLASH;
    }

    /**
     * Complete a prompt using Vertex AI
     * @param {string} prompt - The user prompt
     * @param {object} options - { model, temperature, maxTokens, context }
     */
    async generateText(prompt, options = {}) {
        const model = options.model || this.defaultModel;

        try {
            console.log(`[GoogleAI] Generating with ${model}...`);

            const response = await api.post('/ai/generate', {
                provider: 'GOOGLE',
                model: model,
                prompt: prompt,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 1000,
                options: {
                    use_grounding: options.useGrounding || false,
                    grounding_query: options.groundingQuery || null
                }
            });

            return {
                text: response.data.text,
                usage: response.data.usage, // { prompt_tokens, candidate_tokens }
                citationMetadata: response.data.citationMetadata
            };

        } catch (error) {
            console.error('[GoogleAI] Generation failed:', error);
            throw new Error('AI Service Unavailable');
        }
    }

    /**
     * Generate SEO Tags for a product/menu item
     */
    async generateSEO(itemName, description) {
        const prompt = `Generate Google-friendly SEO meta tags for a restaurant menu item: "${itemName}". Description: "${description}". Return JSON { title, description, keywords }.`;
        return this.generateText(prompt, { temperature: 0.3 });
    }

    /**
     * Analyze Guest Sentiment (CRM Pillar)
     */
    async analyzeSentiment(feedback) {
        const prompt = `Analyze this guest feedback and extract: 1. Sentiment Score (-1 to 1), 2. Key Topics (Food, Service, Ambiance). Feedback: "${feedback}"`;
        return this.generateText(prompt, { model: GOOGLE_MODELS.FLASH, temperature: 0.1 });
    }

    /**
     * Voice AI Response (Voice Pillar)
     */
    async generateVoiceResponse(transcript, context) {
        // High-speed, low-latency requirement
        const prompt = `You are a helpful restaurant receptionist. Context: ${JSON.stringify(context)}. User: "${transcript}". Keep response under 15 words.`;
        return this.generateText(prompt, { model: GOOGLE_MODELS.FLASH, temperature: 0.5 });
    }
}

export const googleAI = new GoogleAI();
export default googleAI;
