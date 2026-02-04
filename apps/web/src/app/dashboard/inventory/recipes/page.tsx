'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { ChefHat, Info, Calculator, Plus, Trash2, Save } from 'lucide-react';
import { Input } from '@antigravity/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@antigravity/ui';
import { toast } from 'sonner';

export default function RecipesPage() {
    const [recipes, setRecipes] = useState([
        { id: '1', name: 'Truffle Pasta', category: 'MAIN', cost: 4.50, price: 18.00, margin: 75, yield: 1, version: '1.0', calories: 850, protein: 22, carbs: 90, fat: 45 },
        { id: '2', name: 'Wagyu Burger', category: 'MAIN', cost: 6.20, price: 24.00, margin: 74, yield: 1, version: '2.1', calories: 1200, protein: 55, carbs: 60, fat: 80 },
    ]);

    return (
        <PageContainer title="Recipe Engineering" description="Costing & Margins">
            <div className="flex justify-end mb-6">
                <Button className="bg-red-600 hover:bg-red-700 text-white"><Plus className="h-4 w-4 mr-2" /> New Recipe</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map(recipe => (
                    <div key={recipe.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 group hover:border-red-500/30 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-zinc-800 rounded-lg group-hover:bg-red-900/10 group-hover:text-red-500 transition-colors">
                                    <ChefHat className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{recipe.name}</h3>
                                    <Badge variant="outline" className="text-zinc-500 border-zinc-700">{recipe.category}</Badge>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-bold text-white">€{recipe.cost.toFixed(2)}</div>
                                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Cost / Srv</div>
                            </div>
                        </div>

                        {/* Nutrition (Rule #40 Deep Dive) */}
                        <div className="grid grid-cols-4 gap-2 mb-4 bg-zinc-950/30 p-2 rounded-lg border border-zinc-800/50">
                            <div className="text-center">
                                <div className="text-[10px] text-zinc-500 uppercase">Kcal</div>
                                <div className="text-xs font-bold text-white">{recipe.calories || '-'}</div>
                            </div>
                            <div className="text-center border-l border-zinc-800">
                                <div className="text-[10px] text-zinc-500 uppercase">Prot</div>
                                <div className="text-xs font-bold text-zinc-400">{recipe.protein || '-'}g</div>
                            </div>
                            <div className="text-center border-l border-zinc-800">
                                <div className="text-[10px] text-zinc-500 uppercase">Carb</div>
                                <div className="text-xs font-bold text-zinc-400">{recipe.carbs || '-'}g</div>
                            </div>
                            <div className="text-center border-l border-zinc-800">
                                <div className="text-[10px] text-zinc-500 uppercase">Fat</div>
                                <div className="text-xs font-bold text-zinc-400">{recipe.fat || '-'}g</div>
                            </div>
                        </div>

                        <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800 space-y-2 mb-4">
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-500">Retail Price</span>
                                <span className="text-white font-bold">€{recipe.price.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-500">Margin</span>
                                <span className={`font-bold ${recipe.margin < 70 ? 'text-yellow-500' : 'text-emerald-500'}`}>{recipe.margin}%</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-zinc-500">
                            <span className="flex items-center gap-1"><Info className="h-3 w-3" /> Yield: {recipe.yield}</span>
                            <span>v{recipe.version}</span>
                        </div>
                    </div>
                ))}
            </div>
        </PageContainer>
    );
}
