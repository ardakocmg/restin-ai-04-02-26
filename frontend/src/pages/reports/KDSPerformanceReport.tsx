import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { Clock, TrendingUp, Activity, AlertCircle } from 'lucide-react';

import PageContainer from '../../layouts/PageContainer';

import LoadingSpinner from '../../components/shared/LoadingSpinner';

import { Badge } from '../../components/ui/badge';

import api from '../../lib/api';

import { useVenue } from '../../context/VenueContext';

export default function KDSPerformanceReport() {
  const { activeVenue } = useVenue();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [stationData, setStationData] = useState([]);

  useEffect(() => {
    if (activeVenue?.id) loadData();
  }, [activeVenue?.id]);

  const loadData = async () => {
    try {
      const res = await api.get('/kds/analytics', { params: { venue_id: activeVenue.id } });
      const d = res.data;
      setMetrics(d.metrics);
      setPerformanceData((d.hourly_throughput || []).map(h => ({
        time: h.time,
        avgTime: 0,
        tickets: h.orders
      })));
      setStationData((d.station_performance || []).map(s => ({
        station: s.station || s.name,
        tickets: s.tickets || 0,
        avgTime: s.avg_time || 0,
        status: s.status || 'good'
      })));
    } catch (err) {
      logger.warn('KDS analytics failed');
      setMetrics({ avg_prep_time: '0m', total_tickets: 0, peak_time: 'N/A', delayed_orders: 0, peak_tickets: 0, delay_rate: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen className="" text="Loading KDS performance..." />;

  return (
    <PageContainer title="KDS Performance" description="Kitchen display system analytics">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Avg Ticket Time</CardTitle>
              <Clock className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">{metrics?.avg_prep_time || '0m'}</div>
              <p className="text-xs text-zinc-500">Current average</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Total Tickets</CardTitle>
              <Activity className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">{metrics?.total_tickets || 0}</div>
              <p className="text-xs text-zinc-500">Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Peak Time</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">{metrics?.peak_time || 'N/A'}</div>
              <p className="text-xs text-zinc-500">{metrics?.peak_tickets || 0} tickets/hour</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Delayed Orders</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{metrics?.delayed_orders || 0}</div>
              <p className="text-xs text-zinc-500">{metrics?.delay_rate || 0}% of total</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#A1A1AA" />
                <YAxis stroke="#A1A1AA" />
                <Tooltip contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F7' }} /> {/* keep-inline: Recharts API */}
                <Legend wrapperStyle={{ color: '#D4D4D8' }} /> {/* keep-inline: Recharts API */}
                <Line type="monotone" dataKey="tickets" stroke="#E53935" strokeWidth={2} name="Tickets" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Station Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Station Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stationData.length === 0 ? [
                { station: 'Grill', tickets: 0, avgTime: 0, status: 'good' },
                { station: 'Salad', tickets: 0, avgTime: 0, status: 'good' },
                { station: 'Dessert', tickets: 0, avgTime: 0, status: 'good' },
              ] : stationData).map((station) => (
                <div key={station.station} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex-1">
                    <h4 className="font-medium text-zinc-100">{station.station}</h4>
                    <p className="text-sm text-zinc-400">{station.tickets} tickets completed</p>
                  </div>
                  <div className="text-right mr-4">
                    <div className="text-lg font-bold text-zinc-300">{station.avgTime} min</div>
                    <p className="text-xs text-zinc-500">avg time</p>
                  </div>
                  <Badge variant={station.status === 'good' ? 'default' : 'destructive'}>
                    {station.status === 'good' ? 'On Track' : 'Slow'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}