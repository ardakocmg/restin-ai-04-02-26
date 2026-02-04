import { PrismaClient } from '@prisma/client';
import { isBefore, isAfter, isEqual } from 'date-fns';

// Rule #54: RegTech Engine (Date-based effectiveness)

export class TaxService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Calculates the effective tax rate for a product at a specific point in time.
     * Handles legislative changes (e.g. VAT change on Jan 1st).
     */
    async getEffectiveTaxRate(productId: string, date: Date = new Date()): Promise<number> {
        // 1. Get Product's Tax Category (e.g. "ALCOHOL", "FOOD", "MERCH")
        const product = await this.prisma.menuItem.findUnique({
            where: { id: productId },
            select: { taxCategory: true } // Assuming schema has this
        });

        if (!product || !product.taxCategory) return 0; // Default or Error

        // 2. Fetch all rules for this category
        const rules = await this.prisma.taxRule.findMany({
            where: {
                category: product.taxCategory,
                // Valid for this region/org? Assuming Org Context is handled or Global Rules
            },
            orderBy: { effectiveDate: 'desc' }
        });

        // 3. Find the most recent rule applicable to the date
        // Rules are ordered most recent first.
        // We want the first rule where effectiveDate <= date.

        const applicableRule = rules.find(rule =>
            isBefore(rule.effectiveDate, date) || isEqual(rule.effectiveDate, date)
        );

        return applicableRule ? applicableRule.ratePercent : 0;
    }

    /**
     * Batch calculation for an entire order (optimization).
     */
    async calculateOrderTax(items: { productId: string; priceCents: number }[], date: Date = new Date()) {
        let totalTax = 0;

        // Naive loop (Optimization: cache rates by category)
        for (const item of items) {
            const rate = await this.getEffectiveTaxRate(item.productId, date);
            const taxAmount = Math.round(item.priceCents * (rate / 100)); // Rounding Rules?
            totalTax += taxAmount;
        }

        return totalTax;
    }
}
