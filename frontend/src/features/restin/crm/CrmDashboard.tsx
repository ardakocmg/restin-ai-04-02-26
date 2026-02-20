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
    Loader2,
    Settings
} from 'lucide-react';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { crmService } from './crm-service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useVenue } from '../../../context/VenueContext';
import { useAuth } from '../../../context/AuthContext';

// Rule 1: Explicit interfaces, no 'any'
interface GuestProfile {
    id: string;
    name: string;
    visits?: number;
    lastVisit?: string;
    spend?: string;
    lastVisitDays: number;
    visitCount: number;
    ltvCents: number;
    risk: 'HIGH' | 'MEDIUM' | 'LOW';
    tags: string[];
    tasteTags?: string[];
}

interface CrmSummary {
    total_guests: number;
    high_risk_count: number;
    active_campaigns: number;
    retention_rate: number;
    total_ltv_cents: number;
}

interface Campaign {
    id: string;
    name: string;
    reach: number;
    conversion_rate: number;
    type: string;
    status: string;
}

// Rule 7: Zod schema for guest search/input
const GuestFilterSchema = z.object({
    query: z.string().min(0).max(100),
    risk: z.enum(['All', 'HIGH', 'MEDIUM', 'LOW']),
});

const CrmDashboard: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { activeVenueId } = useVenue();
    const { user, isManager, isOwner } = useAuth();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch real data from backend
    const { data: summary } = useQuery<CrmSummary>({
        queryKey: ['crm-summary', activeVenueId],
        queryFn: () => crmService.getSummary(activeVenueId || 'default'),
        enabled: !!activeVenueId,
    });

    const { data: guests = [], isLoading } = useQuery<GuestProfile[]>({
        queryKey: ['crm-guests', activeVenueId],
        queryFn: async () => {
            const res = await crmService.listGuests(activeVenueId || 'default');
            return Array.isArray(res) ? res : [];
        },
        enabled: !!activeVenueId
    });

    const { data: campaigns = [] } = useQuery<Campaign[]>({
        queryKey: ['crm-campaigns', activeVenueId],
        queryFn: () => crmService.listCampaigns(activeVenueId || 'default'),
        enabled: !!activeVenueId,
    });

    // Boomerang Mutation — calls real backend
    const boomerangMutation = useMutation({
        mutationFn: () => crmService.runBoomerang(activeVenueId || 'default'),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['crm-guests'] });
            queryClient.invalidateQueries({ queryKey: ['crm-campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['crm-summary'] });
            toast.success(`Sent ${data.guests_targeted} personalized messages!`, {
                description: `Total cost: €${data.total_cost?.toFixed(4) || '0.00'}`
            });
        },
        onError: () => toast.error('Failed to execute Boomerang protocol.')
    });

    const seedMutation = useMutation({
        mutationFn: () => crmService.seedData(activeVenueId || 'default'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-guests'] });
            queryClient.invalidateQueries({ queryKey: ['crm-campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['crm-summary'] });
            toast.success('CRM demo data seeded!');
        }
    });

    // Use real summary or fallback
    const stats = [
        { label: t('restin.crm.stats.totalGuests'), value: summary?.total_guests?.toLocaleString() || '0', change: '+12%', icon: Users, color: 'text-blue-500' },
        { label: t('restin.crm.stats.churnRisk'), value: summary?.high_risk_count?.toString() || '0', change: '-5.2%', icon: TrendingDown, color: 'text-red-500' },
        { label: t('restin.crm.stats.aiCampaigns'), value: summary?.active_campaigns?.toString() || '0', change: 'Active', icon: MessageSquare, color: 'text-green-500' },
        { label: t('restin.crm.stats.retentionRate'), value: `${summary?.retention_rate || 0}%`, change: '+0.8%', icon: Zap, color: 'text-amber-500' },
    ];

    // Filter guests by search
    const filteredGuests = searchQuery
        ? guests.filter((g: GuestProfile) => g.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        : guests;

    return (
        <div className="p-6 space-y-6 bg-background min-h-screen text-foreground">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">{t('restin.crm.title')}</h1>
                    <p className="text-muted-foreground">{t('restin.crm.subtitle')}</p>
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
                    <Button className="bg-blue-600 hover:bg-blue-700 text-foreground font-bold border-none gap-2">
                        <Zap className="w-4 h-4" />
                        {t('restin.crm.boomerang')}
                    </Button>
                    <Button variant="outline" className="border-border text-secondary-foreground hover:bg-card transition-colors gap-2">
                        <Mail className="w-4 h-4" />
                        {t('restin.crm.campaignStudio')}
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <Card
                        key={i}
                        className="bg-card/50 border-border backdrop-blur-xl group overflow-hidden relative cursor-pointer hover:border-blue-500/50 transition-all"
                        onClick={() => navigate(`/manager/restin/crm/stats/${stat.label.toLowerCase().replace(' ', '-')}`)}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                <Badge variant="outline" className="bg-background text-xs border-border text-muted-foreground">{stat.change}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-foreground">{stat.value}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">{stat.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Customer List */}
                <Card className="xl:col-span-2 bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-foreground text-lg font-bold">
                            <Target className="w-5 h-5 text-blue-500" />
                            {t('restin.crm.guestProfiles', 'Guest Profiles')} ({filteredGuests.length})
                        </CardTitle>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    className="bg-secondary border-none rounded-lg pl-9 pr-4 py-1.5 text-sm text-secondary-foreground outline-none focus:ring-1 ring-blue-500 w-48"
                                    placeholder="Search guests..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                                <Filter className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-border">
                            {isLoading ? (
                                <div className="p-8 text-center">
                                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin mx-auto mb-2" />
                                    <span className="text-muted-foreground text-sm">Loading guests...</span>
                                </div>
                            ) : filteredGuests.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p className="font-bold text-sm">No guests found</p>
                                    <p className="text-xs mt-1">Click "Seed Demo" to populate CRM data</p>
                                </div>
                            ) : filteredGuests.map((c: GuestProfile, i: number) => (
                                <div
                                    key={c.id || i}
                                    className="py-4 flex items-center justify-between group hover:bg-white/[0.02] -mx-6 px-6 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/manager/restin/crm/guests/${c.id}`)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center font-bold text-muted-foreground">
                                            {(c.name || 'Guest').split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                        <div>
                                            <div className="font-bold flex items-center gap-2 text-foreground">
                                                {c.name}
                                                <Badge className={
                                                    c.risk === 'HIGH' ? 'bg-red-500/10 text-red-500 border-none px-2 py-0 h-5 text-[9px] font-black' :
                                                        c.risk === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border-none px-2 py-0 h-5 text-[9px] font-black' :
                                                            'bg-green-500/10 text-green-500 border-none px-2 py-0 h-5 text-[9px] font-black'
                                                }>
                                                    {c.risk || 'LOW'} RISK
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.lastVisitDays}d ago</span>
                                                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {c.visitCount || 0} visits</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-foreground text-md">{c.spend || `€${(c.ltvCents / 100).toFixed(0)}`}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">LTV</div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary">
                                                <MessageSquare className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary">
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
                    <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-none text-foreground overflow-hidden relative shadow-xl shadow-blue-900/40">
                        <div className="absolute top-0 right-0 p-8 opacity-20">
                            <Zap className="w-24 h-24 rotate-12" />
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-foreground font-bold uppercase tracking-widest text-sm">
                                <Zap className="w-4 h-4" />
                                The Boomerang Protocol
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-blue-100 text-sm leading-relaxed mb-4">
                                AI has detected <span className="font-black text-foreground">{summary?.high_risk_count || 0}</span> high-risk guests. Execute personalized re-engagement via Gemini now?
                            </p>
                            <Button
                                onClick={() => boomerangMutation.mutate()}
                                disabled={boomerangMutation.isPending}
                                className="w-full bg-white text-blue-600 hover:bg-blue-50 font-black border-none h-12 text-xs tracking-widest uppercase gap-2"
                            >
                                {boomerangMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating Messages...</>
                                ) : 'Run Boomerang Protocol'}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                {t('restin.crm.activeCampaigns')} ({campaigns.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {campaigns.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">No campaigns yet. Run Boomerang or seed data.</p>
                            ) : campaigns.map((camp, i) => (
                                <div key={camp.id || i} className="p-3 rounded-xl bg-background border border-border flex items-center justify-between group hover:border-border transition-all">
                                    <div>
                                        <div className="text-sm font-bold text-secondary-foreground">{camp.name}</div>
                                        <div className="text-[9px] text-muted-foreground uppercase mt-1 font-bold">
                                            Reach: {camp.reach?.toLocaleString() || 0} guests
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-green-500 text-sm font-black">{camp.conversion_rate || 0}%</div>
                                        <div className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">Conv.</div>
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
