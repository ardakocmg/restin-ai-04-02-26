/**
 * NutritionalCalculator — Auto-compute nutrition from ingredient database
 * Apicbase parity: calories, macros, vitamins, minerals per recipe/menu
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card';
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageContainer from '@/layouts/PageContainer';
import { cn } from '@/lib/utils';
import {
Apple,
BarChart3,
Beef,
ChevronRight,
Droplets,
Eye,
Flame,
Heart,
Leaf,
PieChart,
Plus,
Scale,
Search,
Trash2,
Wheat,
Zap
} from 'lucide-react';
import React,{ useCallback,useMemo,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/* ────────────────────────── Types ────────────────── */
interface NutrientProfile {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    saturatedFat: number;
    sodium: number;
    cholesterol: number;
    vitaminA: number;
    vitaminC: number;
    vitaminD: number;
    calcium: number;
    iron: number;
    potassium: number;
}

interface IngredientNutrition {
    _id: string;
    name: string;
    category: string;
    servingSize: number;
    servingUnit: string;
    nutrients: NutrientProfile;
    allergens: string[];
}

interface RecipeIngredient {
    ingredient: IngredientNutrition;
    quantity: number;
    unit: string;
}

/* ──────────────────────────── Nutrition DB ────────────────── */
const NUTRITION_DB: IngredientNutrition[] = [
    { _id: 'n1', name: 'San Marzano Tomatoes', category: 'Produce', servingSize: 100, servingUnit: 'g', allergens: [], nutrients: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, saturatedFat: 0, sodium: 9, cholesterol: 0, vitaminA: 42, vitaminC: 14, vitaminD: 0, calcium: 11, iron: 0.3, potassium: 237 } },
    { _id: 'n2', name: 'Mozzarella di Bufala', category: 'Dairy', servingSize: 100, servingUnit: 'g', allergens: ['Dairy'], nutrients: { calories: 280, protein: 17, carbs: 2.2, fat: 22, fiber: 0, sugar: 1, saturatedFat: 14, sodium: 620, cholesterol: 79, vitaminA: 180, vitaminC: 0, vitaminD: 0.3, calcium: 505, iron: 0.4, potassium: 76 } },
    { _id: 'n3', name: '00 Flour (Caputo)', category: 'Dry Goods', servingSize: 100, servingUnit: 'g', allergens: ['Gluten'], nutrients: { calories: 348, protein: 11, carbs: 72, fat: 1.2, fiber: 2.7, sugar: 0.3, saturatedFat: 0.2, sodium: 2, cholesterol: 0, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 15, iron: 1.2, potassium: 107 } },
    { _id: 'n4', name: 'Extra Virgin Olive Oil', category: 'Oils', servingSize: 100, servingUnit: 'ml', allergens: [], nutrients: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, saturatedFat: 14, sodium: 2, cholesterol: 0, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 1, iron: 0.6, potassium: 1 } },
    { _id: 'n5', name: 'Fresh Basil', category: 'Herbs', servingSize: 100, servingUnit: 'g', allergens: [], nutrients: { calories: 23, protein: 3.2, carbs: 2.7, fat: 0.6, fiber: 1.6, sugar: 0.3, saturatedFat: 0, sodium: 4, cholesterol: 0, vitaminA: 264, vitaminC: 18, vitaminD: 0, calcium: 177, iron: 3.2, potassium: 295 } },
    { _id: 'n6', name: 'Chicken Breast', category: 'Meat & Poultry', servingSize: 100, servingUnit: 'g', allergens: [], nutrients: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, saturatedFat: 1, sodium: 74, cholesterol: 85, vitaminA: 6, vitaminC: 0, vitaminD: 0.1, calcium: 15, iron: 1, potassium: 256 } },
    { _id: 'n7', name: 'Fresh Sea Bass', category: 'Seafood', servingSize: 100, servingUnit: 'g', allergens: ['Fish'], nutrients: { calories: 97, protein: 18, carbs: 0, fat: 2, fiber: 0, sugar: 0, saturatedFat: 0.5, sodium: 68, cholesterol: 41, vitaminA: 54, vitaminC: 0, vitaminD: 3.3, calcium: 10, iron: 0.3, potassium: 256 } },
    { _id: 'n8', name: 'Parmesan Reggiano', category: 'Dairy', servingSize: 100, servingUnit: 'g', allergens: ['Dairy'], nutrients: { calories: 431, protein: 38, carbs: 4.1, fat: 29, fiber: 0, sugar: 0.9, saturatedFat: 19, sodium: 1600, cholesterol: 88, vitaminA: 207, vitaminC: 0, vitaminD: 0.5, calcium: 1184, iron: 0.8, potassium: 92 } },
    { _id: 'n9', name: 'Eggs (Whole)', category: 'Dairy', servingSize: 100, servingUnit: 'g', allergens: ['Eggs'], nutrients: { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1, saturatedFat: 3.3, sodium: 124, cholesterol: 373, vitaminA: 160, vitaminC: 0, vitaminD: 2.1, calcium: 56, iron: 1.8, potassium: 138 } },
    { _id: 'n10', name: 'Butter (Unsalted)', category: 'Dairy', servingSize: 100, servingUnit: 'g', allergens: ['Dairy'], nutrients: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0, sugar: 0.1, saturatedFat: 51, sodium: 11, cholesterol: 215, vitaminA: 684, vitaminC: 0, vitaminD: 0.6, calcium: 24, iron: 0, potassium: 24 } },
    { _id: 'n11', name: 'Garlic', category: 'Produce', servingSize: 100, servingUnit: 'g', allergens: [], nutrients: { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1, sugar: 1, saturatedFat: 0.1, sodium: 17, cholesterol: 0, vitaminA: 0, vitaminC: 31, vitaminD: 0, calcium: 181, iron: 1.7, potassium: 401 } },
    { _id: 'n12', name: 'Heavy Cream', category: 'Dairy', servingSize: 100, servingUnit: 'ml', allergens: ['Dairy'], nutrients: { calories: 340, protein: 2.1, carbs: 2.8, fat: 36, fiber: 0, sugar: 2.8, saturatedFat: 23, sodium: 38, cholesterol: 137, vitaminA: 411, vitaminC: 0.6, vitaminD: 0.4, calcium: 65, iron: 0, potassium: 75 } },
];

