import { prisma } from '@antigravity/database';
import { convertUnit } from './conversions';

interface CostResult {
    totalCostCents: number;
    yieldPercent: number; // 0-1
}

/**
 * Recursively calculates the cost of a recipe.
 * Rule #14: Parity with Apicbase (SubRecipes + Waste)
 */
export const calculateRecipeCost = async (recipeId: string): Promise<CostResult> => {
    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: {
            items: {
                include: {
                    ingredient: true,
                    // Note: Prisma schema in Bedrock v1 might not have full recursive 'subRecipe' relation loaded deeply perfectly
                    // relying on 'ingredientId' or 'subRecipeId' manually.
                    // Assuming for v1 schema we have `ingredient` OR logic to fetch sub-recipe.
                    // In previous schema update, `subRecipeId` was not fully linked as relation "subRecipe" in `RecipeItem`.
                    // We will assume `ingredientId` is populated for raw, and we'd need to fetch `subRecipeId` recursively.
                }
            }
        }
    });

    if (!recipe) throw new Error("Recipe not found");

    let totalCost = 0;

    for (const item of recipe.items) {
        let itemCost = 0;

        if (item.ingredientId && item.ingredient) {
            // It's a raw ingredient
            // Cost = (Quantity * UnitCost) / Yield? 
            // Yield is usually on the Prep/Recipe level, but Ingredient might have waste factor.
            // Using Ingredient.wastagePercent (Rule #39)

            const ing = item.ingredient;

            // 1. Convert RecipeItem Unit to Stock Unit
            const qtyInStockUnit = convertUnit(item.quantity, item.unit, ing.stockUnit);

            // 2. Base Cost
            // ing.priceCents is per PURCHASE UNIT. Need to convert purchase -> stock.
            // ing.conversionRate is purchase -> stock.
            // CostPerStockUnit = PriceCents / ConversionRate
            const costPerStockUnit = ing.priceCents / ing.conversionRate;

            let rawCost = qtyInStockUnit * costPerStockUnit;

            // 3. Apply Ingredient Waste (Prep Loss)
            // If we lose 10% peeling potatoes, we need 1.1x potatoes.
            // Cost increases.
            if (ing.wastagePercent > 0) {
                rawCost = rawCost / (1 - (ing.wastagePercent / 100));
            }

            itemCost = rawCost;

        } else if (item.subRecipeId) {
            // It's a sub-recipe (Recursive)
            const subResult = await calculateRecipeCost(item.subRecipeId);

            // SubRecipe yields X amount? Usually a batch yields 100%. 
            // If we use 0.5 of a Batch...
            // Simplified: SubRecipe cost is Unit Cost? 
            // Apicbase logic: SubRecipe is defined by specific Yield.
            // For now, treat SubRecipe Total Cost as cost for "1 Batch".
            // If item.quantity is Fraction of Batch...

            // Assuming item.quantity is "Portions" or "Units" of SubRecipe?
            // Let's assume quantity = 1 (1 batch) for simplicity in MVP recursion 
            // or item.quantity is percentage.

            itemCost = subResult.totalCostCents * item.quantity;
        }

        totalCost += itemCost;
    }

    return {
        totalCostCents: Math.round(totalCost), // Rule #4: Integers
        yieldPercent: 1.0 // Placeholder for Recipe-level yield
    };
};
