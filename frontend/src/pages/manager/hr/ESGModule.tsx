import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Leaf, TrendingUp, Award } from 'lucide-react';

import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function ESGModule() {
  const { user, isManager, isOwner } = useAuth();
  const { logAction } = useAuditLog();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('esg/metrics');
      setData(response.data);
    } catch (error) {
      logger.error('Failed to fetch ESG data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">No data available</div>;

  return (
    <PermissionGate requiredRole="OWNER">
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <h1 className="text-3xl font-bold text-foreground">ESG Metrics</h1>
        <p className="text-slate-600">Environmental, Social & Governance</p>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Diversity Score</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{data.diversity_score}</p>
                </div>
                <Award className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Gender Pay Gap</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{data.gender_pay_gap}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Employee Satisfaction</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{data.employee_satisfaction}/5</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Training & Development</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <span className="text-slate-700">Training Hours per Employee</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{data.training_hours_per_employee}h</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                  <span className="text-slate-700">Safety Incidents</span>
                  <span className="text-xl font-bold text-yellow-600">{data.safety_incidents}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Carbon Footprint</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-950/20 rounded">
                  <span className="text-slate-700">Total CO2 (tons)</span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">{data.carbon_footprint.total_co2}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-950/20 rounded">
                  <span className="text-slate-700">Per Employee</span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">{data.carbon_footprint.per_employee}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded">
                  <span className="text-slate-700">Reduction Target</span>
                  <span className="text-xl font-bold text-emerald-600">{data.carbon_footprint.reduction_target}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGate>
  );
}