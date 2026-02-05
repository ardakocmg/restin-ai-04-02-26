import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
    CreditCard,
    Smartphone,
    Monitor,
    ShieldCheck,
    ArrowUpRight,
    TrendingUp,
    Zap,
    History,
    PieChart,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Rule 1: No 'any'
interface PaymentMetric {
    label: string;
    value: string;
    change: string;
    icon: React.ElementType;
}

interface Transaction {
    id: string;
    type: 'CARD' | 'KIOSK' | 'MOBILE';
    amountCents: number; // Rule 4: Cents
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    time: string;
}

interface ChannelMix {
    label: string;
    val: number;
    color: string;
}

const formatCents = (cents: number) => {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
};

const FintechDashboard: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [kioskMode, setKioskMode] = useState<boolean>(false);

    const metrics: PaymentMetric[] = [
        { label: 'Today Revenue', value: formatCents(428000), change: '+18.2%', icon: TrendingUp },
        { label: 'Avg Ticket', value: formatCents(3250), change: '+2.4%', icon: PieChart },
        { label: 'Cloud Sync', value: 'Active', change: '100%', icon: Zap },
    ];

    const transactions: Transaction[] = [
        { id: '#TR-8821', type: 'CARD', amountCents: 4200, status: 'SUCCESS', time: '2m ago' },
        { id: '#TR-8820', type: 'KIOSK', amountCents: 1850, status: 'SUCCESS', time: '5m ago' },
        { id: '#TR-8819', type: 'MOBILE', amountCents: 12400, status: 'PENDING', time: '8m ago' },
        { id: '#TR-8818', type: 'CARD', amountCents: 6520, status: 'SUCCESS', time: '12m ago' },
    ];

    const channelMix: ChannelMix[] = [
        { label: 'In-Store POS', val: 65, color: 'bg-blue-500' },
        { label: 'Self-Serve Kiosk', val: 24, color: 'bg-purple-500' },
        { label: 'Mobile / QR', val: 11, color: 'bg-green-500' },
    ];

    return (
        <div className="p-6 space-y-6 bg-zinc-950 min-h-screen text-white">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">{t('restin.fintech.title')}</h1>
                    <p className="text-zinc-400">{t('restin.fintech.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant={kioskMode ? "destructive" : "outline"}
                        className={kioskMode ? "text-white font-bold" : "border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-colors"}
                        onClick={() => setKioskMode(!kioskMode)}
                    >
                        <Monitor className="w-4 h-4 mr-2" />
                        {kioskMode ? t('restin.fintech.kioskExit') : t('restin.fintech.kioskInit')}
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white font-black border-none h-10 tracking-widest uppercase text-xs">
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
                        className="bg-zinc-900 border-zinc-800 overflow-hidden group cursor-pointer hover:border-blue-500/50 transition-all"
                        onClick={() => navigate(`/admin/restin/fintech/metrics/${m.label.toLowerCase().replace(' ', '-')}`)}
                    >
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <m.icon className="w-5 h-5 text-blue-500" />
                                </div>
                                <span className="text-green-500 text-[10px] font-black">{m.change}</span>
                            </div>
                            <div className="text-3xl font-black text-white">{m.value}</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mt-1">{m.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Transaction List */}
                <Card className="xl:col-span-2 bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-white text-lg font-bold">
                            <History className="w-5 h-5 text-blue-500" />
                            {t('restin.fintech.liveTransactions')}
                        </CardTitle>
                        <Button variant="ghost" className="text-[10px] text-zinc-500 font-black tracking-widest uppercase hover:text-white">
                            View All
                            <ArrowUpRight className="w-3 h-3 ml-2" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {transactions.map((tr, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl group hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800">
                                            {tr.type === 'CARD' && <CreditCard className="w-4 h-4 text-zinc-400" />}
                                            {tr.type === 'KIOSK' && <Monitor className="w-4 h-4 text-zinc-400" />}
                                            {tr.type === 'MOBILE' && <Smartphone className="w-4 h-4 text-zinc-400" />}
                                        </div>
                                        <div>
                                            <div className="font-bold font-mono tracking-tight text-zinc-200">{tr.id}</div>
                                            <div className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">{tr.time} via {tr.type}</div>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-6">
                                        <div>
                                            <div className="text-lg font-black text-white">{formatCents(tr.amountCents)}</div>
                                            <Badge className={tr.status === 'SUCCESS' ? 'bg-green-500/10 text-green-500 border-none px-2 py-0 h-4 text-[9px] font-black' : 'bg-amber-500/10 text-amber-500 border-none px-2 py-0 h-4 text-[9px] font-black'}>
                                                {tr.status}
                                            </Badge>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 group-hover:text-blue-500">
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
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 italic">{t('restin.fintech.omniChannelMix')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {channelMix.map((item, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                                        <span className="text-zinc-500">{item.label}</span>
                                        <span className="text-zinc-300">{item.val}%</span>
                                    </div>
                                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color} shadow-sm shadow-current`} style={{ width: `${item.val}%` }} />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ShieldCheck className="w-24 h-24" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t('restin.fintech.securityCompliance')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 rounded-full">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-zinc-200 uppercase tracking-tight">PCI-DSS Level 1</div>
                                    <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Audit Passed 04 Feb 2026</div>
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
