import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

import api from '@/lib/api';

export default function SickLeaveAnalysis() {
  const { user, isManager, isOwner } = useAuth();
  const { logAction } = useAuditLog();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Audit: log who viewed sick leave analysis
  useEffect(() => {
    if (user?.id) {
      logAction('SICK_LEAVE_ANALYSIS_VIEWED', 'sick_leave_analysis', 'all');
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('sick-leave/metrics');
      setData(response.data);
    } catch (error) {
      logger.error('Failed to fetch sick leave data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">No data available</div>;

  return (
    <PermissionGate requiredRole="MANAGER">
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <h1 className="text-3xl font-bold text-foreground">Sick Leave Analysis</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Total Sick Days</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{data.total_sick_days}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Employees on Sick Leave</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{data.employees_on_sick_leave}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Average Days/Employee</p>
              <p className="text-3xl font-bold text-foreground mt-2">{(data.average_sick_days_per_employee || 0).toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Top Reasons</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.top_reasons}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="reason" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#EF4444" />
                </BarChart>
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
                  <Line type="monotone" dataKey="days" stroke="#EF4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGate>
  );
}