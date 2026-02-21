import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

import { Button } from '../../components/ui/button';

import { Input } from '../../components/ui/input';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

import { Plus, Trash2, Save } from 'lucide-react';

import PageContainer from '../../layouts/PageContainer';

import DataTable from '../../components/shared/DataTable';

import LoadingSpinner from '../../components/shared/LoadingSpinner';

import EmptyState from '../../components/shared/EmptyState';

import { toast } from 'sonner';

import api from '../../lib/api';

import { useAuth } from '@/context/AuthContext';

export default function RecipeManagementComplete() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [components, setComponents] = useState([{ item_id: '', quantity: 1, unit: 'kg' }]);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      if (!user?.venueId) return;
      const response = await api.get(`/venues/${user.venueId}/recipes/engineered`);
      setRecipes(response.data.items || []);
    } catch (error) {
      logger.error('Failed to load recipes:', error);
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...editingRecipe,
        components
      };

      const recipeData = {
        recipe_name: editingRecipe.name,
        ingredients: components,
        venue_id: user?.venueId
      };

      if (editingRecipe?.id) {
        await api.put(`/venues/${user.venueId}/recipes/engineered/${editingRecipe.id}`, recipeData);
        toast.success('Recipe updated');
      } else {
        await api.post(`/venues/${user.venueId}/recipes/engineered`, recipeData);
        toast.success('Recipe created');
      }

      setShowDialog(false);
      setEditingRecipe(null);
      loadRecipes();
    } catch (error) {
      logger.error('Failed to save recipe:', error);
      toast.error('Failed to save recipe');
    }
  };

  const columns = [
    { key: 'name', label: 'Recipe Name' },
    { key: 'yield', label: 'Yield', render: (row) => `${row.yield_quantity} ${row.yield_unit}` },
    { key: 'cost', label: 'Cost', render: (row) => `€${row.total_cost?.toFixed(2) || '0.00'}` },
    { key: 'components', label: 'Components', render: (row) => row.components?.length || 0 },
  ];

  if (loading) return <LoadingSpinner fullScreen className="" />;

  return (
    <PageContainer
      title="Recipe Management"
      description="Manage recipes and their components"
      actions={
        <Button onClick={() => { setEditingRecipe({}); setComponents([{ item_id: '', quantity: 1, unit: 'kg' }]); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Recipe
        </Button>
      }
    >
      {recipes.length === 0 ? (
        <EmptyState
          title="No Recipes"
          description="Create your first recipe to get started"
          action={() => setShowDialog(true)}
          actionLabel="Create Recipe"
        />
      ) : (
        <DataTable
          columns={columns}
          data={recipes}
          onRowClick={(recipe) => { setEditingRecipe(recipe); setComponents(recipe.components || []); setShowDialog(true); }}
        />
      )}

      {/* Recipe Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingRecipe?.id ? 'Edit Recipe' : 'New Recipe'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label style={{ color: '#D4D4D8' }}>Recipe Name</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
              <Input aria-label="Input field"
                value={editingRecipe?.name || ''}
                onChange={(e) => setEditingRecipe(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter recipe name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ color: '#D4D4D8' }}>Yield Quantity</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <Input aria-label="Input field"
                  type="number"
                  value={editingRecipe?.yield_quantity || ''}
                  onChange={(e) => setEditingRecipe(prev => ({ ...prev, yield_quantity: parseFloat(e.target.value) }))}
                />
              </div>
              <div>
                <label style={{ color: '#D4D4D8' }}>Yield Unit</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <Input aria-label="Input field"
                  value={editingRecipe?.yield_unit || ''}
                  onChange={(e) => setEditingRecipe(prev => ({ ...prev, yield_unit: e.target.value }))}
                  placeholder="kg, portions, etc."
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label style={{ color: '#D4D4D8' }}>Components</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <Button size="sm" onClick={() => setComponents(prev => [...prev, { item_id: '', quantity: 1, unit: 'kg' }])}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {components.map((comp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input aria-label="Item ID"
                      placeholder="Item ID"
                      value={comp.item_id}
                      onChange={(e) => {
                        const newComps = [...components];
                        newComps[idx].item_id = e.target.value;
                        setComponents(newComps);
                      }}
                      className="flex-1"
                    />
                    <Input aria-label="Qty"
                      type="number"
                      placeholder="Qty"
                      value={comp.quantity}
                      onChange={(e) => {
                        const newComps = [...components];
                        newComps[idx].quantity = parseFloat(e.target.value);
                        setComponents(newComps);
                      }}
                      className="w-24"
                    />
                    <Input aria-label="Unit"
                      placeholder="Unit"
                      value={comp.unit}
                      onChange={(e) => {
                        const newComps = [...components];
                        newComps[idx].unit = e.target.value;
                        setComponents(newComps);
                      }}
                      className="w-24"
                    />
                    <Button
                      size="icon" aria-label="Action"
                      variant="outline"
                      onClick={() = aria-label="Action"> setComponents(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Recipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}