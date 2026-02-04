export type UnitType = 'mass' | 'volume' | 'count';

export const UNITS = {
    mass: ['kg', 'g', 'oz', 'lb'],
    volume: ['L', 'ml', 'cl', 'fl oz'],
    count: ['pcs', 'box', 'pack']
};

export const CONVERSION_RATES: Record<string, number> = {
    // Base unit: g
    'kg': 1000,
    'g': 1,
    'lb': 453.592,
    'oz': 28.3495,

    // Base unit: ml
    'L': 1000,
    'ml': 1,
    'cl': 10,
    'fl oz': 29.5735
};

export function convertValue(amount: number, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return amount;

    // Simple conversion using base units
    const fromRate = CONVERSION_RATES[fromUnit];
    const toRate = CONVERSION_RATES[toUnit];

    if (!fromRate || !toRate) {
        console.warn(`Conversion rate missing for ${fromUnit} or ${toUnit}`);
        return amount; // Fallback
    }

    // Convert to base, then to target
    const baseAmount = amount * fromRate;
    return baseAmount / toRate;
}
