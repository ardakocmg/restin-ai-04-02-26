// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { Plus, Factory, Play, CheckCircle, Clock } from 'lucide-react';

import axios from 'axios';

import { toast } from 'sonner';

import { Button } from '../../components/ui/button';

import { Input } from '../../components/ui/input';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProductionManagement() {
  const [batches, setBatches] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [venueId] = useState(localStorage.getItem('currentVenueId') || 'venue-caviar-bull');

  const [formData, setFormData] = useState({
    recipe_id: '',
    batch_date: format(new Date(), 'yyyy-MM-dd'),
    quantity: 1, // Multiplier of recipe yield
    items: [] // Will be populated from recipe
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('restin_token');
      const headers = { Authorization: `Bearer ${token}` };

      // We need endpoints from central_kitchen.py
      const [batchesRes, recipesRes] = await Promise.all([
        axios.get(`${API_URL}/api/venues/${venueId}/production/batches`, { headers }),
        axios.get(`${API_URL}/api/venues/${venueId}/recipes/engineered`, { headers })
      ]);

      setBatches(batchesRes.data || []);
      setRecipes(recipesRes.data || []);
    } catch (error: any) {
      logger.error('Error loading data:', error);
      toast.error('Failed to load production data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBatch = async (batchId) => {
    try {
      const token = localStorage.getItem('restin_token');
      await axios.post(
        `${API_URL}/api/venues/${venueId}/production/batches/${batchId}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Batch started');
      loadData();
    } catch (error: any) {
      toast.error('Failed to start batch');
    }
  };

  const handleCompleteBatch = async (batchId) => {
    try {
      const token = localStorage.getItem('restin_token');
      await axios.post(
        `${API_URL}/api/venues/${venueId}/production/batches/${batchId}/complete`,
        { quality_checked: true, quality_notes: "Routine check passed" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Batch completed');
      loadData();
    } catch (error: any) {
      toast.error('Failed to complete batch');
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('restin_token');

      // Prepare correct payload structure for ProductionBatchRequest
      // items: List[Dict[str, Any]] -> [{item_id, quantity...}]
      // Here we assume simple one-item output for the batch for now or derived from recipe
      // But the model expects 'items' list.
      // Let's Find the recipe and its yield item (simplified)
      const recipe = recipes.find(r => r.id === formData.recipe_id);
      if (!recipe) return;

      const payload = {
        batch_date: formData.batch_date,
        items: [
          {
            item_id: recipe.id, // Using recipe ID as item ID proxy or we need a real produced item ID
            item_name: recipe.recipe_name,
            quantity: formData.quantity * recipe.servings,
            unit: 'srv',
            recipe_id: recipe.id
          }
        ],
        internal_orders: []
      };

      await axios.post(
        `${API_URL}/api/venues/${venueId}/production/batches`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Batch scheduled');
      setShowCreateModal(false);
      loadData();
    } catch (error: any) {
      logger.error(error);
      toast.error('Failed to create batch');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-500 border-green-500/20 bg-green-500/10';
      case 'in_progress': return 'text-blue-500 border-blue-500/20 bg-blue-500/10';
      default: return 'text-muted-foreground border-border bg-secondary';
    }
  };

  if (loading) return <div className="p-6 text-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-6 font-body text-secondary-foreground">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">Production Management</h1>
          <p className="text-muted-foreground">Track kitchen production batches and status.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-red-600 hover:bg-red-700 text-foreground font-bold">
          <Plus className="w-4 h-4 mr-2" />
          Plan Batch
        </Button>
      </div>

      <div className="space-y-4">
        {batches.length === 0 ? (
          <div className="text-center py-20 bg-card/50 rounded-xl border border-dashed border-border">
            <Factory className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-muted-foreground">No Active Batches</h3>
          </div>
        ) : (
          batches.map(batch => (
            <div key={batch.id} className="bg-card/50 border border-border rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-border transition-all">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-3 rounded-lg bg-secondary border border-border">
                  <Factory className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{batch.items?.[0]?.item_name || 'Production Batch'}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{batch.batch_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-center">
                  <span className="block text-xs uppercase font-bold text-muted-foreground">Quantity</span>
                  <span className="text-lg font-bold text-foreground">{batch.items?.[0]?.quantity} {batch.items?.[0]?.unit}</span>
                </div>
                <div className="text-center">
                  <span className="block text-xs uppercase font-bold text-muted-foreground">Date</span>
                  <span className="text-sm font-medium text-secondary-foreground">{batch.batch_date}</span>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(batch.status)}`}>
                    {batch.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {batch.status === 'planned' && (
                  <Button size="sm" onClick={() => handleStartBatch(batch.id)} className="bg-blue-600 hover:bg-blue-700 text-foreground">
                    <Play className="w-4 h-4 mr-2" /> Start
                  </Button>
                )}
                {batch.status === 'in_progress' && (
                  <Button size="sm" onClick={() => handleCompleteBatch(batch.id)} className="bg-green-600 hover:bg-green-700 text-foreground">
                    <CheckCircle className="w-4 h-4 mr-2" /> Complete
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-background border-border text-secondary-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Plan Production Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground">Recipe</label>
              <Select onValueChange={(val) => setFormData({ ...formData, recipe_id: val })}>
                <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Select Recipe" /></SelectTrigger>
                <SelectContent className="bg-card border-border text-secondary-foreground">
                  {recipes.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.recipe_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground">Multiplier (Batches)</label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                className="bg-card border-border"
              />
            </div>
            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground">Date</label>
              <Input
                type="date"
                value={formData.batch_date}
                onChange={(e) => setFormData({ ...formData, batch_date: e.target.value })}
                className="bg-card border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-red-600 text-foreground">Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}