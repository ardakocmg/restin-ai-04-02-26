
import React from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { TrendingUp, Users, CloudRain, Loader2, BarChart3, CalendarDays, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import { useVenue } from '../../../context/VenueContext';
import { useAuth } from '../../../context/AuthContext';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import PermissionGate from '../../../components/shared/PermissionGate';
import { useAuditLog } from '../../../hooks/useAuditLog';

/**
 * 📊 DEMAND FORECASTING DASHBOARD
 * Fetches real order history and computes AI-driven weekly predictions.
 */

const formatCents = (cents) =>
    new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

export default function ForecastingDashboard() {
    const { activeVenueId } = useVenue();
    const { user, isManager, isOwner } = useAuth();
    const { logAction } = useAuditLog();

    // Audit: log who viewed forecasting
    React.useEffect(() => {
        if (user?.id && activeVenueId) {
            logAction('FORECASTING_VIEWED', 'forecasting_dashboard', activeVenueId);
        }
    }, [user?.id, activeVenueId]);

    // Fetch weekly forecast data from real orders
    const { data: weeklyData = [], isLoading: loadingWeekly } = useQuery({
        queryKey: ['forecast-weekly', activeVenueId],
        queryFn: async () => {
            const res = await api.get(`/forecasting/weekly?venue_id=${activeVenueId}`);
            return res.data;
        },
        enabled: !!activeVenueId,
    });

    // Fetch summary KPIs
    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['forecast-summary', activeVenueId],
        queryFn: async () => {
            const res = await api.get(`/forecasting/summary?venue_id=${activeVenueId}`);
            return res.data;
        },
        enabled: !!activeVenueId,
    });

    const isLoading = loadingWeekly || loadingSummary;

    // Transform chart data — convert cents to euros for display
    const chartData = weeklyData.map((d) => ({
        date: d.date,
        actual: Math.round((d.actual || 0) / 100),
        forecast: Math.round((d.forecast || 0) / 100),
    }));

    const growthPositive = (summary?.growth_pct || 0) >= 0;

    return (
        <PermissionGate requiredRole="MANAGER">
            <PageContainer
                title="Demand Forecasting"
                description="AI-Driven Sales Predictions from Real Order Data"
            >
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                )}

                {!isLoading && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <Card className="bg-card border-border group hover:border-emerald-500/30 transition-all">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                                        Predicted Revenue (Next 7d)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-black text-foreground">
                                        {formatCents(summary?.predicted_revenue_cents || 0)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Based on 4-week moving average</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-card border-border group hover:border-blue-500/30 transition-all">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-500" />
                                        Staffing Recommendation
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-black text-foreground">
                                        {summary?.staffing_recommendation || 'Sufficient'}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {summary?.avg_daily_orders || 0} avg orders/day
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-card border-border group hover:border-amber-500/30 transition-all">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-amber-500" />
                                        This Week Revenue
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-black text-foreground flex items-center gap-2">
                                        {formatCents(summary?.this_week_revenue_cents || 0)}
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                        {growthPositive ? (
                                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                                        ) : (
                                            <ArrowDownRight className="w-3 h-3 text-red-500" />
                                        )}
                                        <span className={`text-xs font-bold ${growthPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {summary?.growth_pct || 0}% vs last week
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-card border-border group hover:border-purple-500/30 transition-all">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-purple-500" />
                                        Orders This Week
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-black text-foreground">
                                        {summary?.total_orders_this_week || 0}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Last week: {formatCents(summary?.last_week_revenue_cents || 0)}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Forecast Chart */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-foreground flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-purple-500" />
                                        Actual vs AI Forecasted Revenue (€)
                                    </CardTitle>
                                    <Badge variant="outline" className="text-muted-foreground border-border text-xs">
                                        4-Week Rolling Average + 5% Growth
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData.length > 0 && !chartData.every(d => d.actual === 0 && d.forecast === 0) ? chartData : [{ date: 'Mon', actual: 0, forecast: 0 }, { date: 'Tue', actual: 0, forecast: 0 }, { date: 'Wed', actual: 0, forecast: 0 }, { date: 'Thu', actual: 0, forecast: 0 }, { date: 'Fri', actual: 0, forecast: 0 }, { date: 'Sat', actual: 0, forecast: 0 }, { date: 'Sun', actual: 0, forecast: 0 }]}>
                                        <defs>
                                            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="date" stroke="#666" />
                                        <YAxis stroke="#666" tickFormatter={(v) => `€${v}`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#333', color: '#fff' }} /* keep-inline */
                                            formatter={(value) => [`€${value}`, undefined]}
                                        />
                                        <Area type="monotone" dataKey="forecast" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorForecast)" name="AI Forecast" />
                                        <Area type="monotone" dataKey="actual" stroke="#10b981" fillOpacity={1} fill="url(#colorActual)" name="Actual Sales" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </>
                )}
            </PageContainer>
        </PermissionGate>
    );
}
