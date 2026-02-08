'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import {
    Activity, Truck, Clock, AlertCircle, CheckCircle2,
    Layers, ArrowUpRight, RefreshCcw
} from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * 🚚 OPS & AGGREGATORS (Pillar 7)
 * Delivery Integration & Operational Hub.
 */

interface Aggregator {
    name: string;
    status: string;
    orders: number;
    revenue: string;
    color: string;
}

interface OpsLog {
    time: string;
    type: 'order' | 'alert' | 'success';
    msg: string;
}

export default function OpsPage() {
    const router = useRouter();

    const aggregators: Aggregator[] = [
        { name: 'Wolt', status: 'Live', orders: 12, revenue: '€842', color: 'bg-blue-500' },
        { name: 'Bolt Food', status: 'Live', orders: 8, revenue: '€520', color: 'bg-green-500' },
        { name: 'UberEats', status: 'Paused', orders: 0, revenue: '€0', color: 'bg-zinc-600' },
    ];

    const logs: OpsLog[] = [
        { time: '14:42', type: 'order', msg: 'New Wolt order #W8821 received → KDS injected' },
        { time: '14:38', type: 'success', msg: 'Bolt delivery #BF442 marked complete' },
        { time: '14:35', type: 'alert', msg: 'High order volume detected (+40% vs avg)' },
        { time: '14:30', type: 'order', msg: 'New Wolt order #W8820 received → KDS injected' },
    ];

    const metrics = [
        { label: 'Labor Cost %', value: '28.4%', target: '<30%', icon: Clock, status: 'On Track' },
        { label: 'Active Couriers', value: '24', target: '20+', icon: Truck, status: 'Good' },
        { label: 'Delivery TAT', value: '18m', target: '<20m', icon: Activity, status: 'Excellent' },
    ];

    return (
        <div className="flex flex-col gap-8 animate-in fade-in zoom-in duration-700">
            {/* Ops Header */}
            <div className="flex justify-between items-center px-1">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Ops <br /> Hub</h1>
                    <p className="text-zinc-500 mt-2 font-medium">Aggregator Integration & Labor Metrics</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-colors">
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Sync All
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white font-bold border-none">
                        <Layers className="w-4 h-4 mr-2" />
                        Dispatch Engine
                    </Button>
                </div>
            </div>

            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((m, i) => (
                    <Card
                        key={i}
                        className="bg-zinc-900 border-zinc-800 overflow-hidden relative group cursor-pointer hover:border-red-500/50 transition-all"
                    >
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                                <div className="p-2 bg-zinc-800 rounded-lg">
                                    <m.icon className="w-4 h-4 text-red-500" />
                                </div>
                                <Badge className="bg-green-500/10 text-green-500 border-none text-[10px] font-black">{m.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black mb-1 text-white">{m.value}</div>
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">{m.label}</span>
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
                        <CardTitle className="flex items-center gap-2 text-white text-lg font-bold">
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
                                            <span className="font-bold text-lg text-white">{agg.name}</span>
                                        </div>
                                        <Badge variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity uppercase text-[10px] border-zinc-800 text-zinc-500 italic">Settings</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-zinc-900 rounded-lg">
                                            <div className="text-[10px] text-zinc-500 uppercase font-black mb-1 tracking-widest">Live Orders</div>
                                            <div className="text-xl font-black text-white">{agg.orders}</div>
                                        </div>
                                        <div className="p-3 bg-zinc-900 rounded-lg">
                                            <div className="text-[10px] text-zinc-500 uppercase font-black mb-1 tracking-widest">Today's Rev.</div>
                                            <div className="text-xl font-black text-white">{agg.revenue}</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <Button className="flex-1 bg-zinc-800 hover:bg-zinc-700 h-8 text-[10px] font-black tracking-widest uppercase border-none text-zinc-300">
                                            {agg.status === 'Live' ? 'Pause Stream' : 'Resume Stream'}
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white">
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
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 italic">Live Feed</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-3 items-start group">
                                <span className="text-[10px] font-mono text-zinc-600 mt-1">{log.time}</span>
                                <div className="flex-1 text-xs text-zinc-400 leading-tight group-hover:text-zinc-200 transition-colors">
                                    {log.msg}
                                </div>
                                {log.type === 'alert' && <AlertCircle className="w-3 h-3 text-red-500" />}
                                {log.type === 'success' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                            </div>
                        ))}
                        <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white mt-4 border border-zinc-800 border-dashed hover:bg-zinc-800 h-10 transition-all">
                            View Full Audit Trail
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
