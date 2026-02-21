import { logger } from '@/lib/logger';
import { useEffect,useState } from 'react';

import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card';

import PermissionGate from '@/components/shared/PermissionGate';
import { useAuth } from '@/context/AuthContext';
import { useVenue } from '@/context/VenueContext';
import { useAuditLog } from '@/hooks/useAuditLog';

import { Bar,BarChart,CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis } from 'recharts';

import api from '@/lib/api';

export default function HeadcountModule() {
  const { activeVenueId: venueId } = useVenue();
  const { user, isManager, isOwner } = useAuth();
  const { logAction } = useAuditLog();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Audit: log who viewed headcount analysis
  useEffect(() => {
    if (user?.id && venueId) {
      logAction('HEADCOUNT_ANALYSIS_VIEWED', 'headcount_module', venueId);
    }
  }, [user?.id, venueId]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get(`/venues/${venueId}/hr/analytics/headcount`);
      setData(response.data);
    } catch (error) {
      logger.error('Failed to fetch headcount data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">{"No "}data available</div>;

  return (
    <PermissionGate requiredRole="MANAGER">
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <h1 className="text-3xl font-bold text-foreground">Headcount Analysis</h1>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Total Headcount</p>
              <p className="text-3xl font-bold text-foreground mt-2">{data.total_headcount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">New Employees (YTD)</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{data.new_employees_ytd}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">Terminated (YTD)</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{data.terminated_ytd}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>By Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.by_department}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trend Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.trend_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGate>
  );
}