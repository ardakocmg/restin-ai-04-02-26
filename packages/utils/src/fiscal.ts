
/**
 * fiscal.ts - Tax Compliance & Drift Analysis (Rule #17 & #54)
 */

export interface TaxMatchResult {
    status: 'OK' | 'WARNING' | 'BREACH';
    driftCents: number;
    driftPercentage: number;
}

/**
 * Calculates the 'Fiscal Drift' between theoretical tax (from system orders)
 * and actual tax (from fiscal device reports).
 * 
 * Rule #17: Audit Logs & `fiscal_status` flags
 */
export function calculateFiscalDrift(theoreticalTaxCents: number, actualTaxCents: number): TaxMatchResult {
    const drift = Math.abs(theoreticalTaxCents - actualTaxCents);
    const driftPercent = theoreticalTaxCents > 0 ? (drift / theoreticalTaxCents) * 100 : 0;

    let status: TaxMatchResult['status'] = 'OK';

    // Thresholds
    if (driftPercent > 5.0) {
        status = 'BREACH'; // > 5% variance is critical
    } else if (driftPercent > 1.0) {
        status = 'WARNING'; // > 1% needs investigation
    }

    return {
        status,
        driftCents: drift,
        driftPercentage: parseFloat(driftPercent.toFixed(2))
    };
}

/**
 * Calculates VAT for a given amount based on rate.
 * Uses integer math to avoid floating point errors (Rule #4).
 */
export function calculateVAT(amountCents: number, ratePercent: number): number {
    return Math.round(amountCents * (ratePercent / 100));
}
