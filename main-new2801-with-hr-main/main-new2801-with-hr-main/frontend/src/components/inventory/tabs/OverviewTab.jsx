import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingDown, AlertTriangle } from 'lucide-react';

export default function OverviewTab({ data, onRefresh }) {
  const sku = data?.sku || {};
  const balance = data?.on_hand_balance || 0;
  const minStock = sku.min_stock || sku.min_quantity || 0;
  
  const isLow = balance <= minStock;
  const isNegative = balance < 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {sku.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600">SKU ID</p>
              <p className="font-medium">{sku.display_id || sku.id?.substring(0, 8)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Category</p>
              <p className="font-medium">{sku.category || 'Uncategorized'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Base UOM</p>
              <p className="font-medium">{sku.unit || 'EA'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Status</p>
              {isNegative ? (
                <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                  <AlertTriangle className="h-3 w-3" />
                  Negative Stock
                </Badge>
              ) : isLow ? (
                <Badge variant="outline" className="flex items-center gap-1 w-fit text-orange-600 border-orange-600">
                  <TrendingDown className="h-3 w-3" />
                  Low Stock
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  OK
                </Badge>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">On-Hand Balance</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {balance.toFixed(2)} {sku.unit}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Min Stock</p>
                <p className="text-xl font-medium text-slate-700 mt-1">
                  {minStock.toFixed(2)} {sku.unit}
                </p>
              </div>
            </div>
          </div>

          {sku.tags && sku.tags.length > 0 && (
            <div>
              <p className="text-sm text-slate-600 mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {sku.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
