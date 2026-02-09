import React, { useState, useEffect } from 'react';import { logger } from '@/lib/logger';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';import { logger } from '@/lib/logger';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';import { logger } from '@/lib/logger';

import { TrendingUp } from 'lucide-react';import { logger } from '@/lib/logger';

import api from '@/lib/api';

import { logger } from '@/lib/logger';
export default function ForecastingCosts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('forecasting-costs/metrics');
      setData(response.data);
    } catch (error) {
      logger.error('Failed to fetch forecasting data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">No data available</div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold text-foreground">Forecasting Costs</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Projected Next Quarter</p>
                <p className="text-2xl font-bold text-foreground mt-2">€{data.projected_costs_next_quarter.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">Projected Headcount</p>
            <p className="text-2xl font-bold text-foreground mt-2">{data.projected_headcount_next_quarter}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">Cost Variance</p>
            <p className={`text-2xl font-bold mt-2 ${data.cost_variance > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>{data.cost_variance > 0 ? '+' : ''}{(data.cost_variance || 0).toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>6-Month Forecast Trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.trend_forecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="cost" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
