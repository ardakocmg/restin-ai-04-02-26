import { useState, useEffect } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { ChefHat, DollarSign } from 'lucide-react';
import api from '../../../lib/api';
import { logger } from '@/lib/logger';

export default function RecipeList() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/recipes/engineered`);
      setRecipes(response.data || []);
    } catch (error: any) {
      logger.error('Failed to fetch recipes:', error);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Recipe List" description="Engineered recipes with cost analysis">
      <div className="space-y-4">
        {loading ? <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card> : recipes.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">No recipes found</CardContent></Card> : recipes.map((recipe) => (
          <Card key={recipe.id} className="border-slate-700"><CardContent className="p-6"><div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><ChefHat className="h-5 w-5 text-green-400" /><h3 className="text-lg font-semibold text-slate-50">{recipe.recipe_name}</h3><Badge className={recipe.active ? 'bg-green-600/20 text-green-100' : 'bg-gray-600/20 text-gray-100'}>{recipe.active ? 'Active' : 'Inactive'}</Badge></div><p className="text-sm text-muted-foreground mb-3">{recipe.description}</p><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"><div><p className="text-slate-400">Ingredients</p><p className="font-medium">{recipe.ingredients?.length || 0}</p></div><div><p className="text-slate-400">Servings</p><p className="font-medium">{recipe.servings}</p></div><div><p className="text-slate-400">Cost/Serving</p><p className="font-medium text-green-400">${recipe.cost_analysis?.cost_per_serving?.toFixed(2) || '0.00'}</p></div><div><p className="text-slate-400">Version</p><p className="font-medium">v{recipe.version}</p></div></div></div></div></CardContent></Card>
        ))}
      </div>
    </PageContainer>
  );
}
