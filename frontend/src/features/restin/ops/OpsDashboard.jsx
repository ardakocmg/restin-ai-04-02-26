import React from 'react';
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
    BarChart
} from 'lucide-react';

const OpsDashboard = () => {
    const aggregators = [
        { name: 'UberEats', status: 'Online', orders: 12, revenue: '€240', color: 'bg-green-500' },
        { name: 'Wolt', status: 'Online', orders: 8, revenue: '€160', color: 'bg-blue-500' },
        { name: 'Bolt Food', status: 'Busy', orders: 15, revenue: '€310', color: 'bg-amber-500' },
        { name: 'Glovo', status: 'Offline', orders: 0, revenue: '€0', color: 'bg-zinc-500' },
    ];

    const metrics = [
        { label: 'Avg Prep Time', value: '12m', target: '< 15m', icon: Clock, status: 'Optimal' },
        { label: 'Error Rate', value: '0.2%', target: '< 1%', icon: AlertCircle, status: 'Healthy' },
        { label: 'Labour Cost %', value: '28.4%', target: '30%', icon: Activity, status: 'On Track' },
    ];

    return (
        <div className="p-6 space-y-6 bg-zinc-950 min-h-screen text-white">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Ops & Aggregator Hub</h1>
                    <p className="text-zinc-400">Real-time operational efficiency and delivery injection.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="border-zinc-800 text-zinc-300">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync All
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700">
                        <Layers className="w-4 h-4 mr-2" />
                        Dispatch Engine
                    </Button>
                </div>
            </div>

            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((m, i) => (
                    <Card key={i} className="bg-zinc-900 border-zinc-800 overflow-hidden relative group">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                                <div className="p-2 bg-zinc-800 rounded-lg">
                                    <m.icon className="w-4 h-4 text-red-500" />
                                </div>
                                <Badge className="bg-green-500/10 text-green-500 border-none text-[10px]">{m.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black mb-1">{m.value}</div>
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{m.label}</span>
                                <span className="text-[10px] text-zinc-600 font-mono italic">Target: {m.target}</span>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 h-[2px] bg-red-600/50 w-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Aggregator Status */}
                <Card className="xl:col-span-2 bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="w-5 h-5 text-red-500" />
                            Delivery Aggregators
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {aggregators.map((agg, i) => (
                                <div key={i} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${agg.color}`} />
                                            <span className="font-bold text-lg">{agg.name}</span>
                                        </div>
                                        <Badge variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity uppercase text-[10px]">Settings</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-zinc-900 rounded-lg">
                                            <div className="text-[10px] text-zinc-500 uppercase font-black mb-1">Live Orders</div>
                                            <div className="text-xl font-bold">{agg.orders}</div>
                                        </div>
                                        <div className="p-3 bg-zinc-900 rounded-lg">
                                            <div className="text-[10px] text-zinc-500 uppercase font-black mb-1">Today's Rev.</div>
                                            <div className="text-xl font-bold">{agg.revenue}</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <Button className="flex-1 bg-zinc-800 hover:bg-zinc-700 h-8 text-[10px] font-black tracking-widest uppercase">
                                            Pause Stream
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500">
                                            <ArrowUpRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Operations Feed */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-500">Live Operations Feed</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            { time: '12:42', type: 'order', msg: 'UberEats #422 injected to KDS' },
                            { time: '12:40', type: 'alert', msg: 'Labour cost spike detected (32%)' },
                            { time: '12:35', type: 'success', msg: 'Auto-sync with apicbase completed' },
                            { time: '12:30', type: 'order', msg: 'Wolt #112 marked ready for pickup' },
                        ].map((log, i) => (
                            <div key={i} className="flex gap-3 items-start group">
                                <span className="text-[10px] font-mono text-zinc-600 mt-1">{log.time}</span>
                                <div className="flex-1 text-xs text-zinc-400 leading-tight group-hover:text-zinc-200 transition-colors">
                                    {log.msg}
                                </div>
                                {log.type === 'alert' && <AlertCircle className="w-3 h-3 text-red-500" />}
                                {log.type === 'success' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                            </div>
                        ))}
                        <Button variant="ghost" className="w-full text-xs text-zinc-500 hover:text-white mt-4 border border-zinc-800 border-dashed">
                            View Full Audit Trail
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default OpsDashboard;
