import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { Package, AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';

import api from '../../lib/api';

import { useVenue } from '../../context/VenueContext';

const chartTheme = {
  background: '#18181B',
  text: '#D4D4D8',
  grid: 'rgba(255, 255, 255, 0.1)',
  primary: '#E53935',
  success: '#4ADE80',
  warning: '#FB8C00'
};

export default function InventoryReports() {
  const { activeVenue } = useVenue();
  const [loading, setLoading] = useState(true);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [metrics, setMetrics] = useState({ total_items: 0, low_stock_alerts: 0, waste_cost_week: 0, inventory_value: 0 });
  const [wasteTrend, setWasteTrend] = useState([]);
  const [costVariance, setCostVariance] = useState([]);

  useEffect(() => {
    if (activeVenue?.id) loadData();
  }, [activeVenue?.id]);

  const loadData = async () => {
    try {
      // Load inventory items for low stock
      const [itemsRes, analyticsRes] = await Promise.all([
        api.get('/inventory/items', { params: { venue_id: activeVenue.id } }).catch(() => ({ data: { items: [] } })),
        api.get('/inventory/analytics', { params: { venue_id: activeVenue.id } }).catch(() => ({ data: {} }))
      ]);

      const items = itemsRes.data.items || [];
      const lowStock = items.filter(item => item.current_stock < item.reorder_level);
      setLowStockItems(lowStock);

      const analytics = analyticsRes.data;
      setMetrics(analytics.metrics || { total_items: items.length, low_stock_alerts: lowStock.length, waste_cost_week: 0, inventory_value: 0 });
      setWasteTrend(analytics.waste_trend || []);
      setCostVariance(analytics.cost_variance || []);
    } catch (error) {
      logger.warn('Error loading inventory reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center">
        <div className="text-white">Loading Inventory Reports...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-heading mb-2" style={{ color: '#F5F5F7' }}>
          INVENTORY ANALYTICS
        </h1>
        <p style={{ color: '#A1A1AA' }}>Stock levels, waste trends, and cost analysis</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card-dark p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-5 h-5 text-green-500" />
            <span className="text-xs" style={{ color: '#71717A' }}>Total</span>
          </div>
          <div className="text-3xl font-bold text-green-500 mb-1">{metrics.total_items}</div>
          <div className="text-sm" style={{ color: '#A1A1AA' }}>Items in Stock</div>
        </div>

        <div className="stat-card-danger p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-xs" style={{ color: '#71717A' }}>Alert</span>
          </div>
          <div className="text-3xl font-bold text-red-500 mb-1">{lowStockItems.length}</div>
          <div className="text-sm" style={{ color: '#A1A1AA' }}>Low Stock Items</div>
        </div>

        <div className="stat-card-dark p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-5 h-5 text-yellow-500" />
            <span className="text-xs" style={{ color: '#71717A' }}>This Month</span>
          </div>
          <div className="text-3xl font-bold text-yellow-500 mb-1">€{metrics.waste_cost_week}</div>
          <div className="text-sm" style={{ color: '#A1A1AA' }}>Waste Cost</div>
        </div>

        <div className="stat-card-dark p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-blue-500" />
            <span className="text-xs" style={{ color: '#71717A' }}>Value</span>
          </div>
          <div className="text-3xl font-bold text-blue-500 mb-1">€{(metrics.inventory_value || 0).toLocaleString()}</div>
          <div className="text-sm" style={{ color: '#A1A1AA' }}>Total Inventory</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Waste Trend */}
        <div className="chart-container-dark">
          <h3 className="text-xl font-heading mb-4" style={{ color: '#F5F5F7' }}>Waste Trend</h3>
          {wasteTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={wasteTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="month" stroke={chartTheme.text} />
                <YAxis stroke={chartTheme.text} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#F5F5F7' }}
                />
                <Legend wrapperStyle={{ color: chartTheme.text }} />
                <Line type="monotone" dataKey="cost" stroke={chartTheme.primary} strokeWidth={2} name="Waste Cost (€)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-zinc-500">No waste trend data yet</div>
          )}
        </div>

        {/* Cost Variance */}
        <div className="chart-container-dark">
          <h3 className="text-xl font-heading mb-4" style={{ color: '#F5F5F7' }}>Cost Variance</h3>
          {costVariance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costVariance}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="item" stroke={chartTheme.text} />
                <YAxis stroke={chartTheme.text} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#F5F5F7' }}
                />
                <Bar dataKey="variance" fill={chartTheme.primary} name="Variance (%)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-zinc-500">No cost variance data yet</div>
          )}
        </div>
      </div>

      {/* Low Stock Alerts Table */}
      <div className="chart-container-dark">
        <h3 className="text-xl font-heading mb-4" style={{ color: '#F5F5F7' }}>Low Stock Alerts</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: '#D4D4D8' }}>Item</th>
                <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: '#D4D4D8' }}>Current Stock</th>
                <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: '#D4D4D8' }}>Reorder Level</th>
                <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: '#D4D4D8' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8" style={{ color: '#71717A' }}>
                    No low stock items
                  </td>
                </tr>
              ) : (
                lowStockItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-zinc-800/50 transition-colors">
                    <td className="py-3 px-4" style={{ color: '#F5F5F7' }}>{item.name}</td>
                    <td className="py-3 px-4 text-red-400">{item.current_stock} {item.base_unit}</td>
                    <td className="py-3 px-4" style={{ color: '#A1A1AA' }}>{item.reorder_level} {item.base_unit}</td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-950/30 text-red-400 border border-red-500/30">
                        LOW
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}