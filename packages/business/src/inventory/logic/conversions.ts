// Rule #60: Precise Math (4 decimals cost, 3 decimals qty)
// Standard Conversions to "Base" (grams, ml)

const CONVERSION_TABLE: Record<string, number> = {
    'kg': 1000,
    'g': 1,
    'mg': 0.001,
    'l': 1000,
    'ml': 1,
    'cl': 10,
    'oz': 28.3495,
    'lb': 453.592,
};

/**
 * Converts a quantity from one unit to another.
 * Handles dimensional analysis (Weight <-> Volume requires density)
 * For MVP, we assume Weight->Weight, Volume->Volume.
 */
export const convertUnit = (value: number, from: string, to: string, density: number = 1): number => {
    if (from === to) return value;

    const fromFactor = CONVERSION_TABLE[from.toLowerCase()];
    const toFactor = CONVERSION_TABLE[to.toLowerCase()];

    if (!fromFactor || !toFactor) {
        // Handle Abstract Units (e.g. "Box" -> "Pcs")
        // This would require looking up the Item's specific conversion map.
        // For pure math utility, we throw or return 0.
        // In a real app, we'd pass the Item's definition here.
        throw new Error(`Unknown unit conversion: ${from} -> ${to}`);
    }

    // Convert to Base (g or ml)
    let baseValue = value * fromFactor;

    // NOTE: Apply density if crossing Weight/Volume boundary
    // if (isVolume(from) && isWeight(to)) baseValue *= density;

    // Convert to Target
    return baseValue / toFactor;
};

/**
 * Rounds currency to integer cents.
 */
export const toCents = (amount: number): number => {
    return Math.round(amount * 100);
}

/**
 * Calculates Cost Per Unit with high precision.
 * @returns Cost in Cents per Target Unit
 */
export const calculateUnitCost = (totalCostCents: number, quantity: number): number => {
    if (quantity === 0) return 0;
    // Keep 4 decimal places for precision handling
    return parseFloat((totalCostCents / quantity).toFixed(4));
};
