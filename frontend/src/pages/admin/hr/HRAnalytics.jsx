import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useVenue } from '@/context/VenueContext';
import { useAuth } from '@/context/AuthContext';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';

import PageContainer from '@/layouts/PageContainer';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  Users,
  TrendingUp,
  UserPlus,
  UserMinus,
  PieChart as PieIcon,
  BarChart as BarIcon,
  Activity
} from 'lucide-react';

import api from '@/lib/api';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function HRAnalyticsIndigo() {
  const { activeVenueId: venueId } = useVenue();
  const { user, isManager, isOwner } = useAuth();
  const { logAction } = useAuditLog();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Audit: log who viewed HR analytics
  useEffect(() => {
    if (user?.id && venueId) {
      logAction('HR_ANALYTICS_VIEWED', 'hr_analytics', venueId);
    }
  }, [user?.id, venueId]);

  useEffect(() => {
    if (venueId) {
      fetchDashboardData();
    }
  }, [venueId]);

  const fetchDashboardData = async () => {
    try {
      // Fetching from the fixed summary dashboard endpoint
      const response = await api.get(`/venues/${venueId}/summary/dashboard`);
      setData(response.data);
    } catch (error) {
      logger.error('Failed to fetch HR dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Activity className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-slate-400">No data available</div>;

  return (
    <PermissionGate requiredRole="MANAGER">
      <PageContainer title="HR Insights & Workforce Analytics" description="Experience-driven workforce intelligence">
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {(data.kpi_metrics || []).map((kpi, idx) => (
              <Card key={idx} className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">{kpi.label}</p>
                      <p className="text-3xl font-black text-white">{kpi.value.toLocaleString()}</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      {kpi.icon === 'users' && <Users className="h-6 w-6 text-blue-400" />}
                      {kpi.icon === 'user-plus' && <UserPlus className="h-6 w-6 text-green-400" />}
                      {kpi.icon === 'user-x' && <UserMinus className="h-6 w-6 text-red-400" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Yearly Headcount Trend */}
            <Card className="md:col-span-2 border-white/5 bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-400" />
                  Headcount Growth Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <AreaChart data={data.headcount_by_year}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="year" stroke="#71717a" fontSize={12} />
                      <YAxis stroke="#71717a" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gender Diversity */}
            <Card className="border-white/5 bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-pink-400" />
                  Gender Diversity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.headcount_by_gender}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="gender"
                      >
                        {(data.headcount_by_gender || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '8px' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Age Distribution */}
            <Card className="border-white/5 bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarIcon className="h-4 w-4 text-orange-400" />
                  Age Brackets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <BarChart data={data.headcount_by_age_bracket} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="bracket" type="category" stroke="#71717a" fontSize={10} width={100} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '8px' }}
                      />
                      <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Employment Type */}
            <Card className="border-white/5 bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  Employment Setup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <PieChart>
                      <Pie
                        data={data.headcount_by_employment_type}
                        innerRadius={0}
                        outerRadius={80}
                        dataKey="count"
                        nameKey="type_name"
                      >
                        {(data.headcount_by_employment_type || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '8px' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Engagement vs Termination */}
            <Card className="border-white/5 bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  Stability Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.engagements_terminations}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="year" stroke="#71717a" fontSize={12} />
                      <YAxis stroke="#71717a" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Bar dataKey="engagements" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="terminations" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </PermissionGate >
  );
}