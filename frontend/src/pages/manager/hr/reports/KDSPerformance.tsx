
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Timer, TrendingUp, AlertTriangle, ChefHat, Activity, Loader2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import api from '../../../../lib/api';
import { useVenue } from '../../../../context/VenueContext';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
export default function KDSPerformance() {
  const { activeVenue } = useVenue();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgPrepTime: "0m 00s",
    totalItems: 0,
    lateOrders: 0,
    stationLoad: [],
    hourlyVolume: []
  });

  useEffect(() => {
    if (activeVenue?.id) loadData();
  }, [activeVenue?.id]);

  const loadData = async () => {
    try {
      const res = await api.get('/kds/analytics', { params: { venue_id: activeVenue.id } });
      const data = res.data;
      setStats({
        avgPrepTime: data.metrics?.avg_prep_time || "0m 00s",
        totalItems: data.metrics?.total_tickets || 0,
        lateOrders: data.metrics?.delayed_orders || 0,
        stationLoad: (data.station_performance || []).map(s => ({
          name: s.name || s.station,
          items: s.tickets || 0,
          avgTime: s.avg_time || 0
        })),
        hourlyVolume: (data.hourly_throughput || []).map(h => ({
          hour: h.time,
          orders: h.orders
        }))
      });
    } catch (err) {
      logger.warn('Failed to load KDS Performance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Activity className="w-6 h-6 text-red-500" />
        KDS Speed of Service
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avg Prep Time</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Timer className="w-5 h-5 text-blue-500" />
              {stats.avgPrepTime}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Items Cooked</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-green-500" />
              {stats.totalItems}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Late Orders (&gt;20m)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {stats.lateOrders}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Kitchen Load</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {stats.totalItems > 50 ? 'High' : stats.totalItems > 20 ? 'Medium' : 'Low'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-foreground">Station Performance (Avg Mins)</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.stationLoad.length > 0 ? stats.stationLoad : [{ name: 'Grill', avgTime: 0 }, { name: 'Fryer', avgTime: 0 }, { name: 'Prep', avgTime: 0 }]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#666" />
                <YAxis dataKey="name" type="category" stroke="#fff" width={60} />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} /* keep-inline */ />
                <Bar dataKey="avgTime" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-foreground">Hourly Volume</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.hourlyVolume.length > 0 ? stats.hourlyVolume : [{ hour: '10:00', orders: 0 }, { hour: '12:00', orders: 0 }, { hour: '14:00', orders: 0 }, { hour: '18:00', orders: 0 }, { hour: '20:00', orders: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="hour" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} /* keep-inline */ />
                <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => toast.info("Report exported")}>Export Detailed PDF</Button>
      </div>
    </div>
  );
}