/* ──────────────────────────── Demo Recipes ────────────────── */
const DEMO_RECIPES: { name: string; servings: number; ingredients: { ingredientId: string; qty: number }[] }[] = [
    {
        name: 'Margherita Pizza', servings: 1, ingredients: [
            { ingredientId: 'n3', qty: 200 }, { ingredientId: 'n1', qty: 150 },
            { ingredientId: 'n2', qty: 125 }, { ingredientId: 'n4', qty: 15 },
            { ingredientId: 'n5', qty: 5 },
        ]
    },
    {
        name: 'Chicken Caesar Salad', servings: 1, ingredients: [
            { ingredientId: 'n6', qty: 180 }, { ingredientId: 'n8', qty: 30 },
            { ingredientId: 'n9', qty: 50 }, { ingredientId: 'n4', qty: 20 },
            { ingredientId: 'n11', qty: 5 },
        ]
    },
    {
        name: 'Pasta Carbonara', servings: 1, ingredients: [
            { ingredientId: 'n3', qty: 150 }, { ingredientId: 'n9', qty: 100 },
            { ingredientId: 'n8', qty: 50 }, { ingredientId: 'n10', qty: 20 },
            { ingredientId: 'n12', qty: 30 },
        ]
    },
];

/* ──────────────────────────── Macro Ring SVG ────────────────── */
function MacroRing({ protein, carbs, fat, size = 120 }: { protein: number; carbs: number; fat: number; size?: number }) {
    const total = protein + carbs + fat;
    if (total === 0) return null;
    const pPct = protein / total;
    const cPct = carbs / total;
    const r = (size / 2) - 10;
    const circumference = 2 * Math.PI * r;
    const pLen = pPct * circumference;
    const cLen = cPct * circumference;
    const fLen = (1 - pPct - cPct) * circumference;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ef4444" strokeWidth="12" strokeDasharray={`${pLen} ${circumference - pLen}`} strokeDashoffset="0" strokeLinecap="round" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray={`${cLen} ${circumference - cLen}`} strokeDashoffset={`${-pLen}`} strokeLinecap="round" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3b82f6" strokeWidth="12" strokeDasharray={`${fLen} ${circumference - fLen}`} strokeDashoffset={`${-pLen - cLen}`} strokeLinecap="round" />
        </svg>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   ██  NUTRITIONAL CALCULATOR
   ═══════════════════════════════════════════════════════════════════ */
export default function NutritionalCalculator() {
    const { t } = useTranslation();

    /* ── State ── */
    const [selectedRecipe, setSelectedRecipe] = useState(0);
    const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
    const [servings, setServings] = useState(1);
    const [search, setSearch] = useState('');
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [comparisonMode, setComparisonMode] = useState(false);

    /* ── Load Recipe ── */
    const loadRecipe = useCallback((idx: number) => {
        setSelectedRecipe(idx);
        const recipe = DEMO_RECIPES[idx];
        setServings(recipe.servings);
        setRecipeIngredients(recipe.ingredients.map(ri => {
            const ing = NUTRITION_DB.find(n => n._id === ri.ingredientId);
            return ing ? { ingredient: ing, quantity: ri.qty, unit: ing.servingUnit } : null;
        }).filter(Boolean) as RecipeIngredient[]);
    }, []);

    React.useEffect(() => { loadRecipe(0); }, [loadRecipe]);

    /* ── Compute Totals ── */
    const totals = useMemo((): NutrientProfile => {
        const base: NutrientProfile = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, saturatedFat: 0, sodium: 0, cholesterol: 0, vitaminA: 0, vitaminC: 0, vitaminD: 0, calcium: 0, iron: 0, potassium: 0 };
        for (const ri of recipeIngredients) {
            const factor = ri.quantity / ri.ingredient.servingSize;
            for (const key of Object.keys(base) as (keyof NutrientProfile)[]) {
                base[key] += ri.ingredient.nutrients[key] * factor;
            }
        }
        return base;
    }, [recipeIngredients]);

    const perServing = useMemo((): NutrientProfile => {
        const result = { ...totals };
        if (servings > 1) {
            for (const key of Object.keys(result) as (keyof NutrientProfile)[]) {
                result[key] = result[key] / servings;
            }
        }
        return result;
    }, [totals, servings]);

    const allergens = useMemo(() => {
        const all = new Set<string>();
        recipeIngredients.forEach(ri => ri.ingredient.allergens.forEach(a => all.add(a)));
        return Array.from(all);
    }, [recipeIngredients]);

    /* ── Add Ingredient ── */
    const filteredDB = useMemo(() => {
        if (!search) return NUTRITION_DB;
        const q = search.toLowerCase();
        return NUTRITION_DB.filter(n => n.name.toLowerCase().includes(q) || n.category.toLowerCase().includes(q));
    }, [search]);

    const addIngredient = (ing: IngredientNutrition) => {
        setRecipeIngredients(prev => [...prev, { ingredient: ing, quantity: 100, unit: ing.servingUnit }]);
        setAddDialogOpen(false);
        setSearch('');
        toast.success(`Added ${ing.name}`);
    };

    const removeIngredient = (idx: number) => {
        setRecipeIngredients(prev => prev.filter((_, i) => i !== idx));
    };

    const updateQty = (idx: number, qty: number) => {
        setRecipeIngredients(prev => prev.map((ri, i) => i === idx ? { ...ri, quantity: Math.max(0, qty) } : ri));
    };

    /* ── Daily Value % (based on 2000 kcal diet) ── */
    const dailyValue = (key: keyof NutrientProfile): number => {
        const dvRef: Partial<Record<keyof NutrientProfile, number>> = {
            calories: 2000, protein: 50, carbs: 300, fat: 65, fiber: 25, sugar: 50,
            saturatedFat: 20, sodium: 2300, cholesterol: 300, vitaminA: 900,
            vitaminC: 90, vitaminD: 20, calcium: 1300, iron: 18, potassium: 4700,
        };
        const ref = dvRef[key];
        if (!ref) return 0;
        return (perServing[key] / ref) * 100;
    };

    return (
        <PageContainer
            title={t("inventory.nutritional.title", "Nutritional Calculator")}
            description="Auto-compute calories, macros & micronutrients from ingredient database"
            actions={
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setComparisonMode(!comparisonMode)}>
                        <BarChart3 className="h-4 w-4 mr-1" /> {comparisonMode ? 'Detail View' : 'Compare Recipes'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Ingredient
                    </Button>
                </div>
            }
        >
            {/* Recipe Selector */}
            <div className="flex flex-wrap gap-2 mb-6">
                {DEMO_RECIPES.map((r, i) => (
                    <Button
                        key={i}
                        variant={selectedRecipe === i ? 'default' : 'outline'}
                        size="sm"
                        className={cn(selectedRecipe !== i && 'border-white/10')}
                        onClick={() => loadRecipe(i)}
                    >
                        {r.name}
                    </Button>
                ))}
            </div>

            {comparisonMode ? (
                /* ── Comparison Mode ── */
                <Card className="border-white/5 bg-zinc-900/40">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-purple-400" /> Recipe Comparison
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="p-2 text-left font-medium">Nutrient</th>
                                        {DEMO_RECIPES.map((r, i) => <th key={i} className="p-2 text-center font-medium">{r.name}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {([
                                        ['Calories', 'kcal'], ['Protein', 'g'], ['Carbs', 'g'], ['Fat', 'g'],
                                        ['Fiber', 'g'], ['Sodium', 'mg'], ['Cholesterol', 'mg'],
                                    ] as const).map(([label]) => {
                                        const key = label.toLowerCase() as keyof NutrientProfile;
                                        return (
                                            <tr key={label} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="p-2 font-medium">{label}</td>
                                                {DEMO_RECIPES.map((recipe, ri) => {
                                                    const ings = recipe.ingredients.map(x => {
                                                        const ing = NUTRITION_DB.find(n => n._id === x.ingredientId);
                                                        if (!ing) return 0;
                                                        return ing.nutrients[key] * (x.qty / ing.servingSize);
                                                    });
                                                    const total = ings.reduce((a, b) => a + b, 0);
                                                    return <td key={ri} className="p-2 text-center tabular-nums">{total.toFixed(1)}</td>;
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                /* ── Detail Mode ── */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Ingredients */}
                    <div className="lg:col-span-2 space-y-4">
                        <Card className="border-white/5 bg-zinc-900/40">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Scale className="h-4 w-4 text-blue-400" /> Ingredients
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs text-muted-foreground">Servings:</Label>
                                        <Input aria-label="Input field" type="number" value={servings} onChange={e => setServings(Math.max(1, Number(e.target.value)))} className="w-16 h-7 text-center text-xs" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {recipeIngredients.map((ri, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/50 border border-white/5">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{ri.ingredient.name}</p>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                    <span>{ri.ingredient.category}</span>
                                                    <span>•</span>
                                                    <span>{(ri.ingredient.nutrients.calories * ri.quantity / ri.ingredient.servingSize).toFixed(0)} kcal</span>
                                                    {ri.ingredient.allergens.length > 0 && ri.ingredient.allergens.map(a => (
                                                        <Badge key={a} variant="outline" className="text-[8px] border-amber-500/30 text-amber-400">{a}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Input aria-label="Input field"
                                                    type="number"
                                                    value={ri.quantity}
                                                    onChange={e => updateQty(idx, Number(e.target.value))}
                                                    className="w-16 h-7 text-center text-xs"
                                                />
                                                <span className="text-xs text-muted-foreground">{ri.unit}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeIngredient(idx)}>
                                                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" className="w-full border-dashed border-white/10" onClick={() => setAddDialogOpen(true)}>
                                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Ingredient
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Micronutrients Table */}
                        <Card className="border-white/5 bg-zinc-900/40">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-amber-400" /> Detailed Nutrients (per serving)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {([
                                        { key: 'calories' as const, label: 'Calories', unit: 'kcal', icon: Flame, color: 'text-orange-400' },
                                        { key: 'protein' as const, label: 'Protein', unit: 'g', icon: Beef, color: 'text-red-400' },
                                        { key: 'carbs' as const, label: 'Carbohydrates', unit: 'g', icon: Wheat, color: 'text-amber-400' },
                                        { key: 'fat' as const, label: 'Total Fat', unit: 'g', icon: Droplets, color: 'text-blue-400' },
                                        { key: 'saturatedFat' as const, label: 'Saturated Fat', unit: 'g', icon: Droplets, color: 'text-blue-300' },
                                        { key: 'fiber' as const, label: 'Dietary Fiber', unit: 'g', icon: Leaf, color: 'text-emerald-400' },
                                        { key: 'sugar' as const, label: 'Sugars', unit: 'g', icon: Apple, color: 'text-pink-400' },
                                        { key: 'sodium' as const, label: 'Sodium', unit: 'mg', icon: Zap, color: 'text-yellow-400' },
                                        { key: 'cholesterol' as const, label: 'Cholesterol', unit: 'mg', icon: Heart, color: 'text-red-300' },
                                        { key: 'vitaminA' as const, label: 'Vitamin A', unit: 'μg', icon: Eye, color: 'text-orange-300' },
                                        { key: 'vitaminC' as const, label: 'Vitamin C', unit: 'mg', icon: Zap, color: 'text-yellow-300' },
                                        { key: 'vitaminD' as const, label: 'Vitamin D', unit: 'μg', icon: Flame, color: 'text-amber-300' },
                                        { key: 'calcium' as const, label: 'Calcium', unit: 'mg', icon: Scale, color: 'text-white' },
                                        { key: 'iron' as const, label: 'Iron', unit: 'mg', icon: Zap, color: 'text-zinc-300' },
                                        { key: 'potassium' as const, label: 'Potassium', unit: 'mg', icon: Zap, color: 'text-purple-400' },
                                    ]).map(n => {
                                        const dv = dailyValue(n.key);
                                        return (
                                            <div key={n.key} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/30 border border-white/5">
                                                <n.icon className={cn('h-3.5 w-3.5 flex-shrink-0', n.color)} />
                                                <span className="text-xs flex-1">{n.label}</span>
                                                <span className="text-xs font-medium tabular-nums">{perServing[n.key].toFixed(1)} {n.unit}</span>
                                                <div className="w-16 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                                                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, dv)}%`  /* keep-inline */ }} />
                                                </div>
                                                <span className="text-[10px] text-muted-foreground w-8 text-right">{dv.toFixed(0)}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Summary Panel */}
                    <div className="space-y-4">
                        {/* Macro Ring */}
                        <Card className="border-white/5 bg-zinc-900/40">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <PieChart className="h-4 w-4 text-purple-400" /> Macro Split
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center">
                                <div className="relative">
                                    <MacroRing protein={perServing.protein} carbs={perServing.carbs} fat={perServing.fat} size={140} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <p className="text-2xl font-bold">{perServing.calories.toFixed(0)}</p>
                                        <p className="text-[10px] text-muted-foreground">kcal/serving</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 mt-4 text-xs">
                                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Protein {perServing.protein.toFixed(1)}g</div>
                                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Carbs {perServing.carbs.toFixed(1)}g</div>
                                    <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Fat {perServing.fat.toFixed(1)}g</div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Stats */}
                        <Card className="border-white/5 bg-zinc-900/40">
                            <CardHeader><CardTitle className="text-sm">Quick Summary</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {[
                                    { label: 'Total Calories', value: `${totals.calories.toFixed(0)} kcal`, color: 'text-orange-400' },
                                    { label: 'Per Serving', value: `${perServing.calories.toFixed(0)} kcal`, color: 'text-emerald-400' },
                                    { label: 'Ingredients', value: recipeIngredients.length.toString(), color: 'text-blue-400' },
                                    { label: 'Servings', value: servings.toString(), color: 'text-purple-400' },
                                ].map(s => (
                                    <div key={s.label} className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">{s.label}</span>
                                        <span className={cn('font-medium', s.color)}>{s.value}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Allergens */}
                        <Card className="border-white/5 bg-zinc-900/40">
                            <CardHeader><CardTitle className="text-sm">Detected Allergens</CardTitle></CardHeader>
                            <CardContent>
                                {allergens.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {allergens.map(a => (
                                            <Badge key={a} variant="outline" className="text-xs border-amber-500/30 text-amber-400">{a}</Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-emerald-400">{"No "}allergens detected</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Dietary Info */}
                        <Card className="border-white/5 bg-zinc-900/40">
                            <CardHeader><CardTitle className="text-sm">Dietary Labels</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-1.5">
                                    {!allergens.includes('Dairy') && !allergens.includes('Eggs') && (
                                        <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">🌱 Vegan</Badge>
                                    )}
                                    {!allergens.includes('Dairy') && !allergens.includes('Eggs') && !allergens.includes('Fish') && !allergens.includes('Shellfish') && (
                                        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">🥬 Plant-based</Badge>
                                    )}
                                    {!allergens.includes('Gluten') && (
                                        <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">🌾 Gluten-free</Badge>
                                    )}
                                    {perServing.calories < 500 && (
                                        <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">🔥 Low-cal</Badge>
                                    )}
                                    {perServing.protein > 20 && (
                                        <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">💪 High-protein</Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Add Ingredient Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Ingredient</DialogTitle>
                        <DialogDescription>Search the nutrition database</DialogDescription>
                    </DialogHeader>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input aria-label="Search ingredients..." className="pl-9" placeholder="Search ingredients..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                    </div>
                    <div className="space-y-1">
                        {filteredDB.map(ing => (
                            <button key={ing._id} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors text-left" onClick={() => addIngredient(ing)}>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{ing.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{ing.category} • {ing.nutrients.calories} kcal/{ing.servingSize}{ing.servingUnit}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
