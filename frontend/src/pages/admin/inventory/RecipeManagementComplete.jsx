import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { ChefHat, Plus, Search, Layers, DollarSign, Clock, Users, Edit, Eye, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';

export default function RecipeManagementComplete() {
  const { user, isManager, isOwner } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
      const res = await api.get(`/inventory/recipes?venue_id=${venueId}`);
      setRecipes(res.data || []);
    } catch {
      setRecipes([
        { id: '1', name: 'Risotto ai Funghi Porcini', category: 'Main Course', portions: 1, cost: 485, selling_price: 2200, margin: 78, prep_time: 35, allergens: ['Dairy', 'Gluten'], ingredients_count: 8 },
        { id: '2', name: 'Tiramisu Classico', category: 'Dessert', portions: 1, cost: 280, selling_price: 1400, margin: 80, prep_time: 20, allergens: ['Dairy', 'Eggs', 'Gluten'], ingredients_count: 6 },
        { id: '3', name: 'Bruschetta Trio', category: 'Starters', portions: 3, cost: 220, selling_price: 1100, margin: 80, prep_time: 15, allergens: ['Gluten'], ingredients_count: 7 },
        { id: '4', name: 'Linguine allo Scoglio', category: 'Main Course', portions: 1, cost: 620, selling_price: 2600, margin: 76, prep_time: 25, allergens: ['Gluten', 'Shellfish'], ingredients_count: 10 },
        { id: '5', name: 'Caesar Salad', category: 'Starters', portions: 1, cost: 180, selling_price: 1200, margin: 85, prep_time: 10, allergens: ['Dairy', 'Eggs', 'Fish'], ingredients_count: 8 },
        { id: '6', name: 'Espresso Martini', category: 'Cocktails', portions: 1, cost: 150, selling_price: 1200, margin: 88, prep_time: 5, allergens: [], ingredients_count: 4 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(recipes.map(r => r.category))];
  const filtered = recipes
    .filter(r => filter === 'all' || r.category === filter)
    .filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  const avgMargin = recipes.length ? Math.round(recipes.reduce((s, r) => s + r.margin, 0) / recipes.length) : 0;

  return (
    <PageContainer
      title="Recipe Management"
      description="Recipe engineering with cost analysis and allergen tracking"
      actions={
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Create Recipe
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><ChefHat className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{recipes.length}</p>
                <p className="text-sm text-muted-foreground">Total Recipes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><DollarSign className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold">{avgMargin}%</p>
                <p className="text-sm text-muted-foreground">Avg Margin</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><FlaskConical className="h-5 w-5 text-amber-500" /></div>
              <div>
                <p className="text-2xl font-bold">{recipes.filter(r => r.allergens?.length > 0).length}</p>
                <p className="text-sm text-muted-foreground">With Allergens</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Layers className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-2xl font-bold">{categories.length - 1}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search recipes..." />
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map(cat => (
            <Button key={cat} variant={filter === cat ? 'default' : 'outline'} size="sm" onClick={() => setFilter(cat)} className="capitalize">
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Recipe Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((recipe) => (
          <Card key={recipe.id} className="hover:shadow-md transition group cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{recipe.name}</CardTitle>
                  <CardDescription>{recipe.category}</CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={recipe.margin >= 80
                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                    : recipe.margin >= 70
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }
                >
                  {recipe.margin}% margin
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="font-bold text-sm">€{(recipe.cost / 100).toFixed(2)}</p>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-bold text-sm">€{(recipe.selling_price / 100).toFixed(2)}</p>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Prep</p>
                  <p className="font-bold text-sm">{recipe.prep_time}m</p>
                </div>
              </div>

              {/* Allergens */}
              {recipe.allergens?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {recipe.allergens.map(a => (
                    <Badge key={a} variant="outline" className="text-xs bg-red-500/5 text-red-500 border-red-500/20">
                      ⚠ {a}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{recipe.ingredients_count} ingredients</span>
                <span>{recipe.portions} portion{recipe.portions > 1 ? 's' : ''}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
