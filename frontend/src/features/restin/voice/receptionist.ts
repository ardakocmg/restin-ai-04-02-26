import { AiServiceFactory } from '../../../lib/ai/google';

/**
 * 📞 Voice AI Receptionist (Pillar 4)
 * Goal: Zero Missed Calls via RAG-based AI.
 */

interface VoiceContext {
    menuItems: string[];
    policies: string[];
    availability: string;
}

export class VoiceReceptionist {
    /**
     * Handle Incoming Call (Rule 180)
     * Uses the Tenant's Knowledge Base as the "Brain".
     */
    async handleQuery(transcript: string, knowledge: VoiceContext) {
        const prompt = `
      You are a 24/7 AI Receptionist for a premium restaurant.
      Knowledge Base:
      - Menu: ${knowledge.menuItems.join(', ')}
      - Policies: ${knowledge.policies.join(', ')}
      - Availability: ${knowledge.availability}

      Guest Query: "${transcript}"

      Reply naturally, professionally, and keep it brief (max 2 sentences).
    `;

        try {
            const response = await AiServiceFactory.promptWithGrounding(prompt, 'GEMINI_FLASH');
            return {
                response: response,
                tokensUsed: response.length / 4, // Simple estimate for billing
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[Pillar 4] Voice AI failed:', error);
            return {
                response: "I'm sorry, I'm having trouble connecting to our system. Let me transfer you to a human manager.",
                tokensUsed: 0,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export const voiceAI = new VoiceReceptionist();
