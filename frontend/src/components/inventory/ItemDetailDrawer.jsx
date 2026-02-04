import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import Drawer from '../shared/Drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import OverviewTab from './tabs/OverviewTab';
import SuppliersPricingTab from './tabs/SuppliersPricingTab';
import RecipeTab from './tabs/RecipeTab';
import MovementsTab from './tabs/MovementsTab';
import ProductionTab from './tabs/ProductionTab';
import WasteTab from './tabs/WasteTab';
import AuditTab from './tabs/AuditTab';

export default function ItemDetailDrawer({ open, onClose, skuId, venueId }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && skuId && venueId) {
      loadItemDetail();
    }
  }, [open, skuId, venueId]);

  const loadItemDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/inventory/items/${skuId}/detail?venue_id=${venueId}`);
      setDetail(res.data);
    } catch (error) {
      console.error('Failed to load item detail:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={detail?.sku?.name || 'Item Detail'}
      width="xl"
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : detail ? (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="recipe">Recipe</TabsTrigger>
            <TabsTrigger value="movements">Movements</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="waste">Waste</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <OverviewTab data={detail} onRefresh={loadItemDetail} />
          </TabsContent>

          <TabsContent value="suppliers" className="mt-4">
            <SuppliersPricingTab data={detail.suppliers_pricing} sku={detail.sku} />
          </TabsContent>

          <TabsContent value="recipe" className="mt-4">
            <RecipeTab recipeTree={detail.recipe_tree} sku={detail.sku} />
          </TabsContent>

          <TabsContent value="movements" className="mt-4">
            <MovementsTab movements={detail.recent_movements} />
          </TabsContent>

          <TabsContent value="production" className="mt-4">
            <ProductionTab batches={detail.production_batches} />
          </TabsContent>

          <TabsContent value="waste" className="mt-4">
            <WasteTab wasteProfile={detail.waste_profile} sku={detail.sku} />
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <AuditTab entries={detail.audit_entries} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-12 text-slate-500">
          Item not found
        </div>
      )}
    </Drawer>
  );
}
