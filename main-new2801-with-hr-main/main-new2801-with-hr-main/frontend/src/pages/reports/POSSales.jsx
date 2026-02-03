import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, CreditCard, Users, ShoppingCart } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const chartTheme = {
  background: '#18181B',
  text: '#D4D4D8',
  grid: 'rgba(255, 255, 255, 0.1)',
  primary: '#E53935',
  success: '#4ADE80',
  warning: '#FB8C00',
  colors: ['#E53935', '#4ADE80', '#3B82F6', '#F59E0B', '#8B5CF6']
};

export default function POSSales() {
  const [loading, setLoading] = useState(true);
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    setLoading(false);
  }, []);

  // Mock data
  const revenueData = [
    { date: 'Mon', revenue: 2840, orders: 24 },
    { date: 'Tue', revenue: 3210, orders: 28 },
    { date: 'Wed', revenue: 4150, orders: 35 },
    { date: 'Thu', revenue: 3890, orders: 31 },
    { date: 'Fri', revenue: 5420, orders: 45 },
    { date: 'Sat', revenue: 6730, orders: 58 },
    { date: 'Sun', revenue: 5120, orders: 42 }
  ];

  const topItems = [
    { name: 'Ribeye Steak', sales: 45, revenue: 2025 },
    { name: 'Lobster Thermidor', sales: 28, revenue: 2240 },
    { name: 'Truffle Pasta', sales: 52, revenue: 1820 },
    { name: 'Sea Bass', sales: 34, revenue: 1530 },
    { name: 'Caesar Salad', sales: 68, revenue: 1088 }
  ];

  const paymentMethods = [
    { name: 'Card', value: 68, color: '#E53935' },
    { name: 'Cash', value: 22, color: '#4ADE80' },
    { name: 'Digital', value: 10, color: '#3B82F6' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center">
        <div className="text-white">Loading Sales Data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-heading mb-2" style={{ color: '#F5F5F7' }}>
          POS SALES ANALYTICS
        </h1>
        <p style={{ color: '#A1A1AA' }}>Revenue insights and sales performance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card-dark p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-red-500" />
            <span className="text-xs" style={{ color: '#71717A' }}>This Week</span>
          </div>
          <div className="text-3xl font-bold text-red-500 mb-1">€31,360</div>
          <div className="text-sm" style={{ color: '#A1A1AA' }}>Total Revenue</div>
        </div>

        <div className="stat-card-dark p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <ShoppingCart className="w-5 h-5 text-green-500" />
            <span className="text-xs" style={{ color: '#71717A' }}>Avg</span>
          </div>
          <div className="text-3xl font-bold text-green-500 mb-1">263</div>
          <div className="text-sm" style={{ color: '#A1A1AA' }}>Orders</div>
        </div>

        <div className="stat-card-dark p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span className="text-xs" style={{ color: '#71717A' }}>Growth</span>
          </div>
          <div className="text-3xl font-bold text-blue-500 mb-1">+12%</div>
          <div className="text-sm" style={{ color: '#A1A1AA' }}>vs Last Week</div>
        </div>

        <div className="stat-card-dark p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-yellow-500" />
            <span className="text-xs" style={{ color: '#71717A' }}>Avg</span>
          </div>
          <div className="text-3xl font-bold text-yellow-500 mb-1">€119</div>
          <div className="text-sm" style={{ color: '#A1A1AA' }}>Check Size</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <div className="chart-container-dark">
          <h3 className="text-xl font-heading mb-4" style={{ color: '#F5F5F7' }}>Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300} minHeight={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="date" stroke={chartTheme.text} />
              <YAxis stroke={chartTheme.text} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                labelStyle={{ color: '#F5F5F7' }}
              />
              <Legend wrapperStyle={{ color: chartTheme.text }} />
              <Line type="monotone" dataKey="revenue" stroke={chartTheme.primary} strokeWidth={3} name="Revenue (€)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods */}
        <div className="chart-container-dark">
          <h3 className="text-xl font-heading mb-4" style={{ color: '#F5F5F7' }}>Payment Methods</h3>
          <ResponsiveContainer width="100%" height={300} minHeight={300}>
            <PieChart>
              <Pie
                data={paymentMethods}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F5F5F7' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Selling Items */}
      <div className="chart-container-dark">
        <h3 className="text-xl font-heading mb-4" style={{ color: '#F5F5F7' }}>Top Selling Items</h3>
        <ResponsiveContainer width="100%" height={300} minHeight={300}>
          <BarChart data={topItems} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis type="number" stroke={chartTheme.text} />
            <YAxis type="category" dataKey="name" stroke={chartTheme.text} width={150} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              labelStyle={{ color: '#F5F5F7' }}
            />
            <Legend wrapperStyle={{ color: chartTheme.text }} />
            <Bar dataKey="revenue" fill={chartTheme.primary} name="Revenue (€)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
