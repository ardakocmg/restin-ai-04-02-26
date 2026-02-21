import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
    Activity,
    Truck,
    Clock,
    AlertCircle,
    CheckCircle2,
    Layers,
    ArrowUpRight,
    RefreshCw,
    Loader2,
    Settings,
    DollarSign,
    Users,
    Flame,
    AlertTriangle,
    TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { opsService, aggregatorService } from './ops-service';
import { useVenue } from '../../../context/VenueContext';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';

// Rule 1: No 'any'
interface OpsMetrics {
    total_orders: number;
    orders_today: number;
    total_revenue_cents: number;
    labor_cost_cents: number;
    labor_percentage: number;
    kds_pending: number;
    kds_in_progress: number;
    waste_cost_cents: number;
    food_cost_percentage: number;
}

interface AggregatorConfig {
    platform: string;
    status: string;
    orders_today: number;
    revenue_today_cents: number;
    commission_pct: number;
}

interface OpsLogEntry {
    id: string;
    event: string;
    severity: string;
    created_at: string;
}

interface LaborAlert {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    labor_pct: number;
    threshold: number;
    created_at: string;
}

const formatCents = (cents: number) =>
    new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

const timeAgo = (iso: string) => {
    try {
        const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
        if (mins < 60) return `${mins}m ago`;
        if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
        return `${Math.floor(mins / 1440)}d ago`;
    } catch { return ''; }
};

