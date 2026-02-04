import { prisma } from '@antigravity/database';
import { calculateUnitCost } from './logic/conversions';

// Rule #39: Eco-OS (CO2 Tracking)
const CO2_PER_KG = {
    'beef': 60,
    'chicken': 6,
    'vegetables': 0.5,
    'default': 2
};

export const InventoryService = {
    /**
     * Processes a stock transaction using Weighted Average Cost (WAC).
     */
    processTransaction: async (
        ingredientId: string,
        branchId: string,
        quantity: number, // + for buy, - for use 
        type: 'PURCHASE' | 'SALE' | 'WASTE' | 'ADJUSTMENT',
        userId: string,
        unitCostCents?: number // Required for PURCHASE
    ) => {
        // 1. Fetch Current State
        const ingredient = await prisma.ingredient.findUnique({
            where: { id: ingredientId }
        });

        if (!ingredient) throw new Error("Ingredient not found");

        const currentStock = ingredient.currentStock;
        // Current Value? We might need to store WAC on Ingredient or separate Table.
        // For MVP, assuming ingredient.priceCents is the current WAC for internal tracking 
        // (though schema comment said "Per purchase unit", usually we separate Master Price vs Stock Value).
        // Let's assume ingredient.priceCents is the Moving Average Cost (MAC) per Purchase Unit.
        const currentWAC = ingredient.priceCents;

        let newWAC = currentWAC;
        let newStock = currentStock + quantity; // Note: quantity in Stock Units?
        // Wait, priceCents is Purchase Unit. currentStock is Stock Unit.
        // We need to normalize.
        // Let's simplify: All internal valuation in Cents per Stock Unit.

        // Normalize WAC to Stock Unit
        const currentWACPerStock = currentWAC / ingredient.conversionRate;

        if (type === 'PURCHASE' && unitCostCents !== undefined && quantity > 0) {
            // Calculate WAC
            // (OldValue + NewValue) / TotalQty
            const oldValue = currentStock * currentWACPerStock;
            const newValue = quantity * (unitCostCents / ingredient.conversionRate); // Adjusted to stock unit?
            // Assuming `quantity` passed to function is in Stock Units for consistency? 
            // Or Purchase Units? 
            // Let's enforce: `quantity` argument is always STOCK UNITS.

            // If unitCostCents is passed, it's usually "Per Purchase Unit" from Invoice.
            const costPerStockArg = unitCostCents / ingredient.conversionRate;
            const valueAdded = quantity * costPerStockArg;

            const totalValue = oldValue + valueAdded;
            const totalQty = currentStock + quantity;

            if (totalQty > 0) {
                const newWACPerStock = totalValue / totalQty;
                // Convert back to Purchase Unit for storage if that's what we store
                newWAC = newWACPerStock * ingredient.conversionRate;
            }
        }

        // 2. Eco-OS: CO2 Calculation for Waste
        if (type === 'WASTE') {
            // lookup footprint
            const category = ingredient.category.toLowerCase();
            const factor = (CO2_PER_KG as any)[category] || CO2_PER_KG['default'];
            // Convert qty to KG
            // Assuming Stock Unit -> KG conversion is known?
            // Rough approx: quantity / 1000 if grams.
            const kgAmt = quantity / 1000;
            console.log(`[ECO-OS] Waste Impact: ${kgAmt * factor} kg CO2e`);
        }

        // 3. Commit to DB
        await prisma.$transaction([
            prisma.ingredient.update({
                where: { id: ingredientId },
                data: {
                    currentStock: newStock,
                    priceCents: Math.round(newWAC) // Update WAC
                }
            }),
            prisma.stockMovement.create({
                data: {
                    ingredientId,
                    branchId,
                    userId,
                    action: type as any, // Enum match?
                    quantity,
                    reason: type,
                }
            })
        ]);

        // 4. Auto-Procurement (Rule #52)
        if (newStock < ingredient.minStock) {
            console.log(`[PROCUREMENT] Trigger PO for ${ingredient.name}`);
            // createDraftPO(ingredientId)...
        }

        return { newStock, newWAC };
    }
};
