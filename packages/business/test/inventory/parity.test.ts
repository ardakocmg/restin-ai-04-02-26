import { describe, it, expect, vi } from 'vitest';
import { calculateRecipeCost } from '../../src/inventory/logic/costing';
import { convertUnit } from '../../src/inventory/logic/conversions';

// Mock specific Prisma calls
vi.mock('@antigravity/database', () => ({
    prisma: {
        recipe: {
            findUnique: vi.fn(),
        }
    }
}));

describe('Inventory Intelligence Parity', () => {

    it('should convert units precisely', () => {
        expect(convertUnit(1, 'kg', 'g')).toBe(1000);
        expect(convertUnit(500, 'g', 'kg')).toBe(0.5);
    });

    it('should calculate Burger Cost with nested Waste factors', async () => {
        // Mock Data: Burger = Bun + Beef
        const mockRecipe = {
            id: 'burger-1',
            items: [
                {
                    // Bun: 1 Unit, €0.50, 0% Waste
                    quantity: 1,
                    unit: 'pcs',
                    ingredientId: 'bun-id',
                    ingredient: {
                        id: 'bun-id',
                        priceCents: 50, // Per Pcs
                        conversionRate: 1, // 1=1
                        stockUnit: 'pcs',
                        wastagePercent: 0,
                    }
                },
                {
                    // Beef: 150g, €10/kg, 20% Waste
                    quantity: 150,
                    unit: 'g',
                    ingredientId: 'beef-id',
                    ingredient: {
                        id: 'beef-id',
                        priceCents: 1000, // €10 per kg
                        conversionRate: 1000, // kg -> g
                        stockUnit: 'g',
                        wastagePercent: 20, // 80% Yield
                    }
                }
            ]
        };

        // Mock Prisma Response
        const prismaMock = await import('@antigravity/database');
        (prismaMock.prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);

        const result = await calculateRecipeCost('burger-1');

        // Calculation Validation:
        // 1. Bun: 1 * 50 = 50 cents.
        // 2. Beef: 
        //    - Cost Per Stock Gram = 1000 cents / 1000g = 1 cent/g.
        //    - Qty = 150g.
        //    - Base Cost = 150 * 1 = 150 cents.
        //    - Yield Loss = 20% => Cost = 150 / 0.8 = 187.5 cents.
        // 3. Total = 50 + 187.5 = 237.5 -> Round to 238 cents.

        expect(result.totalCostCents).toBe(238);
    });
});
