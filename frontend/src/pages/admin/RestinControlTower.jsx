import React, { useState } from 'react';
import {
    Globe, Mic, Wand2, Radar, ShieldCheck,
    TrendingUp, CreditCard, Activity,
    ChevronRight, ArrowUpRight, Zap, Target
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

/**
 * 🛰️ RESTIN.AI CONTROL TOWER (Protocol v18.0)
 * Central Command for the Restaurant AI Operating System.
 */
export default function RestinControlTower() {
    const [activeTab, setActiveTab] = useState('overview');

    const pillars = [
        {
            id: 'web',
            title: 'Web Architect',
            icon: Globe,
            status: 'Live',
            metrics: '2.4k Visits',
            color: 'blue',
            description: 'Synchronized digital storefront with live inventory mapping.'
        },
        {
            id: 'voice',
            title: 'Voice AI',
            icon: Mic,
            status: 'Ready',
            metrics: '14 Calls Today',
            color: 'red',
            description: '24/7 RAG-based receptionist handling guest inquiries.'
        },
        {
            id: 'studio',
            title: 'Generative Studio',
            icon: Wand2,
            status: 'Active',
            metrics: '42 Assets',
            color: 'purple',
            description: 'Reality-first generative content pipeline for menu visuals.'
        },
        {
            id: 'radar',
            title: 'Market Radar',
            icon: Radar,
            status: 'Scanning',
            metrics: '12 Competitors',
            color: 'orange',
            description: 'Real-time competitive intelligence and yield management.'
        },
        {
            id: 'crm',
            title: 'Autopilot CRM',
            icon: Zap,
            status: 'Triggered',
            metrics: '8 Re-engaged',
            color: 'yellow',
            description: 'Autonomous churn detection and boomerang outreach.'
        },
        {
            id: 'fintech',
            title: 'Fintech Hub',
            icon: CreditCard,
            status: 'Stable',
            metrics: '€1.2k Revenue',
            color: 'emerald',
            description: 'Omni-channel settlement and embedded financial logic.'
        }
    ];

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter flex items-center gap-3">
                        <span className="bg-red-600 px-3 py-1 rounded-lg shadow-[0_0_30px_rgba(220,38,38,0.3)]">AI</span>
                        CONTROL TOWER
                    </h1>
                    <p className="text-zinc-500 mt-2 font-medium tracking-wide">
                        v18.0 RESTIN CORE • UNIFIED OPERATING SYSTEM CACHE
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-full border border-zinc-800">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">System Optimal</span>
                    </div>
                    <Button className="bg-white text-black hover:bg-zinc-200 font-bold px-6 rounded-xl border-none shadow-xl">
                        Deploy Updates
                    </Button>
                </div>
            </div>

            {/* Stats Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Token Usage', value: '1.2M', trend: '+12%', icon: Activity },
                    { label: 'Cloud Revenue', value: '€442.50', trend: '+5.4%', icon: TrendingUp },
                    { label: 'Grounding Latency', value: '142ms', trend: 'Stable', icon: Zap },
                    { label: 'Active RAG Docs', value: '14', trend: 'P4, P2', icon: ShieldCheck },
                ].map((stat, i) => (
                    <Card key={i} className="bg-zinc-900/30 border-zinc-800/50 p-6 backdrop-blur-md group hover:border-red-500/30 transition-all duration-300">
                        <div className="flex justify-between items-start">
                            <div className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 group-hover:text-red-500 transition-colors">
                                <stat.icon size={20} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-black px-2 py-1 rounded-full",
                                stat.trend.includes('+') ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-400"
                            )}>
                                {stat.trend}
                            </span>
                        </div>
                        <div className="mt-4">
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-white mt-1">{stat.value}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Main Grid: Pillars */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {pillars.map((pillar) => (
                    <Card
                        key={pillar.id}
                        className="relative overflow-hidden group bg-zinc-900/20 border-zinc-800/50 p-8 backdrop-blur-xl hover:bg-zinc-900/40 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    >
                        {/* Background Glow */}
                        <div className={cn(
                            "absolute -right-20 -top-20 w-40 h-40 blur-[100px] opacity-0 group-hover:opacity-20 transition-opacity duration-700 rounded-full",
                            pillar.color === 'red' ? "bg-red-500" :
                                pillar.color === 'blue' ? "bg-blue-500" :
                                    pillar.color === 'purple' ? "bg-purple-500" :
                                        pillar.color === 'orange' ? "bg-orange-500" :
                                            pillar.color === 'yellow' ? "bg-yellow-500" :
                                                "bg-emerald-500"
                        )}></div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <div className={cn(
                                    "p-4 rounded-2xl transition-all duration-500 shadow-2xl",
                                    pillar.color === 'red' ? "bg-red-500/10 text-red-500" :
                                        pillar.color === 'blue' ? "bg-blue-500/10 text-blue-500" :
                                            pillar.color === 'purple' ? "bg-purple-500/10 text-purple-500" :
                                                pillar.color === 'orange' ? "bg-orange-500/10 text-orange-500" :
                                                    pillar.color === 'yellow' ? "bg-yellow-500/10 text-yellow-500" :
                                                        "bg-emerald-500/10 text-emerald-500"
                                )}>
                                    <pillar.icon size={28} />
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Status</span>
                                    <span className="text-xs font-bold text-white mt-1">{pillar.status}</span>
                                </div>
                            </div>

                            <h3 className="text-2xl font-black text-white tracking-tight leading-none group-hover:text-red-500 transition-colors">
                                {pillar.title}
                            </h3>
                            <p className="text-sm text-zinc-500 mt-4 leading-relaxed font-medium">
                                {pillar.description}
                            </p>

                            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Metric</span>
                                    <span className="text-sm font-bold text-zinc-300">{pillar.metrics}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full bg-zinc-800/10 hover:bg-zinc-800 hover:text-white"
                                >
                                    <ArrowUpRight size={20} />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}

                {/* Intelligence Radar Section (Large) */}
                <Card className="lg:col-span-3 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border-zinc-800/50 p-1 bg-white/5 backdrop-blur-3xl overflow-hidden group">
                    <div className="h-full p-8 flex flex-col lg:flex-row gap-8 items-center bg-zinc-950/90 rounded-[inherit]">
                        <div className="flex-1 space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                                <Target className="h-4 w-4 text-red-500" />
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Deep Intelligence Activated</span>
                            </div>
                            <h2 className="text-5xl font-black text-white italic tracking-tighter leading-none">
                                MARKET <br /> <span className="text-red-600">GROUNDING</span>
                            </h2>
                            <p className="text-lg text-zinc-400 font-medium leading-relaxed max-w-xl">
                                Gemini 1.5 Pro is currently monitoring 14 regional competitors and syncing menu volatility into your pricing engine.
                            </p>
                            <div className="flex gap-4 pt-4">
                                <Button className="h-14 px-8 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-[0_10px_40px_rgba(220,38,38,0.3)] border-none">
                                    View Market Map
                                </Button>
                                <Button variant="outline" className="h-14 px-8 border-zinc-800 text-white font-bold rounded-2xl hover:bg-white/5">
                                    Calibration Settings
                                </Button>
                            </div>
                        </div>

                        <div className="w-full lg:w-[400px] h-[300px] relative">
                            {/* Simulated Radar Visual */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-64 h-64 rounded-full border border-zinc-800 animate-[spin_10s_linear_infinite] relative">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_20px_white]"></div>
                                    <div className="absolute top-1/4 right-0 w-2 h-2 bg-zinc-700 rounded-full"></div>
                                </div>
                                <div className="absolute w-40 h-40 rounded-full border border-zinc-800 shadow-[inset_0_0_50px_rgba(220,38,38,0.05)]"></div>
                                <div className="absolute w-20 h-20 bg-red-600/5 rounded-full flex items-center justify-center backdrop-blur-2xl">
                                    <Radar className="text-red-500 animate-pulse" size={32} />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="pb-12 text-center text-zinc-600 font-bold text-xs tracking-widest uppercase">
                Autonomous Restaurant Operating System • Powered by Restin & Google Vertex AI
            </div>
        </div>
    );
}
