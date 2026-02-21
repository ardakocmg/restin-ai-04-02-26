// @ts-nocheck
/**
 * HRAnalytics.jsx — Peak HR Analytics Dashboard
 * Tabs: Overview | POS Analytics | KDS Analytics | System Usage
 * Date-filtered, employee-filtered, period comparison
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVenue } from '@/context/VenueContext';
import PermissionGate from '@/components/shared/PermissionGate';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import logger from '@/lib/logger';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, ShoppingCart, Flame, Timer,
  Users, BookOpen, Clock, Activity, Layers, ChefHat,
  Euro, BarChart3, Calendar, Filter, ArrowUpRight, ArrowDownRight,
  Minus, RefreshCw
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'pos', label: 'POS Analytics', icon: ShoppingCart },
  { id: 'kds', label: 'KDS Analytics', icon: Flame },
  { id: 'system', label: 'System Usage', icon: Layers },
];

const DATE_PRESETS = [
  { id: 'today', label: 'Today', days: 0 },
  { id: '7d', label: '7 Days', days: 7 },
  { id: '30d', label: '30 Days', days: 30 },
  { id: '90d', label: '90 Days', days: 90 },
];

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

// ── Helpers ──────────────────────────────────────────────────
function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days || 30));
  return { from: start.toISOString(), to: end.toISOString() };
}

function ChangeIndicator({ value }) {
  if (value === 0 || value === null || value === undefined) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (value > 0) return (
    <span className="flex items-center gap-0.5 text-emerald-400 text-xs font-bold">
      <ArrowUpRight className="h-3 w-3" /> +{value}%
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-red-400 text-xs font-bold">
      <ArrowDownRight className="h-3 w-3" /> {value}%
    </span>
  );
}

function KpiCard({ label, value, icon: Icon, change, subtitle }) {
  return (
    <Card className="border-border bg-card/60 backdrop-blur-xl hover:bg-card/80 transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="text-2xl font-black text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center">
              {Icon && <Icon className="h-4 w-4 text-blue-400" />}
            </div>
            <ChangeIndicator value={change} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DataTable({ columns, data, onRowClick }) {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground text-sm p-4 text-center">No data for this period</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col, i) => (
              <th key={i} className="text-left py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr
              key={ri}
              className={`border-b border-border hover:bg-white/[0.02] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col, ci) => (
                <td key={ci} className="py-3 px-3 text-secondary-foreground">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab Content Components ───────────────────────────────────
function OverviewTab({ data }) {
  if (!data) return null;
  const kpis = data.kpis || [];
  const iconMap = {
    'shopping-cart': ShoppingCart, 'flame': Flame, 'timer': Timer,
    'euro': Euro, 'book-open': BookOpen, 'users': Users, 'clock': Clock,
  };
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <KpiCard
            key={i}
            label={kpi.label}
            value={typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
            icon={iconMap[kpi.icon] || Activity}
            change={kpi.change_pct}
          />
        ))}
      </div>
    </div>
  );
}

function PosTab({ data, onEmployeeClick }) {
  if (!data) return null;
  const { summary = {}, employees = [], daily_trend = [] } = data;
  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Orders" value={summary.total_orders?.toLocaleString() || 0} icon={ShoppingCart} />
        <KpiCard label="Total Revenue" value={`€${(summary.total_revenue || 0).toLocaleString()}`} icon={Euro} />
        <KpiCard label="Avg Ticket" value={`€${summary.avg_ticket || 0}`} icon={BarChart3} />
        <KpiCard label="Active Staff" value={summary.active_staff || 0} icon={Users} subtitle={`${summary.avg_orders_per_staff || 0} orders/staff`} />
      </div>

      {/* Daily Trend Chart */}
      {daily_trend.length > 0 && (
        <Card className="border-border bg-card/40">
          <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Activity className="h-4 w-4 text-blue-400" />Daily Orders & Revenue</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily_trend}>
                  <defs>
                    <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="orders" stroke="#3b82f6" fill="url(#gradOrders)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Ranking Table */}
      <Card className="border-border bg-card/40">
        <CardHeader><CardTitle className="text-sm font-bold">POS Leaderboard</CardTitle></CardHeader>
        <CardContent className="p-0">
          <DataTable
            onRowClick={(row) => onEmployeeClick?.(row.employee_id)}
            columns={[
              { key: 'employee_name', header: 'Employee' },
              { key: 'department', header: 'Department' },
              { key: 'total_orders', header: 'Orders', render: (v) => <span className="font-bold text-foreground">{v}</span> },
              { key: 'total_revenue', header: 'Revenue', render: (v) => <span>€{v?.toLocaleString()}</span> },
              { key: 'avg_ticket', header: 'Avg Ticket', render: (v) => <span>€{v}</span> },
              { key: 'orders_change_pct', header: 'vs Prev', render: (v) => <ChangeIndicator value={v} /> },
              { key: 'vs_team_avg_orders', header: 'vs Team', render: (v) => <ChangeIndicator value={v} /> },
            ]}
            data={employees}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function KdsTab({ data, onEmployeeClick }) {
  if (!data) return null;
  const { summary = {}, employees = [], hourly_distribution = [] } = data;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Tickets" value={summary.total_tickets?.toLocaleString() || 0} icon={Flame} />
        <KpiCard label="Avg Prep Time" value={`${summary.team_avg_completion_min || 0}m`} icon={Timer} />
        <KpiCard label="Kitchen Staff" value={summary.active_kitchen_staff || 0} icon={ChefHat} />
        <KpiCard label="Avg Tickets/Staff" value={summary.avg_tickets_per_staff || 0} icon={BarChart3} />
      </div>

      {/* Hourly Distribution */}
      {hourly_distribution.length > 0 && (
        <Card className="border-border bg-card/40">
          <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Clock className="h-4 w-4 text-purple-400" />Hourly Ticket Volume</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="hour" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(h) => `${h}:00`} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Bar dataKey="tickets" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KDS Leaderboard */}
      <Card className="border-border bg-card/40">
        <CardHeader><CardTitle className="text-sm font-bold">KDS Performance Ranking</CardTitle></CardHeader>
        <CardContent className="p-0">
          <DataTable
            onRowClick={(row) => onEmployeeClick?.(row.employee_id)}
            columns={[
              { key: 'employee_name', header: 'Employee' },
              { key: 'tickets_completed', header: 'Completed', render: (v) => <span className="font-bold text-foreground">{v}</span> },
              { key: 'avg_completion_min', header: 'Avg Time', render: (v) => <span>{v}m</span> },
              { key: 'items_per_hour', header: 'Items/Hr', render: (v) => <span className="font-semibold">{v}</span> },
              {
                key: 'on_time_rate', header: 'On-Time', render: (v) => (
                  <Badge variant={v >= 90 ? 'success' : v >= 70 ? 'warning' : 'destructive'} className="text-xs">{v}%</Badge>
                )
              },
              {
                key: 'vs_team_avg_sec', header: 'vs Team Avg', render: (v) => (
                  v !== null ? <span className={v < 0 ? 'text-emerald-400' : 'text-red-400'}>{v > 0 ? '+' : ''}{v}s</span> : <span className="text-muted-foreground">—</span>
                )
              },
              { key: 'volume_change_pct', header: 'vs Prev', render: (v) => <ChangeIndicator value={v} /> },
            ]}
            data={employees}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SystemTab({ data, onEmployeeClick }) {
  if (!data) return null;
  const { summary = {}, employees = [] } = data;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Recipes Created" value={summary.total_recipes_created || 0} icon={BookOpen} />
        <KpiCard label="Orders Taken" value={summary.total_orders_taken || 0} icon={ShoppingCart} />
        <KpiCard label="Hours Worked" value={`${summary.total_hours_worked || 0}h`} icon={Clock} />
        <KpiCard label="System Actions" value={summary.total_system_actions || 0} icon={Layers} />
        <KpiCard label="Active Employees" value={summary.active_employees || 0} icon={Users} />
      </div>

      {/* Pie Chart: Orders vs Recipes vs Actions */}
      {employees.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border bg-card/40">
            <CardHeader><CardTitle className="text-sm font-bold">Activity Distribution (Top 8)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={employees.slice(0, 8).map(e => ({ name: e.employee_name, value: e.orders_taken + e.total_system_actions }))}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={100}
                      paddingAngle={2} dataKey="value"
                    >
                      {employees.slice(0, 8).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Hours Distribution */}
          <Card className="border-border bg-card/40">
            <CardHeader><CardTitle className="text-sm font-bold">Hours Worked (Top 10)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={employees.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis dataKey="employee_name" type="category" tick={{ fill: '#71717a', fontSize: 10 }} width={100} />
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Bar dataKey="total_hours_worked" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Full Table */}
      <Card className="border-border bg-card/40">
        <CardHeader><CardTitle className="text-sm font-bold">Employee System Usage</CardTitle></CardHeader>
        <CardContent className="p-0">
          <DataTable
            onRowClick={(row) => onEmployeeClick?.(row.employee_id)}
            columns={[
              { key: 'employee_name', header: 'Employee' },
              { key: 'role', header: 'Role' },
              { key: 'orders_taken', header: 'Orders', render: (v) => <span className="font-bold text-foreground">{v}</span> },
              { key: 'recipes_created', header: 'Recipes', render: (v) => v > 0 ? <span className="text-emerald-400 font-bold">{v}</span> : <span className="text-muted-foreground">0</span> },
              { key: 'total_shifts', header: 'Shifts' },
              { key: 'total_hours_worked', header: 'Hours', render: (v) => <span>{v}h</span> },
              {
                key: 'attendance_rate', header: 'Attendance', render: (v) => (
                  <Badge variant={v >= 90 ? 'success' : v >= 70 ? 'warning' : 'destructive'} className="text-xs">{v}%</Badge>
                )
              },
              { key: 'total_system_actions', header: 'Actions' },
              { key: 'features_used_count', header: 'Features' },
            ]}
            data={employees}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────
export default function HRAnalytics() {
  const { activeVenueId: venueId } = useVenue();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [datePreset, setDatePreset] = useState('30d');
  const [overviewData, setOverviewData] = useState(null);
  const [posData, setPosData] = useState(null);
  const [kdsData, setKdsData] = useState(null);
  const [systemData, setSystemData] = useState(null);
  const [loading, setLoading] = useState(true);

  const dateRange = useMemo(() => {
    const preset = DATE_PRESETS.find(p => p.id === datePreset);
    return getDateRange(preset?.days || 30);
  }, [datePreset]);

  const fetchData = async () => {
    if (!venueId) return;
    setLoading(true);
    const params = `from_date=${dateRange.from}&to_date=${dateRange.to}`;
    try {
      const base = `/venues/${venueId}/hr/employee-analytics`;
      const [summaryRes, posRes, kdsRes, sysRes] = await Promise.allSettled([
        api.get(`${base}/summary?${params}`),
        api.get(`${base}/pos?${params}`),
        api.get(`${base}/kds?${params}`),
        api.get(`${base}/system?${params}`),
      ]);
      if (summaryRes.status === 'fulfilled') setOverviewData(summaryRes.value.data);
      if (posRes.status === 'fulfilled') setPosData(posRes.value.data);
      if (kdsRes.status === 'fulfilled') setKdsData(kdsRes.value.data);
      if (sysRes.status === 'fulfilled') setSystemData(sysRes.value.data);
    } catch (err) {
      logger.error('Failed to fetch HR analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [venueId, dateRange]);

  const handleEmployeeClick = (employeeId) => {
    if (employeeId && employeeId !== 'unknown') {
      navigate(`/manager/hr/employee-performance/${employeeId}?from=${dateRange.from}&to=${dateRange.to}`);
    }
  };

  return (
    <PermissionGate requiredRole="MANAGER">
      <div className="p-6 space-y-6">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-foreground">HR Workforce Analytics</h1>
          <p className="text-sm text-muted-foreground">POS, KDS & System insights per employee</p>
        </div>
        {/* Command Bar: Date + Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-card/60 rounded-lg p-1 border border-border">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === tab.id
                    ? 'bg-white/10 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-secondary-foreground hover:bg-white/5'
                    }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Date Presets */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1 bg-card/60 rounded-lg p-1 border border-border">
              {DATE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setDatePreset(preset.id)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${datePreset === preset.id
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-muted-foreground hover:text-secondary-foreground'
                    }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchData}
              className="p-1.5 rounded-md bg-card/60 border border-border hover:bg-white/5 transition-all"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="border-border bg-card/40 animate-pulse">
                <CardContent className="p-6"><div className="h-16 bg-secondary/50 rounded" /></CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div>
            {activeTab === 'overview' && <OverviewTab data={overviewData} />}
            {activeTab === 'pos' && <PosTab data={posData} onEmployeeClick={handleEmployeeClick} />}
            {activeTab === 'kds' && <KdsTab data={kdsData} onEmployeeClick={handleEmployeeClick} />}
            {activeTab === 'system' && <SystemTab data={systemData} onEmployeeClick={handleEmployeeClick} />}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}