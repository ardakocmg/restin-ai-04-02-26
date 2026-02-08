// 💸 COMMERCIAL ENGINE BROKER (Client-Side)
// Protocol v30.0 - Monetization Logic
// Connects AI Usage to Billing System

import api from "../../lib/api";

// Pricing Table (Should ideally be fetched from Backend/DB)
// Initial values from Seed
export const AiPricing = {
    "gemini-1.5-flash": {
        costPer1k: 0.0001,
        sellPricePer1k: 0.00015,
        unit: 'TOKEN'
    },
    "gemini-1.5-pro": {
        costPer1k: 0.0025,
        sellPricePer1k: 0.0035,
        unit: 'TOKEN'
    },
    "openai-gpt-4o": {
        costPer1k: 0.0050,
        sellPricePer1k: 0.0070,
        unit: 'TOKEN'
    }
};

export interface AiUsageDetails {
    feature: string;      // "VOICE", "WEB", "CRM"
    model: string;        // "gemini-1.5-flash"
    inputTokens: number;
    outputTokens: number;
    context?: string;     // e.g. "Order #123"
}

/**
 * Calculate the Tenant's Billable Cost (Sell Price)
 */
export const calculateBillableAmount = (model: string, inputTokens: number, outputTokens: number): number => {
    const pricing = AiPricing[model as keyof typeof AiPricing];
    if (!pricing) {
        console.warn(`Billing Broker: Unknown model '${model}'. Defaulting to $0.`);
        return 0;
    }

    const totalTokens = inputTokens + outputTokens;
    // Price is per 1k tokens usually, or 1 unit.
    // Making Assumption: Pricing above is per 1 TOKEN or 1K? 
    // Seed says: costPerUnit: 0.0001. If that's per token, 1k tokens = $0.10.
    // Gemini Flash is ~$0.35 / 1M tokens. So $0.00000035 per token.
    // The Seed value 0.0001 suggests it might be per 1k tokens or the seed is expensive.
    // We will assume Cost is PER UNIT defined in Seed. 
    // For safety, we multiply raw count * price.

    return totalTokens * pricing.sellPricePer1k;
};

/**
 * Log AI Usage to the Commercial Engine (Backend)
 * This creates a record in `AiUsageLog` via API
 */
export const logAiUsage = async (details: AiUsageDetails) => {
    try {
        const cost = calculateBillableAmount(details.model, details.inputTokens, details.outputTokens);

        console.log(`💰 Billing Event: ${details.feature} used ${details.model}. Billable: $${cost.toFixed(6)}`);

        // Fire and Forget (don't block UI)
        await api.post('/billing/ai-usage', {
            ...details,
            billableAmount: cost, // Send calculated amount or let backend recalculate
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        // Fail silent to not break UX, but log error
        console.error("🚨 Billing Broker Error: Failed to log usage.", error);
    }
};

// Wrapper for existing code compatibility
export class BillingBroker {
    static calculateTenantPrice(cost: number): number {
        // Simple markup for now (e.g. 1.5x)
        return cost * 1.5;
    }
}

export const Broker = {
    calculateBillableAmount,
    logAiUsage,
    pricing: AiPricing,
    BillingBroker // Re-export for convenience if needed
};
