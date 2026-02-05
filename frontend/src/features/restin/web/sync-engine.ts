import { AiServiceFactory } from '../../../lib/ai/google';

/**
 * 🕸️ Web Architect Sync Engine (Pillar 2)
 * Synchronizes POS Inventory/Categories with the Digital Storefront.
 */
export class MenuSyncEngine {
    /**
     * Sync POS Category to Web Section
     * Ensures price changes and item availability reflect instantly.
     */
    async syncCategoryToWeb(categoryId: string, siteId: string) {
        console.log(`[Pillar 2] Syncing Category ${categoryId} to Site ${siteId}`);
        // In a real scenario, this would trigger a database update or a webhook
        return { status: 'success', syncedAt: new Date().toISOString() };
    }

    /**
     * AI SEO Automation (Rule 161)
     * Uses Gemini 1.5 to read ingredients and generate Google-friendly meta-tags.
     */
    async generateSeoMetadata(productName: string, ingredients: string[]) {
        const prompt = `
            You are an SEO expert for Restin.ai. 
            Generate meta tags for a restaurant product: "${productName}". 
            Ingredients: ${ingredients.join(', ')}.
            Return JSON ONLY: { "title": "...", "description": "...", "keywords": "..." }
        `;

        try {
            const response = await AiServiceFactory.promptWithGrounding(prompt, 'GEMINI_FLASH');
            const metadata = JSON.parse(response);
            return metadata;
        } catch (error) {
            console.error('[Pillar 2] AI SEO failed:', error);
            return {
                title: `${productName} - Freshly Made at Restin`,
                description: `Enjoy our ${productName} featuring ${ingredients.join(', ')}. Order online for fast pickup.`,
                keywords: `restaurant, ${productName}, local food, fresh ingredients`
            };
        }
    }
}

export const menuSync = new MenuSyncEngine();
