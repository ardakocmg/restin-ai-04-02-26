import React, { useState } from 'react';
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
    Wallet
} from 'lucide-react';

const FintechDashboard = () => {
    const [kioskMode, setKioskMode] = useState(false);

    const metrics = [
        { label: 'Today Revenue', value: '€4,280', change: '+18.2%', icon: TrendingUp },
        { label: 'Avg Ticket', value: '€32.50', change: '+2.4%', icon: PieChart },
        { label: 'Cloud Sync', value: 'Active', change: '100%', icon: Zap },
    ];

    const transactions = [
        { id: '#TR-8821', type: 'CARD', amount: '€42.00', status: 'SUCCESS', time: '2m ago' },
        { id: '#TR-8820', type: 'KIOSK', amount: '€18.50', status: 'SUCCESS', time: '5m ago' },
        { id: '#TR-8819', type: 'MOBILE', amount: '€124.00', status: 'PENDING', time: '8m ago' },
        { id: '#TR-8818', type: 'CARD', amount: '€65.20', status: 'SUCCESS', time: '12m ago' },
    ];

    return (
        <div className="p-6 space-y-6 bg-zinc-950 min-h-screen text-white">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Fintech & Omni-Payment</h1>
                    <p className="text-zinc-400">Seamless transaction management and kiosk configurations.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant={kioskMode ? "destructive" : "outline"}
                        className={kioskMode ? "" : "border-zinc-800 text-zinc-300"}
                        onClick={() => setKioskMode(!kioskMode)}
                    >
                        <Monitor className="w-4 h-4 mr-2" />
                        {kioskMode ? "Exit Kiosk Mode" : "Enter Kiosk Mode"}
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 font-bold">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Terminal Hub
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((m, i) => (
                    <Card key={i} className="bg-zinc-900 border-zinc-800 overflow-hidden group">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <m.icon className="w-5 h-5 text-blue-500" />
                                </div>
                                <span className="text-green-500 text-xs font-bold">{m.change}</span>
                            </div>
                            <div className="text-3xl font-black">{m.value}</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">{m.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Transaction List */}
                <Card className="xl:col-span-2 bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <History className="w-5 h-5 text-blue-500" />
                            Live Transactions
                        </CardTitle>
                        <Button variant="ghost" className="text-xs text-zinc-500 font-bold tracking-widest uppercase">
                            View All
                            <ArrowUpRight className="w-3 h-3 ml-2" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {transactions.map((tr, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800 group hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center">
                                            {tr.type === 'CARD' && <CreditCard className="w-4 h-4 text-zinc-400" />}
                                            {tr.type === 'KIOSK' && <Monitor className="w-4 h-4 text-zinc-400" />}
                                            {tr.type === 'MOBILE' && <Smartphone className="w-4 h-4 text-zinc-400" />}
                                        </div>
                                        <div>
                                            <div className="font-bold font-mono tracking-tight text-white">{tr.id}</div>
                                            <div className="text-[10px] text-zinc-500 uppercase font-black">{tr.time} via {tr.type}</div>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-6">
                                        <div>
                                            <div className="text-lg font-black">{tr.amount}</div>
                                            <Badge className={tr.status === 'SUCCESS' ? 'bg-green-500/10 text-green-500 border-none px-2 py-0 h-4 text-[9px]' : 'bg-amber-500/10 text-amber-500 border-none px-2 py-0 h-4 text-[9px]'}>
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
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-500 italic">Omni-Channel Mix</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {[
                                { label: 'In-Store POS', val: 65, color: 'bg-blue-500' },
                                { label: 'Self-Serve Kiosk', val: 24, color: 'bg-purple-500' },
                                { label: 'Mobile / QR', val: 11, color: 'bg-green-500' },
                            ].map((item, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-xs font-bold mb-2">
                                        <span className="text-zinc-400">{item.label}</span>
                                        <span className="text-white">{item.val}%</span>
                                    </div>
                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }} />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <ShieldCheck className="w-24 h-24" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-500">Security & Compliance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 rounded-full">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold">PCI-DSS Level 1</div>
                                    <div className="text-[10px] text-zinc-500 uppercase">Audit Passed 04 Feb 2026</div>
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
