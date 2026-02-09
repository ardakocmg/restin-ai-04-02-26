import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useNavigate } from 'react-router-dom';

import { useVenue } from '../../context/VenueContext';

import { venueAPI } from '../../lib/api';

import PageLayout from '../../layouts/PageLayout';

import { StatCard, StatsGrid } from '../../components/shared/Stats';

import DataTable from '../../components/shared/DataTable';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';

import { Button } from '../../components/ui/button';

import { Badge } from '../../components/ui/badge';

import { Progress } from '../../components/ui/progress';

import {
  ShoppingCart, Clock, Package, AlertTriangle,
  Utensils, Monitor, ChefHat,
  ArrowRight, Activity, CheckCircle2, Users, DollarSign
} from 'lucide-react';

interface VenueStats {
  open_orders: number;
  total_tables: number;
  occupied_tables: number;
  pending_kds_tickets: number;
  low_stock_items: number;
}

interface Order {
  id: string;
  display_id?: string;
  table_name?: string;
  status: string;
  total: number;
  [key: string]: unknown;
}

interface Venue {
  id: string;
  name: string;
  type: string;
  service_style?: string;
  currency?: string;
  currency_symbol?: string;
  pacing_enabled?: boolean;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeVenue } = useVenue() as { activeVenue: Venue | null };
  const [stats, setStats] = useState<VenueStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadDashboardData();
    }
  }, [activeVenue?.id]);

  const loadDashboardData = async () => {
    if (!activeVenue?.id) return;

    try {
      setLoading(true);
      const [statsRes, ordersRes] = await Promise.all([
        venueAPI.getStats(activeVenue.id),
        venueAPI.getOrders(activeVenue.id).catch(() => ({ data: [] }))
      ]);

      setStats(statsRes.data);
      setRecentOrders(ordersRes.data?.slice(0, 5) || []);
    } catch (error) {
      logger.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const occupancyRate = stats?.total_tables
    ? Math.round((stats.occupied_tables / stats.total_tables) * 100)
    : 0;

  // Drill-down handlers
  const handleOpenOrdersClick = () => {
    navigate('/admin/orders?status=open');
  };

  const handleOccupancyClick = () => {
    navigate('/admin/tables?status=occupied');
  };

  const handleKdsClick = () => {
    navigate('/kds/setup');
  };

  const handleLowStockClick = () => {
    navigate('/admin/inventory?filter=low_stock');
  };

  return (
    <PageLayout
      title="Dashboard"
      description={`${activeVenue?.name || 'Select a venue'} — Real-time operations overview`}
      actions={
        <Button
          onClick={loadDashboardData}
          variant="outline"
          size="sm"
          className="bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all shadow-lg"
        >
          <Activity className="h-4 w-4 mr-2 text-red-500" />
          Refresh
        </Button>
      }
    >
      {/* Stats Cards with Drill-down */}
      <StatsGrid columns={4}>
        <div onClick={handleOpenOrdersClick} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatCard
            title="Open Orders"
            value={stats?.open_orders || 0}
            icon={ShoppingCart}
            description="Active orders in system"
          />
        </div>
        <div onClick={handleOccupancyClick} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatCard
            title="Tables Occupied"
            value={`${stats?.occupied_tables || 0}/${stats?.total_tables || 0}`}
            icon={Utensils}
            description={`${occupancyRate}% occupancy`}
            trend={{ value: `${occupancyRate}%`, positive: occupancyRate > 50 }}
          />
        </div>
        <div onClick={handleKdsClick} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatCard
            title="KDS Tickets"
            value={stats?.pending_kds_tickets || 0}
            icon={Clock}
            description="Pending in kitchen"
          />
        </div>
        <div onClick={handleLowStockClick} className="cursor-pointer transition-transform hover:scale-[1.02]">
          <StatCard
            title="Low Stock Items"
            value={stats?.low_stock_items || 0}
            icon={Package}
            description="Below minimum level"
            className={stats?.low_stock_items && stats.low_stock_items > 0 ? 'stat-card-danger' : ''}
          />
        </div>
      </StatsGrid>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Column - Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest orders in the system</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin/finance')}
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10 font-bold uppercase text-[10px] tracking-widest gap-2"
                >
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: 'display_id', label: 'Order #', render: (row: Order) => row.display_id || row.id?.slice(0, 8) },
                  { key: 'table_name', label: 'Table' },
                  {
                    key: 'status', label: 'Status', render: (row: Order) => (
                      <Badge variant={row.status === 'open' ? 'default' : 'secondary'}>
                        {row.status}
                      </Badge>
                    )
                  },
                  { key: 'total', label: 'Total', render: (row: Order) => `€${row.total?.toFixed(2) || '0.00'}` }
                ]}
                data={recentOrders}
                loading={loading}
                emptyMessage="No recent orders"
                onRowClick={(order: Order) => navigate(`/admin/orders/${order.id}`)}
              />
            </CardContent>
          </Card>

          {/* Occupancy Chart */}
          <Card className="card-dark">
            <CardHeader>
              <CardTitle>Table Occupancy</CardTitle>
              <CardDescription>Current table utilization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-zinc-800/50 p-3 rounded-lg border border-white/5">
                  <span className="text-sm font-bold text-zinc-100 uppercase tracking-tighter">Occupancy Rate</span>
                  <span className="text-2xl font-black text-red-500">{occupancyRate}%</span>
                </div>
                <Progress value={occupancyRate} className="h-3 progress-bar-red" />
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Occupied</p>
                    <p className="text-2xl font-black text-green-400">{stats?.occupied_tables || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Available</p>
                    <p className="text-2xl font-black text-blue-400">
                      {(stats?.total_tables || 0) - (stats?.occupied_tables || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Alerts */}
          <Card className={stats?.low_stock_items && stats.low_stock_items > 0 ? 'stat-card-danger' : 'card-dark'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.low_stock_items && stats.low_stock_items > 0 ? (
                <div className="space-y-3">
                  <div
                    className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900 border border-red-500/30 cursor-pointer hover:bg-zinc-800 transition-colors"
                    onClick={handleLowStockClick}
                  >
                    <Package className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#F5F5F7' }}>Low Stock Alert</p>
                      <p className="text-xs mt-1" style={{ color: '#D4D4D8' }}>
                        {stats.low_stock_items} items below minimum level
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full btn-secondary text-zinc-100 dark:text-zinc-100 hover:text-white"
                    onClick={() => navigate('/admin/inventory')}
                  >
                    View Inventory
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm" style={{ color: '#A1A1AA' }}>No active alerts</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start bg-zinc-900 border-white/10 text-zinc-100 hover:bg-zinc-800 transition-colors"
                onClick={() => navigate('/pos/setup')}
              >
                <Monitor className="h-4 w-4 mr-2 text-blue-400" />
                Open POS
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start bg-zinc-900 border-white/10 text-zinc-100 hover:bg-zinc-800 transition-colors"
                onClick={() => navigate('/kds/setup')}
              >
                <ChefHat className="h-4 w-4 mr-2 text-orange-400" />
                Open KDS
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start bg-zinc-900 border-white/10 text-zinc-100 hover:bg-zinc-800 transition-colors"
                onClick={() => navigate('/admin/menu')}
              >
                <Utensils className="h-4 w-4 mr-2 text-green-400" />
                Manage Menu
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start bg-zinc-900 border-white/10 text-zinc-100 hover:bg-zinc-800 transition-colors"
                onClick={() => navigate('/admin/finance')}
              >
                <DollarSign className="h-4 w-4 mr-2 text-yellow-500" />
                Finance Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* Venue Switcher */}
          {activeVenue && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Venue / Vendor</CardTitle>
                <CardDescription>Switch between your venues</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Current Venue Display */}
                <div className="p-4 bg-blue-600/10 border-2 border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold">Current Venue</span>
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">
                    {activeVenue.name}
                  </h3>
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500">
                    {activeVenue.type?.replace('_', ' ')}
                  </p>
                </div>

                {/* Venue Details */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest italic">Service Style</span>
                    <span className="font-bold text-zinc-100 capitalize text-sm">
                      {activeVenue.service_style?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest italic">Currency</span>
                    <span className="font-bold text-zinc-100 text-sm">
                      {activeVenue.currency_symbol} {activeVenue.currency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest italic">Pacing</span>
                    <span className="font-bold text-zinc-100 text-sm">
                      {activeVenue.pacing_enabled ? '✓ Enabled' : '✗ Disabled'}
                    </span>
                  </div>
                </div>

                {/* Switch Venue Button */}
                <Button
                  variant="outline"
                  className="w-full justify-center bg-zinc-900 border-white/10 text-zinc-100 hover:bg-zinc-800 transition-colors mt-4"
                  onClick={() => navigate('/admin/settings/venues')}
                >
                  <Users className="h-4 w-4 mr-2 text-blue-400" />
                  Manage Venues
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageLayout>
  );
}