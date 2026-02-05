import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
    Users,
    Zap,
    TrendingDown,
    MessageSquare,
    Calendar,
    ArrowUpRight,
    Search,
    Filter,
    Mail,
    PhoneCall,
    Target
} from 'lucide-react';

const CrmDashboard = () => {
    const [filter, setFilter] = useState('All');

    const stats = [
        { label: 'Total Guests', value: '12,482', change: '+12%', icon: Users, color: 'text-blue-500' },
        { label: 'Churn Risk', value: '428', change: '-5.2%', icon: TrendingDown, color: 'text-red-500' },
        { label: 'AI Campaigns', value: '24', change: 'Active', icon: MessageSquare, color: 'text-green-500' },
        { label: 'Retention Rate', value: '94.2%', change: '+0.8%', icon: Zap, color: 'text-amber-500' },
    ];

    const customers = [
        { name: 'Marco Rossi', visits: 42, lastVisit: '2 days ago', risk: 'LOW', spend: '€1,240', tags: ['VIP', 'Wine Lover'] },
        { name: 'Sarah Smith', visits: 12, lastVisit: '45 days ago', risk: 'HIGH', spend: '€420', tags: ['Churn Risk', 'Pasta Fan'] },
        { name: 'Lars Olofsson', visits: 8, lastVisit: '12 days ago', risk: 'MEDIUM', spend: '€210', tags: ['Occasional'] },
        { name: 'Elena Petrova', visits: 25, lastVisit: '5 days ago', risk: 'LOW', spend: '€890', tags: ['Regular'] },
        { name: 'John Doe', visits: 3, lastVisit: '62 days ago', risk: 'HIGH', spend: '€65', tags: ['One-timer'] },
    ];

    return (
        <div className="p-6 space-y-6 bg-zinc-950 min-h-screen text-white">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Autopilot CRM</h1>
                    <p className="text-zinc-400">Autonomous retention and growth engine.</p>
                </div>
                <div className="flex gap-3">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Zap className="w-4 h-4 mr-2" />
                        Run "Boomerang" Protocol
                    </Button>
                    <Button variant="outline" className="border-zinc-800 text-zinc-300">
                        <Mail className="w-4 h-4 mr-2" />
                        Campaign Studio
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <Card key={i} className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl group overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                <Badge variant="outline" className="bg-zinc-950 text-xs border-zinc-800 text-zinc-400">{stat.change}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black">{stat.value}</div>
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider mt-1">{stat.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Customer List */}
                <Card className="xl:col-span-2 bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-500" />
                            Guest Profiles
                        </CardTitle>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    className="bg-zinc-800 border-none rounded-lg pl-9 pr-4 py-1.5 text-sm outline-none focus:ring-1 ring-blue-500 w-48"
                                    placeholder="Search guests..."
                                />
                            </div>
                            <Button variant="outline" size="sm" className="border-zinc-800">
                                <Filter className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-zinc-800">
                            {customers.map((c, i) => (
                                <div key={i} className="py-4 flex items-center justify-between group hover:bg-white/[0.02] -mx-6 px-6 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center font-bold text-zinc-400">
                                            {c.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <div className="font-bold flex items-center gap-2">
                                                {c.name}
                                                <Badge className={c.risk === 'HIGH' ? 'bg-red-500/10 text-red-500 border-none' : c.risk === 'LOW' ? 'bg-green-500/10 text-green-500 border-none' : 'bg-amber-500/10 text-amber-500 border-none'}>
                                                    {c.risk} RISK
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-zinc-500 flex items-center gap-3 mt-1">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Last: {c.lastVisit}</span>
                                                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {c.visits} visits</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-white">{c.spend}</div>
                                            <div className="text-[10px] text-zinc-500 uppercase font-black">LTV</div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800">
                                                <MessageSquare className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800">
                                                <ArrowUpRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* AI Insights & Campaigns */}
                <div className="space-y-6">
                    <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-none text-white overflow-hidden relative shadow-xl shadow-blue-900/20">
                        <div className="absolute top-0 right-0 p-8 opacity-20">
                            <Zap className="w-24 h-24 rotate-12" />
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="w-5 h-5" />
                                The Boomerang Protocol
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-blue-100 text-sm leading-relaxed">
                                AI has detected 12 guests who haven't visited in 30 days but have a high LTV. Execute re-engagement now?
                            </p>
                            <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold border-none h-12">
                                Send 12 Personalized Offers
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-500">Active AI Campaigns</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { name: 'Sunset Pasta Special', reach: '1.2k', conv: '4.2%' },
                                { name: 'VIP Wine Night', reach: '240', conv: '12.5%' },
                                { name: 'Weekend Brunch Boost', reach: '800', conv: '3.1%' },
                            ].map((camp, i) => (
                                <div key={i} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold">{camp.name}</div>
                                        <div className="text-[10px] text-zinc-500 uppercase mt-1">Reach: {camp.reach} guests</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-green-500 text-sm font-bold">{camp.conv}</div>
                                        <div className="text-[10px] text-zinc-500 uppercase font-black">Conv.</div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CrmDashboard;
