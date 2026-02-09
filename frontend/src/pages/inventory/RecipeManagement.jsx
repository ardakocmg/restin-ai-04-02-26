import React, { useState, useEffect } from 'react';import { logger } from '@/lib/logger';

import { Plus, ChefHat, Search, Filter, Save, Trash2, Calculator, Info } from 'lucide-react';import { logger } from '@/lib/logger';

import axios from 'axios';import { logger } from '@/lib/logger';

import { toast } from 'sonner';import { logger } from '@/lib/logger';

import StateModal from '../../components/StateModal';import { logger } from '@/lib/logger';

import { Button } from '../../components/ui/button';import { logger } from '@/lib/logger';

import { Input } from '../../components/ui/input';import { logger } from '@/lib/logger';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';import { logger } from '@/lib/logger';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

import { logger } from '@/lib/logger';
const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function RecipeManagement() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [venueId] = useState(localStorage.getItem('currentVenueId') || 'venue-caviar-bull'); // Simplified for now

  // Form State
  const [formData, setFormData] = useState({
    recipe_name: '',
    description: '',
    category: 'main',
    servings: 1,
    prep_time_minutes: 0,
    cook_time_minutes: 0,
    ingredients: [], // { item_id, item_name, quantity, unit, unit_cost, total_cost }
    instructions: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('restin_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [recipesRes, itemsRes] = await Promise.all([
        axios.get(`${API_URL}/api/venues/${venueId}/recipes/engineered?limit=100&page=1`, { headers }),
        axios.get(`${API_URL}/api/venues/${venueId}/inventory`, { headers })
      ]);

      setRecipes(recipesRes.data || []);
      setInventoryItems(itemsRes.data.items || []);
    } catch (error) {
      logger.error('Error loading data:', error);
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const calculateCost = (ingredients) => {
    return ingredients.reduce((sum, ing) => sum + (ing.total_cost || 0), 0);
  };

  const handleAddIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { item_id: '', quantity: 0, unit: 'kg', unit_cost: 0, total_cost: 0 }]
    });
  };

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...formData.ingredients];
    const ingredient = { ...newIngredients[index], [field]: value };

    if (field === 'item_id') {
      const selectedItem = inventoryItems.find(i => i.id === value);
      if (selectedItem) {
        ingredient.item_name = selectedItem.name;
        // In real app, we'd fetch latest cost price
        ingredient.unit = selectedItem.unit;
        ingredient.unit_cost = 5.00; // Mock unit cost €5.00
      }
    }

    // Recalculate line cost
    if (field === 'quantity' || field === 'unit_cost' || field === 'item_id') {
      ingredient.total_cost = (parseFloat(ingredient.quantity) || 0) * (parseFloat(ingredient.unit_cost) || 0);
    }

    newIngredients[index] = ingredient;
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const handleRemoveIngredient = (index) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      await axios.post(
        `${API_URL}/api/venues/${venueId}/recipes/engineered`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Recipe created successfully');
      setShowCreateModal(false);
      loadData();
      // Reset form
      setFormData({
        recipe_name: '',
        description: '',
        category: 'main',
        servings: 1,
        ingredients: [],
        instructions: []
      });
    } catch (error) {
      logger.error('Error creating recipe:', error);
      toast.error('Failed to create recipe');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-body text-zinc-200">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-2">Recipe Engineering</h1>
          <p className="text-zinc-500">Design recipes, calculate costs, and manage margins.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold">
          <Plus className="w-4 h-4 mr-2" />
          New Recipe
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 hover:border-red-500/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-white/5 group-hover:bg-red-500/10 group-hover:text-red-500 transition-colors">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-red-500 transition-colors">{recipe.recipe_name}</h3>
                  <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">{recipe.category}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-white">€{recipe.cost_analysis?.cost_per_serving?.toFixed(2)}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">COST / SRV</div>
              </div>
            </div>

            <div className="space-y-2 mb-4 bg-zinc-950/50 rounded-lg p-3 border border-white/5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Ingredients ({recipe.ingredients?.length || 0})</span>
                <span className="text-zinc-300">€{recipe.cost_analysis?.total_cost?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500 whitespace-nowrap">Suggested Price</span>
                <span className="text-green-400 font-bold">€{recipe.cost_analysis?.suggested_price?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Margin</span>
                <span className="text-zinc-300">{recipe.cost_analysis?.markup_percentage}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
              <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Yield: {recipe.servings} srv</span>
              <span>v{recipe.version}</span>
            </div>
          </div>
        ))}

        {recipes.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
            <ChefHat className="w-16 h-16 text-zinc-700 mb-4" />
            <h3 className="text-xl font-bold text-zinc-500">No Recipes Found</h3>
            <p className="text-zinc-600 mb-6">Start by creating your first engineered recipe</p>
            <Button variant="outline" onClick={() => setShowCreateModal(true)}>Create Recipe</Button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl bg-zinc-950 border-zinc-800 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-heading">New Engineered Recipe</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-4">
            {/* Left Col: Basics */}
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase font-bold text-zinc-500">Recipe Name</label>
                <Input
                  value={formData.recipe_name}
                  onChange={(e) => setFormData({ ...formData, recipe_name: e.target.value })}
                  className="bg-zinc-900 border-zinc-800 focus:ring-red-500/20"
                  placeholder="e.g. Truffle Pasta"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase font-bold text-zinc-500">Category</label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-800">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                      <SelectItem value="main">Main Course</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="dessert">Dessert</SelectItem>
                      <SelectItem value="beverage">Beverage</SelectItem>
                      <SelectItem value="prep">Prep Item</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs uppercase font-bold text-zinc-500">Servings (Yield)</label>
                  <Input
                    type="number"
                    value={formData.servings}
                    onChange={(e) => setFormData({ ...formData, servings: parseFloat(e.target.value) })}
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase font-bold text-zinc-500">Prep (m)</label>
                  <Input
                    type="number"
                    value={formData.prep_time_minutes}
                    onChange={(e) => setFormData({ ...formData, prep_time_minutes: parseInt(e.target.value) })}
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase font-bold text-zinc-500">Cook (m)</label>
                  <Input
                    type="number"
                    value={formData.cook_time_minutes}
                    onChange={(e) => setFormData({ ...formData, cook_time_minutes: parseInt(e.target.value) })}
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
              </div>
            </div>

            {/* Right Col: Ingredients & Costing */}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-red-500" />
                  Cost Engineering
                </h3>
                <Button size="sm" variant="ghost" onClick={handleAddIngredient} className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                  <Plus className="w-3 h-3 mr-1" /> Add Ingredient
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2 mb-4 max-h-[300px]">
                {formData.ingredients.map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-black/20 p-2 rounded-lg border border-white/5">
                    <div className="col-span-12 md:col-span-5">
                      <Select
                        value={ing.item_id}
                        onValueChange={(val) => handleIngredientChange(idx, 'item_id', val)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-transparent border-transparent hover:bg-white/5">
                          <SelectValue placeholder="Select Item" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                          {inventoryItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={ing.quantity}
                        onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                        className="h-8 text-xs bg-transparent border-white/10"
                      />
                    </div>
                    <div className="col-span-3 text-right text-xs font-mono">
                      €{ing.total_cost?.toFixed(2)}
                    </div>
                    <div className="col-span-1">
                      <button onClick={() => handleRemoveIngredient(idx)} className="text-zinc-600 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {formData.ingredients.length === 0 && (
                  <div className="text-center py-8 text-zinc-600 text-xs italic">
                    Add ingredients to calculate cost
                  </div>
                )}
              </div>

              <div className="mt-auto border-t border-white/10 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Total Cost</span>
                  <span className="text-white font-bold">€{calculateCost(formData.ingredients).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Cost / Serving</span>
                  <span className="text-red-500 font-bold">
                    €{(calculateCost(formData.ingredients) / (formData.servings || 1)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              Save Recipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
