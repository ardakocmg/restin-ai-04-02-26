import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import PageContainer from '../../layouts/PageContainer';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Badge } from '../../components/ui/badge';

export default function InventoryReport() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) return <LoadingSpinner fullScreen text="Loading inventory report..." />;

  const stockLevels = [
    { item: 'Tomatoes', current: 45, min: 50, status: 'low', cost: 135 },
    { item: 'Mozzarella', current: 12, min: 20, status: 'critical', cost: 240 },
    { item: 'Pasta', current: 85, min: 40, status: 'good', cost: 170 },
    { item: 'Olive Oil', current: 28, min: 15, status: 'good', cost: 420 },
  ];

  const wasteData = [
    { date: 'Mon', waste: 45, cost: 135 },
    { date: 'Tue', waste: 32, cost: 96 },
    { date: 'Wed', waste: 58, cost: 174 },
    { date: 'Thu', waste: 41, cost: 123 },
    { date: 'Fri', waste: 67, cost: 201 },
    { date: 'Sat', waste: 89, cost: 267 },
  ];

  return (
    <PageContainer title="Inventory Report" description="Stock levels and waste analysis">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#A1A1AA' }}>Total Items</CardTitle>
              <Package className="h-4 w-4" style={{ color: '#E53935' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#F5F5F7' }}>248</div>
              <p className="text-xs" style={{ color: '#71717A' }}>Across all categories</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#A1A1AA' }}>Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4" style={{ color: '#FB8C00' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#FB8C00' }}>8</div>
              <p className="text-xs" style={{ color: '#71717A' }}>Items need reorder</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#A1A1AA' }}>Waste This Week</CardTitle>
              <TrendingDown className="h-4 w-4" style={{ color: '#EF4444' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#EF4444' }}>€996</div>
              <p className="text-xs" style={{ color: '#4ADE80' }}>-12% from last week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#A1A1AA' }}>Stock Value</CardTitle>
              <DollarSign className="h-4 w-4" style={{ color: '#E53935' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#F5F5F7' }}>€12,450</div>
              <p className="text-xs" style={{ color: '#71717A' }}>Current inventory</p>
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
              {stockLevels.map((item) => (
                <div key={item.item} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex-1">
                    <h4 className="font-medium" style={{ color: '#F5F5F7' }}>{item.item}</h4>
                    <p className="text-sm" style={{ color: '#A1A1AA' }}>Current: {item.current} | Min: {item.min}</p>
                  </div>
                  <div className="text-right mr-4">
                    <div className="text-sm font-medium" style={{ color: '#D4D4D8' }}>€{item.cost}</div>
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
              <BarChart data={wasteData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#A1A1AA" />
                <YAxis stroke="#A1A1AA" />
                <Tooltip contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F7' }} />
                <Legend wrapperStyle={{ color: '#D4D4D8' }} />
                <Bar dataKey="cost" fill="#EF4444" name="Waste Cost (€)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
