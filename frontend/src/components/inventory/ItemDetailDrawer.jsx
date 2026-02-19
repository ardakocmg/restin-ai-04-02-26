import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import api from '../../lib/api';
import Drawer from '../shared/Drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import OverviewTab from './tabs/OverviewTab';
import SuppliersPricingTab from './tabs/SuppliersPricingTab';
import RecipeTab from './tabs/RecipeTab';
import MovementsTab from './tabs/MovementsTab';
import ProductionTab from './tabs/ProductionTab';
import WasteTab from './tabs/WasteTab';
import AuditTab from './tabs/AuditTab';
import AllergensTab from './tabs/AllergensTab';
import NutritionTab from './tabs/NutritionTab';

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
      logger.error('Failed to load item detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (updates) => {
    try {
      await api.put(`/inventory/items/${skuId}?venue_id=${venueId}`, updates);
      toast.success('Item updated');
      loadItemDetail();
    } catch (error) {
      logger.error('Failed to update item:', error);
      toast.error('Failed to update item');
    }
  };

  const sku = detail?.sku || {};
  const allergenCount = sku.allergens?.length || 0;

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
          <TabsList className="flex w-full overflow-x-auto">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="suppliers" className="text-xs">Suppliers</TabsTrigger>
            <TabsTrigger value="allergens" className="text-xs">
              Allergens
              {allergenCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center rounded-full">
                  {allergenCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="text-xs">Nutrition</TabsTrigger>
            <TabsTrigger value="recipe" className="text-xs">Recipe</TabsTrigger>
            <TabsTrigger value="movements" className="text-xs">Movements</TabsTrigger>
            <TabsTrigger value="production" className="text-xs">Production</TabsTrigger>
            <TabsTrigger value="waste" className="text-xs">Waste</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <OverviewTab data={detail} onRefresh={loadItemDetail} />
          </TabsContent>

          <TabsContent value="suppliers" className="mt-4">
            <SuppliersPricingTab data={detail.suppliers_pricing} sku={detail.sku} />
          </TabsContent>

          <TabsContent value="allergens" className="mt-4">
            <AllergensTab data={detail} sku={detail.sku} onSave={handleSaveField} />
          </TabsContent>

          <TabsContent value="nutrition" className="mt-4">
            <NutritionTab data={detail} sku={detail.sku} onSave={handleSaveField} />
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
