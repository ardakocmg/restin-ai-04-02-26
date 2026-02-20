import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useVenue } from '@/context/VenueContext';
import { useAuth } from '@/context/AuthContext';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';

import api from '@/lib/api';

const COLORS = ['#EF4444', '#F59E0B', '#10B981'];

export default function TurnoverModule() {
  const { activeVenueId: venueId } = useVenue();
  const { user, isManager, isOwner } = useAuth();
  const { logAction } = useAuditLog();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Audit: log who viewed turnover analysis
  useEffect(() => {
    if (user?.id && venueId) {
      logAction('TURNOVER_ANALYSIS_VIEWED', 'turnover_module', venueId);
    }
  }, [user?.id, venueId]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get(`/venues/${venueId}/hr/analytics/turnover`);
      setData(response.data);
    } catch (error: any) {
      logger.error('Failed to fetch turnover data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">No data available</div>;

  return (
    <PermissionGate requiredRole="MANAGER">
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <h1 className="text-3xl font-bold text-foreground">Staff Turnover Analysis</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Voluntary Terminations</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{data.voluntary_terminations}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Non-Voluntary</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{data.non_voluntary_terminations}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Turnover Rate</p>
              <p className="text-3xl font-bold text-foreground mt-2">{(data.turnover_rate || 0).toFixed(2)}%</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>By Reason</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={data.by_reason} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {data.by_reason.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Monthly Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.trend_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#EF4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGate>
  );
}