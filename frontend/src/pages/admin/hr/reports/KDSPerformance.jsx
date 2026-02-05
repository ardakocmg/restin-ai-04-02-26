
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Timer, TrendingUp, AlertTriangle, ChefHat, Activity } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

export default function KDSPerformance() {
  // Phase 4: Simulated KDS Metrics (since real historical aggregation requires heavy backend work)
  const [stats, setStats] = useState({
    avgPrepTime: "12m 30s",
    totalItems: 450,
    lateOrders: 12,
    stationLoad: [
      { name: 'Grill', items: 150, avgTime: 14 },
      { name: 'Fryer', items: 120, avgTime: 8 },
      { name: 'Salad', items: 80, avgTime: 6 },
      { name: 'Dessert', items: 100, avgTime: 5 },
    ],
    hourlyVolume: [
      { hour: '12:00', orders: 45 },
      { hour: '13:00', orders: 80 },
      { hour: '14:00', orders: 60 },
      { hour: '15:00', orders: 30 },
      { hour: '16:00', orders: 20 },
      { hour: '17:00', orders: 40 },
      { hour: '18:00', orders: 90 },
      { hour: '19:00', orders: 110 },
      { hour: '20:00', orders: 85 },
    ]
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Activity className="w-6 h-6 text-red-500" />
        KDS Speed of Service
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Avg Prep Time</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              <Timer className="w-5 h-5 text-blue-500" />
              {stats.avgPrepTime}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Items Cooked</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-green-500" />
              {stats.totalItems}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Late Orders (&gt;20m)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {stats.lateOrders}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Kitchen Load</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              High
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader><CardTitle className="text-white">Station Performance (Avg Mins)</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.stationLoad} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#666" />
                <YAxis dataKey="name" type="category" stroke="#fff" width={60} />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                <Bar dataKey="avgTime" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader><CardTitle className="text-white">Hourly Volume</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.hourlyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="hour" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => alert("Report Exported")}>Export Detailed PDF</Button>
      </div>
    </div>
  );
}
