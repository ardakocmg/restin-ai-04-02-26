import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock, TrendingUp, Activity, AlertCircle } from 'lucide-react';
import PageContainer from '../../layouts/PageContainer';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Badge } from '../../components/ui/badge';

export default function KDSPerformanceReport() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) return <LoadingSpinner fullScreen text="Loading KDS performance..." />;

  const performanceData = [
    { time: '09:00', avgTime: 8.2, tickets: 12 },
    { time: '10:00', avgTime: 7.5, tickets: 18 },
    { time: '11:00', avgTime: 9.1, tickets: 24 },
    { time: '12:00', avgTime: 11.3, tickets: 42 },
    { time: '13:00', avgTime: 12.8, tickets: 48 },
    { time: '14:00', avgTime: 10.2, tickets: 35 },
  ];

  const stationData = [
    { station: 'Hot Kitchen', tickets: 145, avgTime: 9.2, status: 'good' },
    { station: 'Cold Kitchen', tickets: 89, avgTime: 6.5, status: 'good' },
    { station: 'Grill', tickets: 67, avgTime: 14.3, status: 'warning' },
    { station: 'Desserts', tickets: 43, avgTime: 5.1, status: 'good' },
  ];

  return (
    <PageContainer title="KDS Performance" description="Kitchen display system analytics">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#A1A1AA' }}>Avg Ticket Time</CardTitle>
              <Clock className="h-4 w-4" style={{ color: '#E53935' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#F5F5F7' }}>9.8 min</div>
              <p className="text-xs" style={{ color: '#4ADE80' }}>-1.2 min from yesterday</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#A1A1AA' }}>Total Tickets</CardTitle>
              <Activity className="h-4 w-4" style={{ color: '#E53935' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#F5F5F7' }}>344</div>
              <p className="text-xs" style={{ color: '#4ADE80' }}>+15% from yesterday</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#A1A1AA' }}>Peak Time</CardTitle>
              <TrendingUp className="h-4 w-4" style={{ color: '#E53935' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#F5F5F7' }}>13:00</div>
              <p className="text-xs" style={{ color: '#71717A' }}>48 tickets/hour</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#A1A1AA' }}>Delayed Orders</CardTitle>
              <AlertCircle className="h-4 w-4" style={{ color: '#FB8C00' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#FB8C00' }}>12</div>
              <p className="text-xs" style={{ color: '#71717A' }}>3.5% of total</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Average Ticket Time by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#A1A1AA" />
                <YAxis stroke="#A1A1AA" label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#A1A1AA' }} />
                <Tooltip contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F7' }} />
                <Legend wrapperStyle={{ color: '#D4D4D8' }} />
                <Line type="monotone" dataKey="avgTime" stroke="#E53935" strokeWidth={2} name="Avg Time (min)" />
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
              {stationData.map((station) => (
                <div key={station.station} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex-1">
                    <h4 className="font-medium" style={{ color: '#F5F5F7' }}>{station.station}</h4>
                    <p className="text-sm" style={{ color: '#A1A1AA' }}>{station.tickets} tickets completed</p>
                  </div>
                  <div className="text-right mr-4">
                    <div className="text-lg font-bold" style={{ color: '#D4D4D8' }}>{station.avgTime} min</div>
                    <p className="text-xs" style={{ color: '#71717A' }}>avg time</p>
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
