import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, CreditCard } from 'lucide-react';

export default function POSSales() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data fetch
    setTimeout(() => {
      setData({
        metrics: {
          total_revenue: 3450.50,
          total_orders: 128,
          avg_order_value: 26.95,
          top_payment_method: 'Card (75%)'
        },
        revenue_trend: [
          { time: '10:00', amount: 120 },
          { time: '11:00', amount: 350 },
          { time: '12:00', amount: 850 },
          { time: '13:00', amount: 920 },
          { time: '14:00', amount: 450 },
          { time: '15:00', amount: 300 },
          { time: '16:00', amount: 560 },
          { time: '17:00', amount: 890 },
        ],
        top_items: [
          { name: 'Burger', quantity: 45, revenue: 675 },
          { name: 'Pizza', quantity: 38, revenue: 570 },
          { name: 'Pasta', quantity: 32, revenue: 480 },
          { name: 'Salad', quantity: 28, revenue: 336 },
          { name: 'Coke', quantity: 65, revenue: 195 },
        ]
      });
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-zinc-950 min-h-screen">
      <h1 className="text-3xl font-heading text-white mb-8">POS Sales Report</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-dark p-6 rounded-2xl border border-white/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-zinc-400 text-sm font-medium">Total Revenue</p>
              <h3 className="text-2xl font-bold text-white mt-1">€{data.metrics.total_revenue.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="card-dark p-6 rounded-2xl border border-white/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-zinc-400 text-sm font-medium">Total Orders</p>
              <h3 className="text-2xl font-bold text-white mt-1">{data.metrics.total_orders}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <ShoppingBag className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="card-dark p-6 rounded-2xl border border-white/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-zinc-400 text-sm font-medium">Avg Order Value</p>
              <h3 className="text-2xl font-bold text-white mt-1">€{data.metrics.avg_order_value.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="card-dark p-6 rounded-2xl border border-white/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-zinc-400 text-sm font-medium">Top Payment</p>
              <h3 className="text-lg font-bold text-white mt-2">{data.metrics.top_payment_method}</h3>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-xl">
              <CreditCard className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 card-dark p-6 rounded-2xl border border-white/10">
          <h3 className="text-xl font-heading text-white mb-6">Revenue Trend (Today)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenue_trend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" stroke="#71717A" />
                <YAxis stroke="#71717A" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', borderRadius: '8px' }}
                  itemStyle={{ color: '#E4E4E7' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#10B981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Items */}
        <div className="card-dark p-6 rounded-2xl border border-white/10">
          <h3 className="text-xl font-heading text-white mb-6">Top Selling Items</h3>
          <div className="space-y-4">
            {data.top_items.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="text-white font-medium">{item.name}</div>
                    <div className="text-xs text-zinc-500">{item.quantity} orders</div>
                  </div>
                </div>
                <div className="font-bold text-green-400">€{item.revenue}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
