export interface TaxCalculationResult {
    annual_gross: number;
    annual_net: number;
    annual_tax: number;
    annual_ssc: number;
    monthly_gross: number;
    monthly_net: number;
    monthly_tax: number;
    monthly_ssc: number;
    effective_rate: number;
}

// Malta Tax Rates 2024
export const MALTA_TAX_BRACKETS = [
    { min: 0, max: 9100, rate: 0 },
    { min: 9101, max: 14500, rate: 15 },
    { min: 14501, max: 19500, rate: 25 },
    { min: 19501, max: 60000, rate: 25 },
    { min: 60001, max: Infinity, rate: 35 }
];

export const SSC_RATE = 0.10; // 10% Social Security

export const calculateNetFromGross = (gross: string | number): TaxCalculationResult | null => {
    const annual = typeof gross === 'string' ? parseFloat(gross) : gross;
    if (isNaN(annual) || annual <= 0) return null;

    // Calculate tax
    let tax = 0;
    for (const bracket of MALTA_TAX_BRACKETS) {
        if (annual > bracket.min) {
            const taxableInBracket = Math.min(annual, bracket.max) - bracket.min;
            tax += taxableInBracket * (bracket.rate / 100);
        }
    }

    // Calculate SSC
    const ssc = annual * SSC_RATE;

    const net = annual - tax - ssc;
    const monthlyNet = net / 12;
    const monthlyGross = annual / 12;

    return {
        annual_gross: annual,
        annual_net: net,
        annual_tax: tax,
        annual_ssc: ssc,
        monthly_gross: monthlyGross,
        monthly_net: monthlyNet,
        monthly_tax: tax / 12,
        monthly_ssc: ssc / 12,
        effective_rate: ((tax + ssc) / annual) * 100
    };
};

export const calculateGrossFromNet = (net: string | number): TaxCalculationResult | null => {
    const targetNet = typeof net === 'string' ? parseFloat(net) : net;
    if (isNaN(targetNet) || targetNet <= 0) return null;

    // Binary search for gross salary
    let low = targetNet;
    let high = targetNet * 2;
    let iterations = 0;

    while (iterations < 50 && (high - low) > 0.01) {
        const mid = (low + high) / 2;
        const calc = calculateNetFromGross(mid);

        if (calc && calc.annual_net < targetNet) {
            low = mid;
        } else {
            high = mid;
        }
        iterations++;
    }

    return calculateNetFromGross((low + high) / 2);
};
