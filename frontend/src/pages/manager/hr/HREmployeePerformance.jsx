/**
 * HREmployeePerformance.jsx — Deep Drill-Down per Employee
 * POS Performance | KDS Performance | System Usage | Comparisons
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useVenue } from '@/context/VenueContext';
import PermissionGate from '@/components/shared/PermissionGate';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import logger from '@/lib/logger';
import {
    BarChart, Bar, AreaChart, Area, ResponsiveContainer,
    XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import {
    ArrowLeft, ShoppingCart, Flame, Timer, Users, BookOpen,
    Clock, Layers, ChefHat, Euro, Activity, Calendar,
    ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Award
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────
const DATE_PRESETS = [
    { id: 'today', label: 'Today', days: 0 },
    { id: '7d', label: '7 Days', days: 7 },
    { id: '30d', label: '30 Days', days: 30 },
    { id: '90d', label: '90 Days', days: 90 },
];

const TABS = [
    { id: 'pos', label: 'POS Performance', icon: ShoppingCart },
    { id: 'kds', label: 'KDS Performance', icon: Flame },
    { id: 'system', label: 'System Usage', icon: Layers },
];

function getDateRange(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days || 30));
    return { from: start.toISOString(), to: end.toISOString() };
}

function ChangeIndicator({ value, label }) {
    if (value === 0 || value === null || value === undefined)
        return <span className="flex items-center gap-1 text-zinc-500 text-sm"><Minus className="h-3 w-3" /> No change{label ? ` (${label})` : ''}</span>;
    if (value > 0)
        return <span className="flex items-center gap-1 text-emerald-400 text-sm font-bold"><ArrowUpRight className="h-3 w-3" /> +{value}%{label ? ` ${label}` : ''}</span>;
    return <span className="flex items-center gap-1 text-red-400 text-sm font-bold"><ArrowDownRight className="h-3 w-3" /> {value}%{label ? ` ${label}` : ''}</span>;
}

function StatCard({ label, value, icon: Icon, subtitle, accent = 'blue' }) {
    const accents = { blue: 'text-blue-400', purple: 'text-purple-400', emerald: 'text-emerald-400', amber: 'text-amber-400', cyan: 'text-cyan-400' };
    return (
        <Card className="border-white/5 bg-zinc-900/60 backdrop-blur-xl">
            <CardContent className="p-5">
                <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center ${accents[accent]}`}>
                        {Icon && <Icon className="h-5 w-5" />}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
                        <p className="text-xl font-black text-white">{value}</p>
                        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function DeltaCard({ label, current, previous, unit = '' }) {
    const change = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100 * 10) / 10;
    return (
        <Card className="border-white/5 bg-zinc-900/40">
            <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-lg font-black text-white">{current}{unit}</p>
                        <p className="text-xs text-zinc-500">prev: {previous}{unit}</p>
                    </div>
                    <ChangeIndicator value={change} />
                </div>
            </CardContent>
        </Card>
    );
}

// ── Main Component ───────────────────────────────────────────
export default function HREmployeePerformance() {
    const { employeeId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { activeVenueId: venueId } = useVenue();

    const [activeTab, setActiveTab] = useState('pos');
    const [datePreset, setDatePreset] = useState('30d');
    const [employee, setEmployee] = useState(null);
    const [posData, setPosData] = useState(null);
    const [kdsData, setKdsData] = useState(null);
    const [systemData, setSystemData] = useState(null);
    const [loading, setLoading] = useState(true);

    const dateRange = useMemo(() => {
        const preset = DATE_PRESETS.find(p => p.id === datePreset);
        return getDateRange(preset?.days || 30);
    }, [datePreset]);

    useEffect(() => {
        if (!venueId || !employeeId) return;
        const fetchAll = async () => {
            setLoading(true);
            const params = `from_date=${dateRange.from}&to_date=${dateRange.to}&employee_id=${employeeId}`;
            const base = `/venues/${venueId}/hr/employee-analytics`;
            try {
                const [posRes, kdsRes, sysRes] = await Promise.allSettled([
                    api.get(`${base}/pos?${params}`),
                    api.get(`${base}/kds?${params}`),
                    api.get(`${base}/system?${params}`),
                ]);
                if (posRes.status === 'fulfilled') {
                    setPosData(posRes.value.data);
                    const emp = posRes.value.data?.employees?.[0];
                    if (emp) setEmployee({ name: emp.employee_name, department: emp.department });
                }
                if (kdsRes.status === 'fulfilled') {
                    setKdsData(kdsRes.value.data);
                    if (!employee) {
                        const emp = kdsRes.value.data?.employees?.[0];
                        if (emp) setEmployee({ name: emp.employee_name, department: emp.department });
                    }
                }
                if (sysRes.status === 'fulfilled') {
                    setSystemData(sysRes.value.data);
                    if (!employee) {
                        const emp = sysRes.value.data?.employees?.[0];
                        if (emp) setEmployee({ name: emp.employee_name, department: emp.department, role: emp.role });
                    }
                }
            } catch (err) {
                logger.error('Failed to fetch employee performance:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [venueId, employeeId, dateRange]);

    const posEmp = posData?.employees?.[0] || {};
    const kdsEmp = kdsData?.employees?.[0] || {};
    const sysEmp = systemData?.employees?.[0] || {};

    return (
        <PermissionGate requiredRole="MANAGER">
            <PageContainer
                title={employee?.name || 'Employee Performance'}
                description={employee ? `${employee.department || ''} ${employee.role ? `· ${employee.role}` : ''}` : 'Loading...'}
            >
                {/* Back + Tabs + Date */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/manager/hr/analytics')}
                            className="p-2 rounded-lg bg-zinc-900/60 border border-white/5 hover:bg-white/5 transition-all"
                        >
                            <ArrowLeft className="h-4 w-4 text-zinc-400" />
                        </button>
                        <div className="flex items-center gap-1 bg-zinc-900/60 rounded-lg p-1 border border-white/5">
                            {TABS.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === tab.id
                                            ? 'bg-white/10 text-white shadow-sm'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                            }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-zinc-500" />
                        <div className="flex gap-1 bg-zinc-900/60 rounded-lg p-1 border border-white/5">
                            {DATE_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => setDatePreset(preset.id)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${datePreset === preset.id
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid gap-4 md:grid-cols-3">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="border-white/5 bg-zinc-900/40 animate-pulse">
                                <CardContent className="p-6"><div className="h-20 bg-zinc-800/50 rounded" /></CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* POS Tab */}
                        {activeTab === 'pos' && (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <StatCard label="Orders Taken" value={posEmp.total_orders || 0} icon={ShoppingCart} accent="blue" />
                                    <StatCard label="Revenue Generated" value={`€${(posEmp.total_revenue || 0).toLocaleString()}`} icon={Euro} accent="emerald" />
                                    <StatCard label="Avg Ticket" value={`€${posEmp.avg_ticket || 0}`} icon={TrendingUp} accent="purple" />
                                    <StatCard label="Items Sold" value={posEmp.total_items_sold || 0} icon={Activity} accent="amber" />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <DeltaCard label="Orders vs Previous Period" current={posEmp.total_orders || 0} previous={Math.round((posEmp.total_orders || 0) * 100 / Math.max(100 + (posEmp.orders_change_pct || 0), 1))} />
                                    <DeltaCard label="Revenue vs Previous Period" current={posEmp.total_revenue || 0} previous={Math.round((posEmp.total_revenue || 0) * 100 / Math.max(100 + (posEmp.revenue_change_pct || 0), 1))} unit="€" />
                                </div>
                                <Card className="border-white/5 bg-zinc-900/40 p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Award className="h-5 w-5 text-amber-400" />
                                        <span className="text-sm font-bold text-white">Performance vs Team Average</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <ChangeIndicator value={posEmp.vs_team_avg_orders} label="orders vs team avg" />
                                    </div>
                                </Card>
                                {/* Daily chart from full POS data */}
                                {posData?.daily_trend?.length > 0 && (
                                    <Card className="border-white/5 bg-zinc-900/40">
                                        <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Activity className="h-4 w-4 text-blue-400" />Daily Orders Trend</CardTitle></CardHeader>
                                        <CardContent>
                                            <div className="h-[240px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={posData.daily_trend}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                                        <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                                                        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                                                        <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                                                        <Area type="monotone" dataKey="orders" stroke="#3b82f6" fill="#3b82f680" strokeWidth={2} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}

                        {/* KDS Tab */}
                        {activeTab === 'kds' && (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <StatCard label="Tickets Completed" value={kdsEmp.tickets_completed || 0} icon={Flame} accent="purple" />
                                    <StatCard label="Avg Prep Time" value={`${kdsEmp.avg_completion_min || 0}m`} icon={Timer} accent="amber" />
                                    <StatCard label="Items/Hour" value={kdsEmp.items_per_hour || 0} icon={ChefHat} accent="cyan" />
                                    <StatCard label="On-Time Rate" value={`${kdsEmp.on_time_rate || 0}%`} icon={Clock} accent="emerald" />
                                </div>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Card className="border-white/5 bg-zinc-900/40 p-5">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">vs Team Average</p>
                                        {kdsEmp.vs_team_avg_sec !== null ? (
                                            <p className={`text-lg font-black ${kdsEmp.vs_team_avg_sec < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {kdsEmp.vs_team_avg_sec > 0 ? '+' : ''}{kdsEmp.vs_team_avg_sec}s
                                            </p>
                                        ) : <p className="text-zinc-500">No data</p>}
                                        <p className="text-xs text-zinc-500 mt-1">{kdsEmp.vs_team_avg_sec < 0 ? 'Faster than average' : 'Slower than average'}</p>
                                    </Card>
                                    <DeltaCard label="Speed vs Previous" current={kdsEmp.avg_completion_sec || 0} previous={Math.round((kdsEmp.avg_completion_sec || 0) * 100 / Math.max(100 + (kdsEmp.speed_change_pct || 0), 1))} unit="s" />
                                    <DeltaCard label="Volume vs Previous" current={kdsEmp.tickets_completed || 0} previous={Math.round((kdsEmp.tickets_completed || 0) * 100 / Math.max(100 + (kdsEmp.volume_change_pct || 0), 1))} />
                                </div>
                            </div>
                        )}

                        {/* System Tab */}
                        {activeTab === 'system' && (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                                    <StatCard label="Orders Taken" value={sysEmp.orders_taken || 0} icon={ShoppingCart} accent="blue" />
                                    <StatCard label="Recipes Created" value={sysEmp.recipes_created || 0} icon={BookOpen} accent="purple" />
                                    <StatCard label="Shifts Worked" value={sysEmp.total_shifts || 0} icon={Clock} accent="cyan" />
                                    <StatCard label="Hours Worked" value={`${sysEmp.total_hours_worked || 0}h`} icon={Timer} accent="amber" />
                                    <StatCard label="System Actions" value={sysEmp.total_system_actions || 0} icon={Layers} accent="emerald" />
                                </div>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Card className="border-white/5 bg-zinc-900/40 p-5">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Attendance Rate</p>
                                        <p className="text-2xl font-black text-white">{sysEmp.attendance_rate || 0}%</p>
                                        <Badge
                                            variant={sysEmp.attendance_rate >= 90 ? 'success' : sysEmp.attendance_rate >= 70 ? 'warning' : 'destructive'}
                                            className="mt-2 text-xs"
                                        >
                                            {sysEmp.attendance_rate >= 90 ? 'Excellent' : sysEmp.attendance_rate >= 70 ? 'Average' : 'Needs Improvement'}
                                        </Badge>
                                    </Card>
                                    <Card className="border-white/5 bg-zinc-900/40 p-5">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Late Arrivals</p>
                                        <p className="text-2xl font-black text-red-400">{sysEmp.late_arrivals || 0}</p>
                                        <p className="text-xs text-zinc-500 mt-1">out of {sysEmp.total_shifts || 0} shifts</p>
                                    </Card>
                                    <Card className="border-white/5 bg-zinc-900/40 p-5">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Features Used</p>
                                        <p className="text-2xl font-black text-cyan-400">{sysEmp.features_used_count || 0}</p>
                                        <p className="text-xs text-zinc-500 mt-1">unique system features</p>
                                    </Card>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </PageContainer>
        </PermissionGate>
    );
}
