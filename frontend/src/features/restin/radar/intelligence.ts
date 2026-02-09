import { AiServiceFactory } from '../../../lib/ai/google';

import { logger } from '@/lib/logger';
/**
 * 🔬 Market Radar (Pillar 6)
 * Goal: Competitive Intelligence & Safety.
 */

export class MarketRadar {
    /**
     * Google Grounding Intelligence (Rule 202)
     * Search competitor prices without scraping.
     */
    async searchMarket(city: string, cuisine: string) {
        const prompt = `
      Search for top 3 competitors in ${city} for ${cuisine} cuisine.
      Extract their average price for a main course and their top-selling dish.
      Return JSON: [ { "brand": "...", "avgPrice": "...", "topDish": "..." } ]
    `;

        try {
            const response = await AiServiceFactory.promptWithGrounding(prompt, 'GEMINI_PRO');
            return JSON.parse(response);
        } catch (error) {
            logger.error('[Pillar 6] Market Radar failed:', error);
            return [];
        }
    }

    /**
     * Allergen Guard (Rule 203)
     * Auto-detects allergens in ingredients.
     */
    async detectAllergens(ingredients: string[]) {
        const prompt = `
      List any common allergens in these ingredients: ${ingredients.join(', ')}.
      Return JSON: { "allergens": ["gluten", "nuts", etc.] }
    `;

        try {
            const response = await AiServiceFactory.promptWithGrounding(prompt, 'GEMINI_FLASH');
            return JSON.parse(response);
        } catch (error) {
            return { allergens: [] };
        }
    }
}

export const marketRadar = new MarketRadar();
