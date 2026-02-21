import React, { useState, useMemo } from 'react';
import { useVenue } from '@/context/VenueContext';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    Calendar, Plus, ChefHat, Users, Target, Leaf, DollarSign,
    RefreshCw, Copy, Trash2, Clock, AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Demo recipes for meal planning ──
const RECIPE_POOL = [
    { id: 'r1', name: 'Margherita Pizza', category: 'Main', cost: 3.40, calories: 720, allergens: ['Gluten', 'Milk'] },
    { id: 'r2', name: 'Caesar Salad', category: 'Starter', cost: 2.10, calories: 380, allergens: ['Eggs', 'Fish'] },
    { id: 'r3', name: 'Grilled Salmon', category: 'Main', cost: 8.50, calories: 540, allergens: ['Fish'] },
    { id: 'r4', name: 'Tiramisu', category: 'Dessert', cost: 1.80, calories: 450, allergens: ['Gluten', 'Milk', 'Eggs'] },
    { id: 'r5', name: 'Minestrone Soup', category: 'Starter', cost: 1.20, calories: 210, allergens: ['Celery'] },
    { id: 'r6', name: 'Chicken Milanese', category: 'Main', cost: 4.20, calories: 620, allergens: ['Gluten', 'Eggs'] },
    { id: 'r7', name: 'Panna Cotta', category: 'Dessert', cost: 1.50, calories: 340, allergens: ['Milk'] },
    { id: 'r8', name: 'Bruschetta', category: 'Starter', cost: 1.00, calories: 180, allergens: ['Gluten'] },
    { id: 'r9', name: 'Risotto Mushroom', category: 'Main', cost: 3.80, calories: 520, allergens: ['Milk'] },
    { id: 'r10', name: 'Gelato', category: 'Dessert', cost: 0.90, calories: 220, allergens: ['Milk'] },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_SLOTS = ['Lunch', 'Dinner'];

// ── KPI Card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subtext, color = 'text-foreground' }) {
    return (
        <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-background/80 ${color}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{label}</p>
                        <p className="text-lg font-bold tabular-nums">{value}</p>
                        {subtext && <p className="text-[10px] text-muted-foreground">{subtext}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Main Page ────────────────────────────────────────────────
export default function MealPlanning() {
    const { activeVenue } = useVenue();
    const [currentWeek, setCurrentWeek] = useState(0);
    const [guestCount, setGuestCount] = useState(80);
    const [costCeiling, setCostCeiling] = useState(8.00);
    const [showAddRecipe, setShowAddRecipe] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null); // { day, meal }
    const [dietaryFilter, setDietaryFilter] = useState('all');

    // Menu plan: { 'Monday-Lunch': [recipe_ids], ... }
    const [menuPlan, setMenuPlan] = useState(() => {
        const plan = {};
        DAYS.forEach(day => {
            MEAL_SLOTS.forEach(meal => {
                const key = `${day}-${meal}`;
                // Pre-fill with random recipes
                const randomRecipes = RECIPE_POOL
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 3)
                    .map(r => r.id);
                plan[key] = randomRecipes;
            });
        });
        return plan;
    });

    const addRecipeToSlot = (recipeId) => {
        if (!selectedSlot) return;
        const key = `${selectedSlot.day}-${selectedSlot.meal}`;
        setMenuPlan(prev => ({
            ...prev,
            [key]: [...(prev[key] || []), recipeId],
        }));
        setShowAddRecipe(false);
        toast.success('Recipe added to plan');
    };

    const removeRecipeFromSlot = (day, meal, recipeId) => {
        const key = `${day}-${meal}`;
        setMenuPlan(prev => ({
            ...prev,
            [key]: (prev[key] || []).filter(id => id !== recipeId),
        }));
    };

    // Calculate weekly stats
    const weekStats = useMemo(() => {
        let totalCost = 0;
        let totalCalories = 0;
        let totalRecipes = 0;
        let allergenSet = new Set();

        Object.values(menuPlan).forEach(recipeIds => {
            recipeIds.forEach(id => {
                const recipe = RECIPE_POOL.find(r => r.id === id);
                if (recipe) {
                    totalCost += recipe.cost;
                    totalCalories += recipe.calories;
                    totalRecipes++;
                    recipe.allergens.forEach(a => allergenSet.add(a));
                }
            });
        });

        return {
            totalCost: totalCost * guestCount,
            avgCostPerGuest: totalCost / (DAYS.length * MEAL_SLOTS.length),
            totalCalories: Math.round(totalCalories / (DAYS.length * MEAL_SLOTS.length)),
            totalRecipes,
            uniqueAllergens: allergenSet.size,
            underBudget: (totalCost / (DAYS.length * MEAL_SLOTS.length)) <= costCeiling,
        };
    }, [menuPlan, guestCount, costCeiling]);

    const weekLabel = `Week ${currentWeek >= 0 ? currentWeek + 1 : `${52 + currentWeek + 1}`}`;

    return (
        <PageContainer
            title="Meal Planning"
            subtitle="Plan weekly menu cycles with dietary constraints and cost targets"
            icon={<Calendar className="h-6 w-6 text-purple-500" />}
        >
            {/* Controls */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() = aria-label="Action"> setCurrentWeek(w => w - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-bold px-3 min-w-20 text-center">{weekLabel}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() = aria-label="Action"> setCurrentWeek(w => w + 1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input aria-label="Input field" type="number" value={guestCount} onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                        className="w-16 h-7 text-sm border-0 p-0 text-center" />
                    <span className="text-xs text-muted-foreground">guests</span>
                </div>

                <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1">
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">€</span>
                    <Input aria-label="Input field" type="number" step="0.50" value={costCeiling} onChange={(e) => setCostCeiling(parseFloat(e.target.value) || 0)}
                        className="w-16 h-7 text-sm border-0 p-0 text-center" />
                    <span className="text-xs text-muted-foreground">/meal max</span>
                </div>

                <Select aria-label="Select option" value={dietaryFilter} onValueChange={setDietaryFilter}>
                    <SelectTrigger aria-label="Select option" className="w-36">
                        <Leaf className="h-3 w-3 mr-1" /><SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{"No "}Restriction</SelectItem>
                        <SelectItem value="vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="vegan">Vegan</SelectItem>
                        <SelectItem value="gluten_free">Gluten Free</SelectItem>
                    </SelectContent>
                </Select>

                <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.success('Bill of Materials generated')}>
                        <Copy className="h-3.5 w-3.5 mr-1" /> Generate BOM
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast.info('AI generating optimized menu...')}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> AI Auto-Fill
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <StatCard icon={DollarSign} label="Weekly Cost" value={`€${weekStats.totalCost.toLocaleString()}`}
                    subtext={`${guestCount} guests × 14 meals`} color="text-green-500" />
                <StatCard icon={Target} label="Avg Cost/Meal"
                    value={`€${weekStats.avgCostPerGuest.toFixed(2)}`}
                    subtext={weekStats.underBudget ? '✅ Under budget' : '⚠️ Over ceiling'}
                    color={weekStats.underBudget ? 'text-green-500' : 'text-red-500'} />
                <StatCard icon={ChefHat} label="Total Recipes" value={weekStats.totalRecipes} color="text-purple-500" />
                <StatCard icon={Clock} label="Avg Calories/Meal" value={weekStats.totalCalories.toLocaleString()}
                    subtext="per guest" color="text-orange-500" />
                <StatCard icon={AlertTriangle} label="Allergens Present" value={weekStats.uniqueAllergens}
                    subtext="unique allergens" color="text-amber-500" />
            </div>

            {/* Weekly Grid */}
            <div className="overflow-x-auto">
                <div className="grid gap-2" style={{ gridTemplateColumns: `80px repeat(${DAYS.length}, 1fr)`, minWidth: '900px' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    {/* Header */}
                    <div />
                    {DAYS.map(day => (
                        <div key={day} className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground py-2 border-b">
                            {day.slice(0, 3)}
                        </div>
                    ))}

                    {/* Meal slots */}
                    {MEAL_SLOTS.map(meal => (
                        <React.Fragment key={meal}>
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-3 flex items-start">
                                {meal}
                            </div>
                            {DAYS.map(day => {
                                const key = `${day}-${meal}`;
                                const recipeIds = menuPlan[key] || [];
                                const slotCost = recipeIds.reduce((s, id) => {
                                    const r = RECIPE_POOL.find(rr => rr.id === id);
                                    return s + (r?.cost || 0);
                                }, 0);
                                const overBudget = slotCost > costCeiling;

                                return (
                                    <Card key={key} className={`min-h-24 border-border/50 ${overBudget ? 'border-red-500/30 bg-red-500/5' : 'bg-card/30'}`}>
                                        <CardContent className="p-2 space-y-1">
                                            {recipeIds.map((id, idx) => {
                                                const recipe = RECIPE_POOL.find(r => r.id === id);
                                                if (!recipe) return null;
                                                return (
                                                    <div key={`${id}-${idx}`} className="group flex items-center gap-1 px-1.5 py-1 rounded-md bg-background/60 hover:bg-background transition-colors">
                                                        <span className="text-[10px] flex-1 truncate">{recipe.name}</span>
                                                        <span className="text-[9px] tabular-nums text-muted-foreground">€{recipe.cost.toFixed(2)}</span>
                                                        <button className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                                                            onClick={() => removeRecipeFromSlot(day, meal, id)}>
                                                            <Trash2 className="h-2.5 w-2.5" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            <button
                                                onClick={() => { setSelectedSlot({ day, meal }); setShowAddRecipe(true); }}
                                                className="w-full py-1 text-[10px] text-muted-foreground hover:text-primary border border-dashed border-border/50 hover:border-primary/30 rounded transition-all flex items-center justify-center gap-1">
                                                <Plus className="h-2.5 w-2.5" /> Add
                                            </button>
                                            {overBudget && <p className="text-[9px] text-red-600 dark:text-red-400 text-center">€{slotCost.toFixed(2)} — over budget</p>}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Add Recipe Dialog */}
            <Dialog open={showAddRecipe} onOpenChange={setShowAddRecipe}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Recipe — {selectedSlot?.day} {selectedSlot?.meal}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {RECIPE_POOL.map(recipe => (
                            <button key={recipe.id}
                                onClick={() => addRecipeToSlot(recipe.id)}
                                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent/20 transition-all text-left">
                                <ChefHat className="h-4 w-4 text-primary" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{recipe.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{recipe.category} · {recipe.calories} kcal</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold tabular-nums">€{recipe.cost.toFixed(2)}</p>
                                    <div className="flex gap-0.5 justify-end">
                                        {recipe.allergens.slice(0, 2).map(a => (
                                            <Badge key={a} variant="outline" className="text-[8px] px-1">{a}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
