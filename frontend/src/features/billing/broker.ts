/**
 * 💸 Restin Billing Broker (Pillar 0)
 * Handles usage tracking, markup calculation, and SaaS gating logic.
 */
export class BillingBroker {
    /**
     * Calculate Tenant Price with Markup
     * Formula: (WholesaleCost * (1 + MarkupPercent))
     */
    static calculateTenantPrice(wholesaleCost: number, markupPercent: number = 0.20): number {
        return wholesaleCost * (1 + markupPercent);
    }

    /**
     * Calculate Total Monthly Invoice
     * Sum(Subscription + ModuleFees + (AiUsage * Markup) + (Storage * Rate))
     */
    static calculateTotalInvoice(data: {
        subscriptionBase: number;
        moduleFees?: number;
        aiUsageCost?: number;
        storageCost?: number;
        markup?: number;
    }): number {
        const {
            subscriptionBase,
            moduleFees = 0,
            aiUsageCost = 0,
            storageCost = 0,
            markup = 0.20
        } = data;

        const totalAi = this.calculateTenantPrice(aiUsageCost, markup);
        return subscriptionBase + moduleFees + totalAi + storageCost;
    }

    /**
     * Check if a feature is locked based on Subscription Plan
     */
    static isFeatureLocked(activeFeatures: string[], requiredFeature: string): boolean {
        return !activeFeatures.includes(requiredFeature);
    }
}

export const billing = new BillingBroker();
