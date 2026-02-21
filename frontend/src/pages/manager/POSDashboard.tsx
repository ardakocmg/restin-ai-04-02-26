import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import { Calendar } from '@/components/ui/calendar';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";

import { Checkbox } from "@/components/ui/checkbox";

import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, DollarSign, Receipt, Users, Clock, Settings, Check, ArrowUpRight, CalendarClock, Play, Palette } from 'lucide-react';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

import { cn } from '@/lib/utils';

import { Slider } from '@/components/ui/slider';

import { Progress } from "@/components/ui/progress";

import { usePOSFilters } from '@/context/POSFilterContext';

import POSFilterBar from '@/components/pos/POSFilterBar';

import api from '@/lib/api';

import { useVenue } from '@/context/VenueContext';
import { useAuth } from '@/context/AuthContext';
import PermissionGate from '../../components/shared/PermissionGate';
import { useAuditLog } from '../../hooks/useAuditLog';

// Categories will come from API response
const FALLBACK_CATEGORIES = ["Food - Starters", "Food - Mains", "Food - Desserts", "Beverages - Soft", "Beverages - Alcohol", "Service Charge"];

export default function POSDashboard() {
    const { filters, updateFilters } = usePOSFilters();
    const { dateRange: date, timeRange, taxInclusive } = filters;
    const { activeVenue } = useVenue();
    const { user } = useAuth();
    const { logAction } = useAuditLog();

    const [data, setData] = useState([]);
    const [apiCategories, setApiCategories] = useState([]);
    const [activeMetric, setActiveMetric] = useState('revenue');
    const [viewMode, setViewMode] = useState('hourly');

    // Audit: log POS dashboard access
    useEffect(() => {
        if (user?.id) logAction('POS_DASHBOARD_VIEWED', 'pos_dashboard');
    }, [user?.id]);

    // Drill Down State
    const [detailMetric, setDetailMetric] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedReceipt, setSelectedReceipt] = useState(null);

    // Settings State
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [visibleMetrics, setVisibleMetrics] = useState({
        revenue: true,
        receipts: true,
        customers: true
    });
    const [targets, setTargets] = useState({
        revenue: 0,
        receipts: 0,
        customers: 0
    });
    const [shifts, setShifts] = useState({
        breakfast: { start: 9, end: 12, enabled: true },
        lunch: { start: 12, end: 16, enabled: true },
        dinner: { start: 19, end: 23, enabled: true }
    });
    const [closingDays, setClosingDays] = useState({
        Su: false, Mo: false, Tu: false, We: false, Th: false, Fr: false, Sa: false
    });

    // Event Time State
    const [eventTime, setEventTime] = useState({ start: "18:00", end: "18:00", enabled: false });
    const [eventOpen, setEventOpen] = useState(false);

    const applyEventTime = () => {
        const [startH] = eventTime.start.split(':').map(Number);
        const [endH] = eventTime.end.split(':').map(Number);
        if (!isNaN(startH) && !isNaN(endH) && startH <= endH) {
            updateFilters({ timeRange: [startH, endH] });
            setEventOpen(false);
        }
    };

    // Load dashboard-specific settings from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('pos-dashboard-settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                if (settings.visibleMetrics) setVisibleMetrics(settings.visibleMetrics);
                if (settings.targets) setTargets(settings.targets);
                if (settings.shifts) setShifts(settings.shifts);
                // eventTime and taxInclusive should ideally come from global context now
                if (settings.closingDays) setClosingDays(settings.closingDays);
            } catch (e) {
                logger.error('Failed to load POS dashboard settings:', e);
            }
        }
    }, []);

    // Save dashboard-specific settings
    useEffect(() => {
        const settings = {
            visibleMetrics,
            targets,
            shifts,
            closingDays
        };
        localStorage.setItem('pos-dashboard-settings', JSON.stringify(settings));
    }, [visibleMetrics, targets, shifts, closingDays]);

    useEffect(() => {
        if (date?.from && date?.to && activeVenue?.id) {
            const loadDashboardData = async () => {
                try {
                    const res = await api.get('/pos/dashboard', {
                        params: {
                            venue_id: activeVenue.id,
                            date_from: date.from.toISOString(),
                            date_to: date.to.toISOString(),
                        }
                    });
                    const result = res.data;
                    setData(result.data || []);
                    setViewMode(result.view_mode || (isSameDay(date.from, date.to) ? 'hourly' : 'daily'));
                    setApiCategories(result.categories || []);
                } catch (err) {
                    logger.error('Failed to load POS dashboard:', err);
                    setData([]);
                    setApiCategories([]);
                }
            };
            loadDashboardData();
        }
    }, [date, timeRange, activeVenue?.id]);

    const calculateValue = (val, isMonetary) => {
        if (!isMonetary) return val;
        return taxInclusive ? val : val / 1.18;
    };

    const totalRevenue = calculateValue(data.reduce((acc, curr) => acc + curr.revenue, 0), true);
    const totalReceipts = data.reduce((acc, curr) => acc + curr.receipts, 0);
    const totalCustomers = data.reduce((acc, curr) => acc + curr.customers, 0);

    // Helper calculate remaining
    const getRemaining = (current, target) => {
        if (!target || target <= 0) return null;
        const diff = target - current;
        return diff > 0 ? diff : 0;
    };

    // Detail data from real API response
    const getDetailData = (metric) => {
        if (!metric) return [];

        if (metric === 'revenue') {
            // Use real category breakdown from API
            if (apiCategories.length > 0) return apiCategories;
            return FALLBACK_CATEGORIES.map(cat => ({
                label: cat, value: 0, count: 0
            }));
        } else if (metric === 'receipts') {
            // Show time-bucketed receipt counts from real data
            return data.map((d, i) => ({
                id: `RCT-${i + 1}`,
                time: d.time,
                amount: d.revenue,
                items: d.receipts,
                staff: '-'
            }));
        } else if (metric === 'customers') {
            // Hourly/daily customer breakdown from real data
            return data.map(d => ({
                time: d.time,
                count: d.customers,
                occupancy: Math.min(100, Math.floor(d.customers / 1.5))
            }));
        }
        return [];
    };

    const detailData = getDetailData(detailMetric);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const processedDetailData = React.useMemo(() => {
        let sortableItems = [...detailData];

        // Filter
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            sortableItems = sortableItems.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(lowerQuery)
                )
            );
        }

        // Sort
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return sortableItems;
    }, [detailData, sortConfig, searchQuery]);

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-50" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUpRight className="h-3 w-3 rotate-0 transition-transform" />
            : <ArrowUpRight className="h-3 w-3 rotate-180 transition-transform" />
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xl z-50">
                    <p className="text-slate-300 text-sm mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <span className="text-slate-400 capitalize">{entry.name}:</span>
                            <span className="font-semibold text-slate-100">
                                {entry.name === 'revenue'
                                    ? `€${calculateValue(entry.value, true).toFixed(2)}`
                                    : entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <PermissionGate requiredRole="MANAGER">
            <div className="p-6 bg-background dark:bg-black min-h-screen space-y-6">
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-foreground dark:text-slate-50">POS Dashboard</h1>
                        <a href="/pos/runtime" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-teal-500 text-foreground text-sm font-semibold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 hover:from-teal-500 hover:to-teal-400 transition-all">
                            <Play className="h-4 w-4" />
                            Launch POS
                        </a>
                        <a href="/manager/pos-themes" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <Palette className="h-4 w-4" />
                            Themes
                        </a>

                        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-2 border-border bg-background text-foreground">
                                    <Settings className="h-3.5 w-3.5" />
                                    Settings
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Dashboard Settings</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6 py-4">
                                    {/* Show/Hide Components */}
                                    <div className="space-y-3">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Show or hide dashboard components</Label>
                                        <div className="flex gap-2">
                                            {['revenue', 'receipts', 'customers'].map((metric) => (
                                                <div
                                                    key={metric}
                                                    onClick={() => setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }))}
                                                    className={cn(
                                                        "flex-1 p-3 rounded-md border cursor-pointer transition-all flex items-center justify-center gap-2 capitalize text-sm font-medium",
                                                        visibleMetrics[metric]
                                                            ? "bg-blue-50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
                                                            : "bg-slate-50 border-border text-muted-foreground dark:bg-slate-900 dark:border-slate-800"
                                                    )}
                                                >
                                                    {visibleMetrics[metric] && <Check className="h-3 w-3" />}
                                                    {metric}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Targets */}
                                    <div className="space-y-3">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Set daily targets</Label>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                                <Label htmlFor="target-revenue" className="text-xs">Revenue</Label>
                                                <Input
                                                    id="target-revenue"
                                                    type="number"
                                                    value={targets.revenue}
                                                    onChange={(e) => setTargets({ ...targets, revenue: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="target-receipts" className="text-xs">Receipts</Label>
                                                <Input
                                                    id="target-receipts"
                                                    type="number"
                                                    value={targets.receipts}
                                                    onChange={(e) => setTargets({ ...targets, receipts: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="target-customers" className="text-xs">Customers</Label>
                                                <Input
                                                    id="target-customers"
                                                    type="number"
                                                    value={targets.customers}
                                                    onChange={(e) => setTargets({ ...targets, customers: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Shift Presets */}
                                    <div className="space-y-3">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shift Presets</Label>
                                        <div className="space-y-2">
                                            {Object.entries(shifts).map(([key, shift]) => (
                                                <div key={key} className="flex items-center gap-2 p-2 rounded-md border dark:border-slate-800 bg-background/50">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <Checkbox
                                                            id={`shift-${key}`}
                                                            checked={shift.enabled}
                                                            onCheckedChange={(c) => setShifts(prev => ({ ...prev, [key]: { ...prev[key], enabled: c } }))}
                                                        />
                                                        <div className="flex-1">
                                                            <Label htmlFor={`shift-${key}`} className="text-sm font-medium capitalize text-foreground dark:text-slate-100 cursor-pointer">{key}</Label>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Input
                                                                    type="number"
                                                                    className="h-6 w-16 text-xs bg-card border-border"
                                                                    value={shift.start}
                                                                    onChange={(e) => setShifts(prev => ({ ...prev, [key]: { ...prev[key], start: Number(e.target.value) } }))}
                                                                    disabled={!shift.enabled}
                                                                />
                                                                <span className="text-xs text-muted-foreground">to</span>
                                                                <Input
                                                                    type="number"
                                                                    className="h-6 w-16 text-xs bg-card border-border"
                                                                    value={shift.end}
                                                                    onChange={(e) => setShifts(prev => ({ ...prev, [key]: { ...prev[key], end: Number(e.target.value) } }))}
                                                                    disabled={!shift.enabled}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Event Settings */}
                                    <div className="space-y-3">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event Settings</Label>
                                        <div className="flex items-center gap-2 p-2 rounded-md border dark:border-slate-800 bg-background/50">
                                            <div className="flex items-center gap-3 flex-1">
                                                <Checkbox
                                                    id="event-enabled"
                                                    checked={eventTime.enabled}
                                                    onCheckedChange={(c) => setEventTime(prev => ({ ...prev, enabled: c }))}
                                                />
                                                <div className="flex-1">
                                                    <Label htmlFor="event-enabled" className="text-sm font-medium text-foreground dark:text-slate-100 cursor-pointer">Event</Label>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Input
                                                            type="time"
                                                            className="h-6 w-24 text-xs bg-card border-border"
                                                            value={eventTime.start}
                                                            onChange={(e) => setEventTime(prev => ({ ...prev, start: e.target.value }))}
                                                            disabled={!eventTime.enabled}
                                                        />
                                                        <span className="text-xs text-muted-foreground">to</span>
                                                        <Input
                                                            type="time"
                                                            className="h-6 w-24 text-xs bg-card border-border"
                                                            value={eventTime.start}
                                                            onChange={(e) => setEventTime(prev => ({ ...prev, end: e.target.value }))}
                                                            disabled={!eventTime.enabled}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Closing Days */}
                                    <div className="space-y-3">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Set restaurant closing days</Label>
                                        <div className="flex border rounded-md overflow-hidden divide-x dark:divide-slate-800 dark:border-slate-800">
                                            {Object.keys(closingDays).map((day) => (
                                                <button
                                                    key={day}
                                                    onClick={() => setClosingDays(prev => ({ ...prev, [day]: !prev[day] }))}
                                                    className={cn(
                                                        "flex-1 py-2 text-xs font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-900",
                                                        closingDays[day]
                                                            ? "bg-slate-100 text-foreground dark:bg-slate-800 dark:text-slate-100"
                                                            : "bg-white text-muted-foreground dark:bg-black"
                                                    )}
                                                >
                                                    {day}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Tax Settings */}
                                    <div className="space-y-3">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Show all values as</Label>
                                        <div className="flex bg-muted p-1 rounded-md">
                                            <button
                                                onClick={() => setTaxInclusive(true)}
                                                className={cn(
                                                    "flex-1 py-1.5 text-sm font-medium rounded-sm transition-all shadow-sm",
                                                    taxInclusive
                                                        ? "bg-white text-black dark:bg-slate-800 dark:text-foreground ring-1 ring-black/5 dark:ring-white/10"
                                                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                                )}
                                            >
                                                Tax inclusive
                                            </button>
                                            <button
                                                onClick={() => setTaxInclusive(false)}
                                                className={cn(
                                                    "flex-1 py-1.5 text-sm font-medium rounded-sm transition-all shadow-sm",
                                                    !taxInclusive
                                                        ? "bg-white text-black dark:bg-slate-800 dark:text-foreground ring-1 ring-black/5 dark:ring-white/10"
                                                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                                )}
                                            >
                                                Tax exclusive
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                                    <Button onClick={() => setSettingsOpen(false)}>Save</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <POSFilterBar onSettingsClick={() => setSettingsOpen(true)} />
                </div>

                {/* Main Chart Card */}
                <Card className="bg-background border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-base text-foreground dark:text-slate-50">
                                {viewMode === 'hourly' ? 'Hourly Performance' : 'Daily Performance'}
                            </CardTitle>
                            <div className="flex gap-2">
                                {Object.entries(visibleMetrics).map(([metric, isVisible]) => (
                                    isVisible && (
                                        <button
                                            key={metric}
                                            onClick={() => setActiveMetric(metric)}
                                            className={cn(
                                                "text-xs px-2 py-1 rounded transition-colors capitalize border",
                                                activeMetric === metric
                                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                    : "text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            {metric}
                                        </button>
                                    )
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px] w-full mt-4" style={{ minHeight: '400px', minWidth: 0 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={400}>
                                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorReceipts" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                                    <XAxis
                                        dataKey="time"
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        interval={viewMode === 'hourly' ? 2 : 0}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => activeMetric === 'revenue'
                                            ? `€${calculateValue(value, true).toFixed(0)}`
                                            : value}
                                    />
                                    <Tooltip content={<CustomTooltip />} />

                                    {visibleMetrics.revenue && activeMetric === 'revenue' && (
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#3B82F6"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorRevenue)"
                                        />
                                    )}
                                    {visibleMetrics.receipts && activeMetric === 'receipts' && (
                                        <Area
                                            type="monotone"
                                            dataKey="receipts"
                                            stroke="#10B981"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorReceipts)"
                                        />
                                    )}
                                    {visibleMetrics.customers && activeMetric === 'customers' && (
                                        <Area
                                            type="monotone"
                                            dataKey="customers"
                                            stroke="#F59E0B"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorCustomers)"
                                        />
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {visibleMetrics.revenue && (
                        <Card
                            className="bg-background border-border cursor-pointer hover:border-blue-500/50 hover:shadow-lg transition-all"
                            onClick={() => setDetailMetric('revenue')}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            Revenue <ArrowUpRight className="h-3 w-3 opacity-50" />
                                        </p>
                                        <h3 className="text-2xl font-bold text-foreground dark:text-slate-50 mt-1">
                                            €{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </h3>
                                        {targets.revenue > 0 && (
                                            <div className="flex flex-col mt-3 space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">Target: €{targets.revenue.toLocaleString()}</span>
                                                    <span className={cn("font-bold", totalRevenue >= targets.revenue ? "text-green-500 dark:text-green-400" : "text-amber-500 dark:text-amber-400")}>
                                                        {Math.round(totalRevenue / targets.revenue * 100)}%
                                                    </span>
                                                </div>
                                                <Progress value={Math.min(100, (totalRevenue / targets.revenue) * 100)} className="h-2" />
                                                {getRemaining(totalRevenue, targets.revenue) > 0 ? (
                                                    <p className="text-xs text-red-500 dark:text-red-400 font-medium text-right">
                                                        -€{getRemaining(totalRevenue, targets.revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to go
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-green-500 dark:text-green-400 font-bold text-right">Target Met! 🎉</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2 bg-blue-500/10 rounded-full">
                                        <DollarSign className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {visibleMetrics.receipts && (
                        <Card
                            className="bg-background border-border cursor-pointer hover:border-green-500/50 hover:shadow-lg transition-all"
                            onClick={() => setDetailMetric('receipts')}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            Receipts <ArrowUpRight className="h-3 w-3 opacity-50" />
                                        </p>
                                        <h3 className="text-2xl font-bold text-foreground dark:text-slate-50 mt-1">{totalReceipts}</h3>
                                        {targets.receipts > 0 && (
                                            <div className="flex flex-col mt-3 space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">Target: {targets.receipts}</span>
                                                    <span className={cn("font-bold", totalReceipts >= targets.receipts ? "text-green-500 dark:text-green-400" : "text-amber-500 dark:text-amber-400")}>
                                                        {Math.round(totalReceipts / targets.receipts * 100)}%
                                                    </span>
                                                </div>
                                                <Progress value={Math.min(100, (totalReceipts / targets.receipts) * 100)} className="h-2" />
                                                {getRemaining(totalReceipts, targets.receipts) > 0 ? (
                                                    <p className="text-xs text-red-500 dark:text-red-400 font-medium text-right">
                                                        {getRemaining(totalReceipts, targets.receipts)} to go
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-green-500 dark:text-green-400 font-bold text-right">Target Met! 🎉</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2 bg-green-500/10 rounded-full">
                                        <Receipt className="h-5 w-5 text-green-500 dark:text-green-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {visibleMetrics.customers && (
                        <Card
                            className="bg-background border-border cursor-pointer hover:border-orange-500/50 hover:shadow-lg transition-all"
                            onClick={() => setDetailMetric('customers')}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            Customers <ArrowUpRight className="h-3 w-3 opacity-50" />
                                        </p>
                                        <h3 className="text-2xl font-bold text-foreground dark:text-slate-50 mt-1">{totalCustomers}</h3>
                                        {targets.customers > 0 && (
                                            <div className="flex flex-col mt-3 space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">Target: {targets.customers}</span>
                                                    <span className={cn("font-bold", totalCustomers >= targets.customers ? "text-green-500 dark:text-green-400" : "text-amber-500 dark:text-amber-400")}>
                                                        {Math.round(totalCustomers / targets.customers * 100)}%
                                                    </span>
                                                </div>
                                                <Progress value={Math.min(100, (totalCustomers / targets.customers) * 100)} className="h-2" />
                                                {getRemaining(totalCustomers, targets.customers) > 0 ? (
                                                    <p className="text-xs text-red-500 dark:text-red-400 font-medium text-right">
                                                        {getRemaining(totalCustomers, targets.customers)} to go
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-green-500 dark:text-green-400 font-bold text-right">Target Met! 🎉</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2 bg-orange-500/10 rounded-full">
                                        <Users className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </div>

                {/* Drill Down Dialog */}
                <Dialog open={!!detailMetric} onOpenChange={(open) => !open && setDetailMetric(null)}>
                    <DialogContent className="sm:max-w-[800px] bg-background border-border max-h-[80vh] overflow-y-auto">
                        {selectedReceipt ? (
                            // Nested Receipt Details View
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 border-b border-border pb-4">
                                    <Button variant="ghost" size="icon" onClick={() = aria-label="Action"> setSelectedReceipt(null)}>
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                    <div>
                                        <h2 className="text-lg font-bold">Receipt {selectedReceipt.id}</h2>
                                        <p className="text-sm text-slate-500">Served by {selectedReceipt.staff} at {selectedReceipt.time}</p>
                                    </div>
                                </div>

                                <div className="rounded-md border border-border overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-card/50 text-muted-foreground font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Item Name</th>
                                                <th className="px-4 py-3 text-right">Qty</th>
                                                <th className="px-4 py-3 text-right">Price</th>
                                                <th className="px-4 py-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {selectedReceipt.lineItems.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3 font-medium">{item.name}</td>
                                                    <td className="px-4 py-3 text-right">{item.qty}</td>
                                                    <td className="px-4 py-3 text-right">€{item.price.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right font-semibold">€{(item.qty * item.price).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-background font-bold">
                                                <td colSpan={3} className="px-4 py-3 text-right">Total Amount</td>
                                                <td className="px-4 py-3 text-right">€{selectedReceipt.amount.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            // Standard List View
                            <>
                                <DialogHeader>
                                    <DialogTitle className="capitalize flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            {detailMetric} Breakdown
                                            <span className="text-muted-foreground text-sm font-normal ml-2">
                                                ({format(date.from || new Date(), "LLL dd")} - {format(date.to || new Date(), "LLL dd")})
                                            </span>
                                        </div>
                                        <div className="w-64">
                                            <Input
                                                placeholder="Filter..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="py-2">
                                    <div className="rounded-md border border-border overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-card/50 text-muted-foreground font-medium border-b border-border">
                                                <tr>
                                                    {detailMetric === 'revenue' && (
                                                        <>
                                                            <th className="px-4 py-3 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('label')}>
                                                                <div className="flex items-center gap-1">Category <SortIcon columnKey="label" /></div>
                                                            </th>
                                                            <th className="px-4 py-3 text-right cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('count')}>
                                                                <div className="flex items-center justify-end gap-1">Orders <SortIcon columnKey="count" /></div>
                                                            </th>
                                                            <th className="px-4 py-3 text-right cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('value')}>
                                                                <div className="flex items-center justify-end gap-1">Revenue <SortIcon columnKey="value" /></div>
                                                            </th>
                                                        </>
                                                    )}
                                                    {detailMetric === 'receipts' && (
                                                        <>
                                                            <th className="px-4 py-3 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('id')}>
                                                                <div className="flex items-center gap-1">Receipt ID <SortIcon columnKey="id" /></div>
                                                            </th>
                                                            <th className="px-4 py-3 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('time')}>
                                                                <div className="flex items-center gap-1">Time <SortIcon columnKey="time" /></div>
                                                            </th>
                                                            <th className="px-4 py-3 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('staff')}>
                                                                <div className="flex items-center gap-1">Staff <SortIcon columnKey="staff" /></div>
                                                            </th>
                                                            <th className="px-4 py-3 text-right cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('items')}>
                                                                <div className="flex items-center justify-end gap-1">Items <SortIcon columnKey="items" /></div>
                                                            </th>
                                                            <th className="px-4 py-3 text-right cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('amount')}>
                                                                <div className="flex items-center justify-end gap-1">Total <SortIcon columnKey="amount" /></div>
                                                            </th>
                                                        </>
                                                    )}
                                                    {detailMetric === 'customers' && (
                                                        <>
                                                            <th className="px-4 py-3 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('time')}>
                                                                <div className="flex items-center gap-1">Time Period <SortIcon columnKey="time" /></div>
                                                            </th>
                                                            <th className="px-4 py-3 text-right cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('occupancy')}>
                                                                <div className="flex items-center justify-end gap-1">Occupancy % <SortIcon columnKey="occupancy" /></div>
                                                            </th>
                                                            <th className="px-4 py-3 text-right cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('count')}>
                                                                <div className="flex items-center justify-end gap-1">Customers <SortIcon columnKey="count" /></div>
                                                            </th>
                                                        </>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {processedDetailData.map((row, i) => (
                                                    <tr
                                                        key={i}
                                                        onClick={() => detailMetric === 'receipts' && setSelectedReceipt(row)}
                                                        className={cn(
                                                            "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                                                            detailMetric === 'receipts' ? "cursor-pointer active:bg-slate-100 dark:active:bg-slate-800" : ""
                                                        )}
                                                    >
                                                        {detailMetric === 'revenue' && (
                                                            <>
                                                                <td className="px-4 py-3 font-medium text-foreground dark:text-slate-200">{row.label}</td>
                                                                <td className="px-4 py-3 text-right text-muted-foreground">{row.count}</td>
                                                                <td className="px-4 py-3 text-right text-foreground dark:text-slate-200">€{calculateValue(row.value, true).toFixed(2)}</td>
                                                            </>
                                                        )}
                                                        {detailMetric === 'receipts' && (
                                                            <>
                                                                <td className="px-4 py-3 font-medium text-blue-600 dark:text-blue-400 dark:text-blue-400 hover:underline">{row.id}</td>
                                                                <td className="px-4 py-3 text-muted-foreground">{row.time}</td>
                                                                <td className="px-4 py-3 text-muted-foreground">{row.staff}</td>
                                                                <td className="px-4 py-3 text-right text-muted-foreground">{row.items}</td>
                                                                <td className="px-4 py-3 text-right text-foreground dark:text-slate-200">€{calculateValue(row.amount, true).toFixed(2)}</td>
                                                            </>
                                                        )}
                                                        {detailMetric === 'customers' && (
                                                            <>
                                                                <td className="px-4 py-3 font-medium text-foreground dark:text-slate-200">{row.time}</td>
                                                                <td className="px-4 py-3 text-right text-muted-foreground">{row.occupancy}%</td>
                                                                <td className="px-4 py-3 text-right text-foreground dark:text-slate-200">{row.count}</td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))}
                                                {processedDetailData.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{"No "}data available for this range.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div >
        </PermissionGate>
    );
}