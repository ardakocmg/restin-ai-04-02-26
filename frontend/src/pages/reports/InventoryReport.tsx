import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { Package, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';

import PageContainer from '../../layouts/PageContainer';

import LoadingSpinner from '../../components/shared/LoadingSpinner';

import { Badge } from '../../components/ui/badge';

import api from '../../lib/api';

import { useVenue } from '../../context/VenueContext';

export default function InventoryReport() {
  const { activeVenue } = useVenue();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [stockLevels, setStockLevels] = useState([]);
  const [wasteData, setWasteData] = useState([]);

  useEffect(() => {
    if (activeVenue?.id) loadData();
  }, [activeVenue?.id]);

  const loadData = async () => {
    try {
      const res = await api.get('/inventory/analytics', { params: { venue_id: activeVenue.id } });
      const d = res.data;
      setMetrics(d.metrics);
      setStockLevels(d.stock_levels || []);
      setWasteData(d.waste_trend || []);
    } catch (err) {
      logger.warn('Inventory report API failed');
      setMetrics({ total_items: 0, low_stock_alerts: 0, waste_cost_week: 0, inventory_value: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen className="" text="Loading inventory report..." />;

  return (
    <PageContainer title="Inventory Report" description="Stock levels and waste analysis">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Total Items</CardTitle>
              <Package className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">{metrics?.total_items || 0}</div>
              <p className="text-xs text-zinc-500">Across all categories</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{metrics?.low_stock_alerts || 0}</div>
              <p className="text-xs text-zinc-500">Items need reorder</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Waste This Week</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">€{metrics?.waste_cost_week || 0}</div>
              <p className="text-xs text-zinc-500">Weekly waste cost</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Stock Value</CardTitle>
              <DollarSign className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">€{(metrics?.inventory_value || 0).toLocaleString()}</div>
              <p className="text-xs text-zinc-500">Current inventory</p>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Level Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stockLevels.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex-1">
                      <h4 className="font-medium text-zinc-100">—</h4>
                      <p className="text-sm text-zinc-400">Current: 0 | Min: 0</p>
                    </div>
                    <div className="text-right mr-4">
                      <div className="text-sm font-medium text-zinc-300">€0</div>
                    </div>
                    <Badge variant="secondary">OK</Badge>
                  </div>
                ))
              ) : stockLevels.map((item) => (
                <div key={item.item} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex-1">
                    <h4 className="font-medium text-zinc-100">{item.item}</h4>
                    <p className="text-sm text-zinc-400">Current: {item.current} | Min: {item.min}</p>
                  </div>
                  <div className="text-right mr-4">
                    <div className="text-sm font-medium text-zinc-300">€{item.cost}</div>
                  </div>
                  <Badge variant={item.status === 'critical' ? 'destructive' : item.status === 'low' ? 'outline' : 'secondary'}>
                    {item.status === 'critical' ? 'Critical' : item.status === 'low' ? 'Low' : 'OK'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Waste Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Waste Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={wasteData.length > 0 ? wasteData : [{ date: 'Mon', cost: 0 }, { date: 'Tue', cost: 0 }, { date: 'Wed', cost: 0 }, { date: 'Thu', cost: 0 }, { date: 'Fri', cost: 0 }, { date: 'Sat', cost: 0 }, { date: 'Sun', cost: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#A1A1AA" />
                <YAxis stroke="#A1A1AA" />
                <Tooltip contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F7' }} /> {/* keep-inline: Recharts requires style object */}
                <Legend wrapperStyle={{ color: '#D4D4D8' }} /> {/* keep-inline: Recharts requires style object */}
                <Bar dataKey="cost" fill="#EF4444" name="Waste Cost (€)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}