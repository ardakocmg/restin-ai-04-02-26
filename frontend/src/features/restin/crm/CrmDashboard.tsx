import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    Target,
    Settings
} from 'lucide-react';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';

// Rule 1: Explicit interfaces, no 'any'
interface GuestStat {
    label: string;
    value: string;
    change: string;
    icon: React.ElementType;
    color: string;
}

interface GuestProfile {
    name: string;
    visits: number;
    lastVisit: string;
    risk: 'HIGH' | 'MEDIUM' | 'LOW';
    spend: string;
    tags: string[];
}

interface AICampaign {
    name: string;
    reach: string;
    conv: string;
}

// Rule 7: Zod schema for guest search/input
const GuestFilterSchema = z.object({
    query: z.string().min(0).max(100),
    risk: z.enum(['All', 'HIGH', 'MEDIUM', 'LOW']),
});

const CrmDashboard: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [filter, setFilter] = useState<string>('All');

    const stats: GuestStat[] = [
        { label: t('restin.crm.stats.totalGuests'), value: '12,482', change: '+12%', icon: Users, color: 'text-blue-500' },
        { label: t('restin.crm.stats.churnRisk'), value: '428', change: '-5.2%', icon: TrendingDown, color: 'text-red-500' },
        { label: t('restin.crm.stats.aiCampaigns'), value: '24', change: 'Active', icon: MessageSquare, color: 'text-green-500' },
        { label: t('restin.crm.stats.retentionRate'), value: '94.2%', change: '+0.8%', icon: Zap, color: 'text-amber-500' },
    ];

    const customers: GuestProfile[] = [
        { name: 'Marco Rossi', visits: 42, lastVisit: '2 days ago', risk: 'LOW', spend: '€1,240', tags: ['VIP', 'Wine Lover'] },
        { name: 'Sarah Smith', visits: 12, lastVisit: '45 days ago', risk: 'HIGH', spend: '€420', tags: ['Churn Risk', 'Pasta Fan'] },
        { name: 'Lars Olofsson', visits: 8, lastVisit: '12 days ago', risk: 'MEDIUM', spend: '€210', tags: ['Occasional'] },
        { name: 'Elena Petrova', visits: 25, lastVisit: '5 days ago', risk: 'LOW', spend: '€890', tags: ['Regular'] },
        { name: 'John Doe', visits: 3, lastVisit: '62 days ago', risk: 'HIGH', spend: '€65', tags: ['One-timer'] },
    ];

    const activeCampaigns: AICampaign[] = [
        { name: 'Sunset Pasta Special', reach: '1.2k', conv: '4.2%' },
        { name: 'VIP Wine Night', reach: '240', conv: '12.5%' },
        { name: 'Weekend Brunch Boost', reach: '800', conv: '3.1%' },
    ];

    return (
        <div className="p-6 space-y-6 bg-zinc-950 min-h-screen text-white">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">{t('restin.crm.title')}</h1>
                    <p className="text-zinc-400">{t('restin.crm.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold border-none">
                        <Zap className="w-4 h-4 mr-2" />
                        {t('restin.crm.boomerang')}
                    </Button>
                    <Button variant="outline" className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-colors">
                        <Mail className="w-4 h-4 mr-2" />
                        {t('restin.crm.campaignStudio')}
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <Card
                        key={i}
                        className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl group overflow-hidden relative cursor-pointer hover:border-blue-500/50 transition-all"
                        onClick={() => navigate(`/admin/restin/crm/stats/${stat.label.toLowerCase().replace(' ', '-')}`)}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                <Badge variant="outline" className="bg-zinc-950 text-xs border-zinc-800 text-zinc-400">{stat.change}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-white">{stat.value}</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">{stat.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Customer List */}
                <Card className="xl:col-span-2 bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-white text-lg font-bold">
                            <Target className="w-5 h-5 text-blue-500" />
                            {t('restin.crm.guestProfiles', 'Guest Profiles')}
                        </CardTitle>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    className="bg-zinc-800 border-none rounded-lg pl-9 pr-4 py-1.5 text-sm text-zinc-200 outline-none focus:ring-1 ring-blue-500 w-48"
                                    placeholder="Search guests..."
                                />
                            </div>
                            <Button variant="outline" size="sm" className="border-zinc-800 text-zinc-400">
                                <Filter className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-zinc-800">
                            {customers.map((c, i) => (
                                <div
                                    key={i}
                                    className="py-4 flex items-center justify-between group hover:bg-white/[0.02] -mx-6 px-6 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/admin/restin/crm/guests/${c.name.toLowerCase().replace(' ', '-')}`)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center font-bold text-zinc-400">
                                            {c.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <div className="font-bold flex items-center gap-2 text-white">
                                                {c.name}
                                                <Badge className={c.risk === 'HIGH' ? 'bg-red-500/10 text-red-500 border-none px-2 py-0 h-5 text-[9px] font-black' : c.risk === 'LOW' ? 'bg-green-500/10 text-green-500 border-none px-2 py-0 h-5 text-[9px] font-black' : 'bg-amber-500/10 text-amber-500 border-none px-2 py-0 h-5 text-[9px] font-black'}>
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
                                            <div className="font-mono font-bold text-white text-md">{c.spend}</div>
                                            <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">LTV</div>
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
                    <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-none text-white overflow-hidden relative shadow-xl shadow-blue-900/40">
                        <div className="absolute top-0 right-0 p-8 opacity-20">
                            <Zap className="w-24 h-24 rotate-12" />
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-sm">
                                <Zap className="w-4 h-4" />
                                The Boomerang Protocol
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-blue-100 text-sm leading-relaxed mb-4">
                                AI has detected 12 guests who haven't visited in 30 days but have a high LTV. Execute re-engagement now?
                            </p>
                            <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 font-black border-none h-12 text-xs tracking-widest uppercase">
                                Send 12 Personalized Offers
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t('restin.crm.activeCampaigns')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {activeCampaigns.map((camp, i) => (
                                <div key={i} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between group hover:border-zinc-700 transition-all">
                                    <div>
                                        <div className="text-sm font-bold text-zinc-200">{camp.name}</div>
                                        <div className="text-[9px] text-zinc-500 uppercase mt-1 font-bold">Reach: {camp.reach} guests</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-green-500 text-sm font-black">{camp.conv}</div>
                                        <div className="text-[9px] text-zinc-500 uppercase font-black tracking-tighter">Conv.</div>
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
