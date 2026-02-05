/**
 * BILLING BROKER (PILLAR 0)
 * 
 * Calculates costs for AI usage and storage.
 * Enforces limits based on Subscription Plan.
 */

export const PRICING_TABLE = {
    // Wholesale Costs (Our Cost)
    COSTS: {
        'gemini-1.5-flash': 0.0001, // per 1k input
        'gemini-1.5-pro': 0.0025,
        'storage_gb_month': 0.02
    },

    // Retail Prices (Tenant Price)
    RETAIL: {
        'gemini-1.5-flash': 0.0003, // 3x Markup
        'gemini-1.5-pro': 0.0050, // 2x Markup
        'storage_gb_month': 0.10 // 5x Markup
    }
};

class BillingBroker {

    /**
     * Calculate cost for AI Request
     * @param {string} model 
     * @param {object} usage { prompt_tokens, candidate_tokens }
     */
    calculateRequestCost(model, usage) {
        const totalTokens = (usage.prompt_tokens || 0) + (usage.candidate_tokens || 0);
        const costPer1k = PRICING_TABLE.RETAIL[model] || PRICING_TABLE.RETAIL['gemini-1.5-flash'];

        return (totalTokens / 1000) * costPer1k;
    }

    /**
     * Estimate Storage Cost
     * @param {number} sizeMB 
     */
    estimateStorageCost(sizeMB) {
        const sizeGB = sizeMB / 1024;
        return sizeGB * PRICING_TABLE.RETAIL['storage_gb_month'];
    }

    /**
     * Create Usage Record (to be sent to backend)
     */
    createUsageRecord(tenantId, type, quantity, meta = {}) {
        return {
            tenantId,
            type, // 'AI_TOKEN', 'STORAGE_GB'
            quantity,
            timestamp: new Date().toISOString(),
            meta
        };
    }
}

export const billingBroker = new BillingBroker();
export default billingBroker;
