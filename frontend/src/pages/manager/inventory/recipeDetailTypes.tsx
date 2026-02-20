/**
 * 🍽️ Recipe Detail — Shared Types, Helpers & Constants
 * Extracted from RecipeDetail.tsx for better code organization.
 */
import type { LucideIcon } from 'lucide-react';

// ── Types ──
export interface RecipeIngredient {
    id: string;
    type: 'ingredient' | 'sub_recipe';
    name: string;
    supplier?: string;
    net_qty: number;
    gross_qty: number;
    unit: string;
    waste_pct: number;
    cost_per_unit: number;
    icons?: string[];
}

export interface RecipeData {
    id: string;
    recipe_name: string;
    description?: string;
    category?: string;
    subcategory?: string;
    cuisine?: string;
    recipe_type?: string;
    stage?: string;
    seasons?: string[];
    product_class?: string;
    product_type?: string;
    difficulty?: number;
    image_url?: string;
    servings?: number;
    portion_weight_g?: number;
    portion_volume_ml?: number;
    yield_pct?: number;
    shelf_life_days?: number;
    storage_conditions?: string;
    kitchen_utensils?: string;
    reference_nr?: string;
    url?: string;
    is_perishable?: boolean;
    allergens?: Record<string, boolean>;
    nutrition?: Record<string, number>;
    nutri_score?: string;
    dietary?: Record<string, boolean>;
    co2_kg?: number;
    water_l?: number;
    land_m2?: number;
    prep_time_min?: number;
    cook_time_min?: number;
    plate_time_min?: number;
    passive_prep_time_min?: number;
    passive_cook_time_min?: number;
    labor_cost_per_hour?: number;
    food_cost?: number;
    waste_cost?: number;
    production_cost?: number;
    sell_price?: number;
    tax_pct?: number;
    ingredients: RecipeIngredient[];
    sub_recipes?: string[];
    preparations?: string[];
    used_in_recipes?: string[];
    used_in_menus?: string[];
    outlets?: { id: string; name: string; linked: boolean; sell_price?: number; tax_pct?: number }[];
    images?: string[];
    principal_image?: string;
    target_margin_pct?: number;
    protein_source?: string;
    ecolabels?: string[];
    created_at?: string;
    created_by?: string;
    updated_at?: string;
    updated_by?: string;
    version?: number;
    active?: boolean;
    custom_fields?: Record<string, string>;
}

// ── Helpers ──
export function fmt(n: number | undefined, decimals = 2): string {
    return (n ?? 0).toFixed(decimals);
}

// ── Allergen list (EU 14) ──
export const EU_ALLERGENS = [
    'Celery', 'Cereals (Gluten)', 'Crustaceans', 'Eggs', 'Fish', 'Lupin',
    'Milk', 'Molluscs', 'Mustard', 'Nuts', 'Peanuts', 'Sesame', 'Soya', 'Sulphites'
];

// ── InfoField component props ──
export interface InfoFieldProps {
    icon: LucideIcon;
    label: string;
    value: string;
}

// ── Demo data ──
export function demoRecipe(id: string): RecipeData {
    return {
        id,
        recipe_name: '100g Australian Wagyu',
        description: 'Premium Australian Wagyu striploin, seared to perfection',
        category: 'Food',
        subcategory: 'Main Course',
        cuisine: 'Contemporary',
        recipe_type: 'Main course',
        stage: 'Complete',
        seasons: ['Winter', 'Spring', 'Summer', 'Autumn'],
        product_class: 'Finished Product',
        product_type: 'Finished Product',
        difficulty: 3,
        servings: 1,
        portion_weight_g: 100,
        portion_volume_ml: 100,
        yield_pct: 85,
        shelf_life_days: 2,
        storage_conditions: 'Refrigerated 0-4°C',
        kitchen_utensils: 'Cast iron pan, tongs, probe thermometer',
        reference_nr: 'RCP-00142',
        is_perishable: true,
        allergens: { 'Milk': false, 'Eggs': false, 'Mustard': true, 'Soya': false },
        nutrition: { energy_kcal: 365, fat_g: 28.4, saturated_fat_g: 11.2, carbs_g: 0, sugar_g: 0, protein_g: 26.1, salt_g: 0.8, fiber_g: 0 },
        nutri_score: 'B',
        dietary: { halal: false, vegan: false, vegetarian: false, gluten_free: true, lactose_free: true },
        co2_kg: 27.5,
        water_l: 15400,
        land_m2: 340,
        prep_time_min: 5,
        cook_time_min: 12,
        plate_time_min: 3,
        labor_cost_per_hour: 18.50,
        food_cost: 8.20,
        waste_cost: 0.0,
        production_cost: 0.0,
        sell_price: 38.00,
        tax_pct: 18,
        ingredients: [
            { id: 'ing-1', type: 'ingredient', name: 'Australian Wagyu Striploin', supplier: 'JP Imports', net_qty: 100, gross_qty: 100, unit: 'g', waste_pct: 0, cost_per_unit: 0.082, icons: ['$', '📦', '⚠️', '📊', '🔗'] },
            { id: 'ing-2', type: 'ingredient', name: 'Fleur de Sel', supplier: 'Spice World', net_qty: 2, gross_qty: 2, unit: 'g', waste_pct: 0, cost_per_unit: 0.015 },
            { id: 'ing-3', type: 'ingredient', name: 'Black Pepper (cracked)', supplier: 'Spice World', net_qty: 1, gross_qty: 1, unit: 'g', waste_pct: 0, cost_per_unit: 0.008 },
            { id: 'ing-4', type: 'ingredient', name: 'Olive Oil Extra Virgin', supplier: 'Mediterranean Foods', net_qty: 10, gross_qty: 10, unit: 'ml', waste_pct: 0, cost_per_unit: 0.012 },
            { id: 'ing-5', type: 'ingredient', name: 'Garlic Butter', supplier: 'Dairy Fresh', net_qty: 15, gross_qty: 15, unit: 'g', waste_pct: 0, cost_per_unit: 0.022 },
        ],
        sub_recipes: [],
        preparations: [],
        used_in_recipes: [],
        used_in_menus: ['Caviar&Bull Food'],
        outlets: [
            { id: 'o1', name: 'Caviar & Bull', linked: true },
            { id: 'o2', name: 'Don Royale', linked: true },
            { id: 'o3', name: 'The Chop House', linked: false },
        ],
        images: [],
        created_at: 'May 14, 2024, 4:40 p.m.',
        created_by: 'Ana Salas',
        updated_at: 'Jan 12, 2026, 2:37 p.m.',
        updated_by: 'Mark Vassallo',
        version: 1,
        active: true,
        custom_fields: { 'Beers': 'N/A', 'Desserts': 'N/A', 'Hot Beverage': 'N/A', 'Main Course': 'N/A', 'Pasta': 'N/A', 'Pizza': 'N/A', 'Salad': 'N/A', 'Starter': 'N/A' },
    };
}
