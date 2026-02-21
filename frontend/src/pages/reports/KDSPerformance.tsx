import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { Clock, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

import api from '../../lib/api';

import { useVenue } from '../../context/VenueContext';

export default function KDSPerformance() {
  const { activeVenue } = useVenue();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) loadData();
  }, [activeVenue?.id]);

  const loadData = async () => {
    try {
      const res = await api.get('/kds/analytics', { params: { venue_id: activeVenue.id } });
      setData(res.data);
    } catch (err) {
      logger.warn('KDS analytics API failed, using empty state');
      setData({
        metrics: { avg_prep_time: '0m 00s', throughput_per_hour: 0, active_stations: 0, delayed_orders: 0 },
        hourly_throughput: [],
        station_performance: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <h1 className="text-3xl font-heading text-foreground mb-8">KDS Performance</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-dark p-6 rounded-2xl border border-border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Avg Prep Time</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{data.metrics.avg_prep_time}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="card-dark p-6 rounded-2xl border border-border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Throughput / Hr</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{data.metrics.throughput_per_hour}</h3>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl">
              <Activity className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="card-dark p-6 rounded-2xl border border-border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Active Stations</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{data.metrics.active_stations}</h3>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="card-dark p-6 rounded-2xl border border-border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Delayed Orders</p>
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{data.metrics.delayed_orders}</h3>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Throughput */}
        <div className="card-dark p-6 rounded-2xl border border-border">
          <h3 className="text-xl font-heading text-foreground mb-6">Hourly Throughput</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.hourly_throughput}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" stroke="#71717A" />
                <YAxis stroke="#71717A" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', borderRadius: '8px' }}
                  itemStyle={{ color: '#E4E4E7' }}
                />
                <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Station Performance */}
        <div className="card-dark p-6 rounded-2xl border border-border">
          <h3 className="text-xl font-heading text-foreground mb-6">Avg Prep Time by Station (min)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.station_performance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis type="number" stroke="#71717A" />
                <YAxis dataKey="name" type="category" stroke="#71717A" width={80} />
                <Tooltip
                  cursor={{ fill: '#3F3F46', opacity: 0.2 }}
                  contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', borderRadius: '8px' }}
                  itemStyle={{ color: '#E4E4E7' }}
                />
                <Bar dataKey="avg_time" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}