import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus } from 'lucide-react';
import PageContainer from '../../layouts/PageContainer';
import DataTable from '../../components/shared/DataTable';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function ProductionManagementComplete() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchesRes, recipesRes] = await Promise.all([
        api.get('/api/inventory/production-batches'),
        api.get('/api/inventory/recipes')
      ]);
      setBatches(batchesRes.data || []);
      setRecipes(recipesRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    try {
      await api.post('/api/inventory/production-batches', {
        recipe_id: 'recipe-1',
        quantity: 10,
        produced_at: new Date().toISOString()
      });
      toast.success('Production batch created');
      loadData();
    } catch (error) {
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
        <Button onClick={handleCreateBatch}>
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      }
    >
      <DataTable columns={columns} data={batches} />
    </PageContainer>
  );
}