const OpsDashboard: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { activeVenueId } = useVenue();
    const { user, isManager, isOwner } = useAuth();
    const queryClient = useQueryClient();

    // Fetch real metrics
    const { data: metrics } = useQuery<OpsMetrics>({
        queryKey: ['ops-metrics', activeVenueId],
        queryFn: () => opsService.getMetrics(activeVenueId || 'default'),
        enabled: !!activeVenueId
    });

    // Fetch Aggregators
    const { data: aggregators = [] } = useQuery<AggregatorConfig[]>({
        queryKey: ['ops-aggregators', activeVenueId],
        queryFn: async () => {
            const res = await aggregatorService.getStatus(activeVenueId || 'default');
            return Array.isArray(res) ? res : [];
        },
        enabled: !!activeVenueId
    });

    // Fetch Logs
    const { data: logs = [] } = useQuery<OpsLogEntry[]>({
        queryKey: ['ops-logs', activeVenueId],
        queryFn: async () => {
            const res = await opsService.getLogs(activeVenueId || 'default');
            return Array.isArray(res) ? res : [];
        },
        enabled: !!activeVenueId
    });

    // Fetch Labor Alerts
    const { data: laborAlerts = [] } = useQuery<LaborAlert[]>({
        queryKey: ['ops-labor-alerts', activeVenueId],
        queryFn: async () => {
            const res = await opsService.getLaborAlerts(activeVenueId || 'default');
            return Array.isArray(res) ? res : [];
        },
        enabled: !!activeVenueId
    });

    // Seed
    const seedMutation = useMutation({
        mutationFn: async () => {
            const api = await import('../../../lib/api').then(m => m.default);
            return api.post(`/ops/seed?venue_id=${activeVenueId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ops-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['ops-aggregators'] });
            queryClient.invalidateQueries({ queryKey: ['ops-logs'] });
            toast.success('Ops demo data seeded!');
        },
    });

    // Build metric cards from real data
    const metricCards = [
        { label: 'Labor Cost %', value: `${metrics?.labor_percentage || 0}%`, target: '28%', icon: Users, status: (metrics?.labor_percentage || 0) <= 30 ? 'OK' : 'HIGH' },
        { label: 'KDS Pending', value: `${metrics?.kds_pending || 0}`, target: '<5', icon: Flame, status: (metrics?.kds_pending || 0) <= 5 ? 'OK' : 'BUSY' },
        { label: 'Revenue Today', value: formatCents(metrics?.total_revenue_cents || 0), target: `${metrics?.total_orders || 0} orders`, icon: DollarSign, status: 'LIVE' },
    ];

    const platformColors: Record<string, string> = {
        wolt: 'bg-blue-500',
        uber_eats: 'bg-green-500',
        bolt_food: 'bg-emerald-500',
    };

    return (
        <div className="p-6 space-y-6 bg-background min-h-screen text-foreground">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">{t('restin.ops.title')}</h1>
                    <p className="text-muted-foreground">{t('restin.ops.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => seedMutation.mutate()}
                        disabled={seedMutation.isPending}
                        className="border-border text-secondary-foreground hover:bg-card gap-2"
                    >
                        {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                        Seed Demo
                    </Button>
                    <Button variant="outline" className="border-border text-secondary-foreground hover:bg-card transition-colors">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {t('common.sync')}
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-foreground font-bold border-none">
                        <Layers className="w-4 h-4 mr-2" />
                        {t('restin.ops.dispatchEngine')}
                    </Button>
                </div>
            </div>

            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metricCards.map((m, i) => (
                    <Card
                        key={i}
                        className="bg-card border-border overflow-hidden relative group cursor-pointer hover:border-red-500/50 transition-all"
                        onClick={() => navigate(`/manager/restin/ops/metrics/${m.label.toLowerCase().replace(' ', '-')}`)}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                                <div className="p-2 bg-secondary rounded-lg">
                                    <m.icon className="w-4 h-4 text-red-500" />
                                </div>
                                <Badge className={`text-[10px] font-black border-none ${m.status === 'OK' ? 'bg-green-500/10 text-green-500' : m.status === 'HIGH' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>{m.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black mb-1 text-foreground">{m.value}</div>
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{m.label}</span>
                                <span className="text-[10px] text-muted-foreground font-mono italic">Target: {m.target}</span>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 h-0.5 bg-red-600/50 w-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Aggregator Status */}
                <Card className="xl:col-span-2 bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground text-lg font-bold">
                            <Truck className="w-5 h-5 text-red-500" />
                            Delivery Aggregators
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {aggregators.length === 0 ? (
                                <div className="col-span-2 text-center text-muted-foreground py-8">
                                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm font-bold">{"No "}aggregators configured</p>
                                    <p className="text-xs mt-1">Click "Seed Demo" to populate data</p>
                                </div>
                            ) : aggregators.map((agg, i) => (
                                <div key={i} className="p-4 rounded-xl bg-background border border-border hover:border-border transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${agg.status === 'online' ? 'bg-green-500' : agg.status === 'paused' ? 'bg-amber-500' : 'bg-zinc-600'}`} />
                                            <span className="font-bold text-lg text-foreground capitalize">{agg.platform?.replace('_', ' ')}</span>
                                        </div>
                                        <Badge variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity uppercase text-[10px] border-border text-muted-foreground italic">Settings</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-card rounded-lg">
                                            <div className="text-[10px] text-muted-foreground uppercase font-black mb-1 tracking-widest">Live Orders</div>
                                            <div className="text-xl font-black text-foreground">{agg.orders_today || 0}</div>
                                        </div>
                                        <div className="p-3 bg-card rounded-lg">
                                            <div className="text-[10px] text-muted-foreground uppercase font-black mb-1 tracking-widest">Today's Rev.</div>
                                            <div className="text-xl font-black text-foreground">{formatCents(agg.revenue_today_cents || 0)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <Button className="flex-1 bg-secondary hover:bg-secondary/80 h-8 text-[10px] font-black tracking-widest uppercase border-none text-secondary-foreground">
                                            {agg.status === 'online' ? t('restin.ops.pauseStream') : 'Go Live'}
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="Action">
                                            <ArrowUpRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Operations Feed */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">{t('restin.ops.liveFeed')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {logs.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">{"No "}events yet. Seed demo data to populate.</p>
                        ) : logs.map((log, i) => (
                            <div key={log.id || i} className="flex gap-3 items-start group">
                                <span className="text-[10px] font-mono text-muted-foreground mt-1 whitespace-nowrap">{timeAgo(log.created_at)}</span>
                                <div className="flex-1 text-xs text-muted-foreground leading-tight group-hover:text-secondary-foreground transition-colors">
                                    {log.event}
                                </div>
                                {log.severity === 'warning' && <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400 flex-shrink-0" />}
                                {log.severity === 'info' && <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />}
                            </div>
                        ))}
                        <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground mt-4 border border-border border-dashed hover:bg-secondary h-10 transition-all">
                            View Full Audit Trail
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Labor Alerts Section */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground text-lg font-bold">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Labor Cost Alerts
                        {laborAlerts.length > 0 && (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none ml-2 text-[10px] font-black">
                                {laborAlerts.length} Active
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {laborAlerts.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600 dark:text-green-400 opacity-50" />
                            <p className="text-sm font-bold">All labor metrics within threshold</p>
                            <p className="text-xs mt-1 text-muted-foreground">Current: {metrics?.labor_percentage || 0}% — Target: ≤28%</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {laborAlerts.map((alert, i) => (
                                <div key={alert.id || i} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${alert.severity === 'critical' ? 'bg-red-500/5 border-red-500/20' :
                                        alert.severity === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                                            'bg-green-500/5 border-green-500/20'
                                    }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alert.severity === 'critical' ? 'bg-red-500/10' :
                                                alert.severity === 'warning' ? 'bg-amber-500/10' :
                                                    'bg-green-500/10'
                                            }`}>
                                            {alert.severity === 'critical' ? <AlertCircle className="w-5 h-5 text-red-500" /> :
                                                alert.severity === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-500" /> :
                                                    <TrendingUp className="w-5 h-5 text-green-500" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{alert.message}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                                                Labor: {alert.labor_pct}% • Threshold: {alert.threshold}%
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className={`border-none text-[10px] font-black uppercase ${alert.severity === 'critical' ? 'bg-red-500/10 text-red-500' :
                                            alert.severity === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                                                'bg-green-500/10 text-green-500'
                                        }`}>
                                        {alert.severity}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default OpsDashboard;
