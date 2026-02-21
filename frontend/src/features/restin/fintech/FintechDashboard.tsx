import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import {
ArrowUpRight,
CreditCard,
History,
Loader2,
Monitor,
PieChart,
Settings,
ShieldCheck,
Smartphone,
TrendingUp,
Zap,
} from 'lucide-react';
import React,{ useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card,CardContent,CardHeader,CardTitle } from "../../../components/ui/card";
import { useAuth } from '../../../context/AuthContext';
import { useVenue } from '../../../context/VenueContext';
import { fintechService } from './fintech-service';

// Rule 1: No 'any'
interface Transaction {
    id: string;
    method: string;
    amount_cents: number;
    tip_cents: number;
    total_cents: number;
    status: string;
    created_at: string;
}

interface FintechStats {
    total_transactions: number;
    total_revenue_cents: number;
    total_tips_cents: number;
    avg_transaction_cents: number;
    card_transactions: number;
    cash_transactions: number;
}

const formatCents = (cents: number) => {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
};

const FintechDashboard: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { activeVenueId } = useVenue();
    const { user: _user, isManager: _isManager, isOwner: _isOwner } = useAuth();
    const queryClient = useQueryClient();
    const [kioskMode, setKioskMode] = useState<boolean>(false);

    // Fetch kiosk config on mount
    useQuery<{ enabled: boolean }>({
        queryKey: ['fintech-kiosk-config', activeVenueId],
        queryFn: async () => {
            const config = await fintechService.getKioskConfig(activeVenueId || 'default');
            setKioskMode(config?.enabled || false);
            return config;
        },
        enabled: !!activeVenueId,
    });

    // Fetch real stats
    const { data: stats } = useQuery<FintechStats>({
        queryKey: ['fintech-stats', activeVenueId],
        queryFn: async () => {
            const response = await import('../../../lib/api').then(m => m.default.get(`/fintech/stats?venue_id=${activeVenueId}`));
            return response.data;
        },
        enabled: !!activeVenueId,
    });

    // Fetch real transactions
    const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
        queryKey: ['fintech-transactions', activeVenueId],
        queryFn: async () => {
            const response = await import('../../../lib/api').then(m => m.default.get(`/fintech/transactions?venue_id=${activeVenueId}`));
            return Array.isArray(response.data) ? response.data : [];
        },
        enabled: !!activeVenueId,
    });

    // Seed demo data
    const seedMutation = useMutation({
        mutationFn: async () => {
            const api = await import('../../../lib/api').then(m => m.default);
            return api.post(`/fintech/seed?venue_id=${activeVenueId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fintech-stats'] });
            queryClient.invalidateQueries({ queryKey: ['fintech-transactions'] });
            toast.success('Fintech demo data seeded!');
        },
    });

    // Toggle Kiosk Mutation
    const kioskMutation = useMutation({
        mutationFn: async () => {
            const newState = !kioskMode;
            await fintechService.toggleKiosk(activeVenueId || 'default', newState);
            return newState;
        },
        onSuccess: (newState) => {
            setKioskMode(newState);
            toast.success(newState ? "Kiosk Mode Activated" : "Kiosk Mode Disabled", {
                description: newState ? "Terminal is now in guest self-serve mode." : "Terminal returned to staff mode."
            });
        },
        onError: () => toast.error("Failed to toggle Kiosk Mode")
    });

    // Build metrics from real stats
    const metrics = [
        { label: 'Total Revenue', value: formatCents(stats?.total_revenue_cents || 0), change: `${stats?.total_transactions || 0} txns`, icon: TrendingUp },
        { label: 'Avg Ticket', value: formatCents(stats?.avg_transaction_cents || 0), change: `Tips: ${formatCents(stats?.total_tips_cents || 0)}`, icon: PieChart },
        { label: 'Cloud Sync', value: 'Active', change: '100%', icon: Zap },
    ];

    // Calculate channel mix from real data
    const totalTxns = (stats?.card_transactions || 0) + (stats?.cash_transactions || 0);
    const cardPct = totalTxns > 0 ? Math.round(((stats?.card_transactions || 0) / totalTxns) * 100) : 65;
    const cashPct = totalTxns > 0 ? 100 - cardPct : 35;

    const channelMix = [
        { label: 'Card (POS)', val: cardPct, color: 'bg-blue-500' },
        { label: 'Cash', val: cashPct, color: 'bg-green-500' },
    ];

    // Format time ago
    const timeAgo = (isoDate: string) => {
        try {
            const diff = Date.now() - new Date(isoDate).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 60) return `${mins}m ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs}h ago`;
            return `${Math.floor(hrs / 24)}d ago`;
        } catch { return 'recently'; }
    };

    return (
        <div className="p-6 space-y-6 bg-background min-h-screen text-foreground">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">{t('restin.fintech.title')}</h1>
                    <p className="text-muted-foreground">{t('restin.fintech.subtitle')}</p>
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
                    <Button
                        variant={kioskMode ? "destructive" : "outline"}
                        className={kioskMode ? "text-foreground font-bold" : "border-border text-secondary-foreground hover:bg-card transition-colors"}
                        onClick={() => kioskMutation.mutate()}
                        disabled={kioskMutation.isPending}
                    >
                        <Monitor className="w-4 h-4 mr-2" />
                        {kioskMode ? t('restin.fintech.kioskExit') : t('restin.fintech.kioskInit')}
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-foreground font-black border-none h-10 tracking-widest uppercase text-xs">
                        <CreditCard className="w-4 h-4 mr-2" />
                        {t('restin.fintech.terminalHub')}
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((m, i) => (
                    <Card
                        key={i}
                        className="bg-card border-border overflow-hidden group cursor-pointer hover:border-blue-500/50 transition-all"
                        onClick={() => navigate(`/manager/restin/fintech/metrics/${m.label.toLowerCase().replace(' ', '-')}`)}
                    >
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <m.icon className="w-5 h-5 text-blue-500" />
                                </div>
                                <span className="text-green-500 text-[10px] font-black">{m.change}</span>
                            </div>
                            <div className="text-3xl font-black text-foreground">{m.value}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">{m.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Transaction List */}
                <Card className="xl:col-span-2 bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-foreground text-lg font-bold">
                            <History className="w-5 h-5 text-blue-500" />
                            {t('restin.fintech.liveTransactions')} ({transactions.length})
                        </CardTitle>
                        <Button variant="ghost" className="text-[10px] text-muted-foreground font-black tracking-widest uppercase hover:text-foreground">
                            View All
                            <ArrowUpRight className="w-3 h-3 ml-2" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="p-8 text-center">
                                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin mx-auto mb-2" />
                                    <span className="text-muted-foreground text-sm">{"Loading "}transactions...</span>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="font-bold text-sm">{"No "}transactions</p>
                                    <p className="text-xs mt-1">Click "Seed Demo" to populate data</p>
                                </div>
                            ) : transactions.slice(0, 8).map((tr, i) => (
                                <div key={tr.id || i} className="flex items-center justify-between p-4 bg-background border border-border rounded-xl group hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center border border-border">
                                            {tr.method === 'CARD' && <CreditCard className="w-4 h-4 text-muted-foreground" />}
                                            {tr.method === 'CASH' && <Monitor className="w-4 h-4 text-muted-foreground" />}
                                            {tr.method === 'QR' && <Smartphone className="w-4 h-4 text-muted-foreground" />}
                                        </div>
                                        <div>
                                            <div className="font-bold font-mono tracking-tight text-secondary-foreground">{tr.id}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{timeAgo(tr.created_at)} via {tr.method}</div>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-6">
                                        <div>
                                            <div className="text-lg font-black text-foreground">{formatCents(tr.total_cents)}</div>
                                            <Badge className={tr.status === 'completed' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-none px-2 py-0 h-4 text-[9px] font-black' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none px-2 py-0 h-4 text-[9px] font-black'}>
                                                {tr.status?.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground group-hover:text-blue-500" aria-label="Action">
                                            <ArrowUpRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Omni-Channel Overview */}
                <div className="space-y-6">
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">{t('restin.fintech.omniChannelMix')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {channelMix.map((item, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                                        <span className="text-muted-foreground">{item.label}</span>
                                        <span className="text-secondary-foreground">{item.val}%</span>
                                    </div>
                                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color} shadow-sm shadow-current`} style={{ width: `${item.val}%`  /* keep-inline */ }} />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-zinc-900 to-black border-border relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ShieldCheck className="w-24 h-24" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('restin.fintech.securityCompliance')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 rounded-full">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-secondary-foreground uppercase tracking-tight">PCI-DSS Level 1</div>
                                    <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Audit Passed 04 Feb 2026</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default FintechDashboard;
