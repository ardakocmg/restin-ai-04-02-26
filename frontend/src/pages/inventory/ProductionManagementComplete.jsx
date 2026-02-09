import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

import { Button } from '../../components/ui/button';

import { Input } from '../../components/ui/input';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

import { Plus, Calendar } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';

import { Label } from '../../components/ui/label';

import PageContainer from '../../layouts/PageContainer';

import DataTable from '../../components/shared/DataTable';

import LoadingSpinner from '../../components/shared/LoadingSpinner';

import { toast } from 'sonner';

import api from '../../lib/api';

import { useAuth } from '../../hooks/useAuth';

export default function ProductionManagementComplete() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBatch, setNewBatch] = useState({
    recipe_id: '',
    planned_quantity: '',
    unit: 'portions',
    status: 'PLANNED'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchesRes, recipesRes] = await Promise.all([
        api.get(`/api/inventory/production-batches?venue_id=${user?.venue_id}`),
        api.get(`/api/venues/${user?.venue_id}/recipes/engineered?active=true`)
      ]);
      setBatches(batchesRes.data || []);
      setRecipes(recipesRes.data || []);
    } catch (error) {
      logger.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!newBatch.recipe_id || !newBatch.planned_quantity) {
      toast.error("Please select a recipe and quantity");
      return;
    }

    try {
      await api.post('/api/inventory/production-batches', {
        venue_id: user?.venue_id,
        recipe_id: newBatch.recipe_id,
        batch_number: `BATCH-${Date.now()}`,
        planned_quantity: parseFloat(newBatch.planned_quantity),
        unit: newBatch.unit,
        status: newBatch.status
      });
      toast.success('Production batch created');
      setIsCreateOpen(false);
      loadData();
      // Reset form
      setNewBatch({ recipe_id: '', planned_quantity: '', unit: 'portions', status: 'PLANNED' });
    } catch (error) {
      logger.error(error);
      toast.error('Failed to create batch');
    }
  };

  const columns = [
    { key: 'batch_id', label: 'Batch ID' },
    { key: 'recipe_name', label: 'Recipe' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'status', label: 'Status' },
    { key: 'produced_at', label: 'Produced', render: (row) => new Date(row.produced_at).toLocaleDateString() },
  ];

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <PageContainer
      title="Production Management"
      description="Track production batches"
      actions={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Batch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Production Batch</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="recipe" className="text-right">
                  Recipe
                </Label>
                <div className="col-span-3">
                  <Select
                    value={newBatch.recipe_id}
                    onValueChange={(val) => setNewBatch({ ...newBatch, recipe_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes.map(recipe => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">
                  Quantity
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={newBatch.planned_quantity}
                  onChange={(e) => setNewBatch({ ...newBatch, planned_quantity: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unit" className="text-right">
                  Unit
                </Label>
                <Input
                  id="unit"
                  value={newBatch.unit}
                  onChange={(e) => setNewBatch({ ...newBatch, unit: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateBatch}>Create Batch</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <DataTable columns={columns} data={batches} />
    </PageContainer>
  );
}