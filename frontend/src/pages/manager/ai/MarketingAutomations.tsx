/**
 * 📧 Marketing Automations Dashboard
 * Campaign management, templates, and analytics.
 * Connected to: /api/marketing/*
 */
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import {
BarChart3,
Bell,
CheckCircle,
Clock,
Eye,
FileText,
Loader2,
Mail,
Megaphone,
MessageSquare,
MousePointer,
Plus,
Send,
Sparkles,
Target,
TrendingUp,
Users,
Zap
} from 'lucide-react';
import { useCallback,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card,CardContent,CardHeader,CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { useAuth } from '../../../context/AuthContext';
import { useVenue } from '../../../context/VenueContext';
import api from '../../../lib/api';
import { cn } from '../../../lib/utils';

// ─── Types ───
interface Campaign {
    id: string;
    name: string;
    type: 'email' | 'sms' | 'push';
    subject: string;
    body: string;
    target_segment: string;
    target_count: number;
    sent_count: number;
    open_rate: number;
    click_rate: number;
    conversion_rate: number;
    status: 'draft' | 'sent' | 'scheduled';
    sent_at?: string;
    created_at: string;
}

interface Template {
    id: string;
    name: string;
    type: string;
    subject: string;
    body: string;
    variables: string[];
}

interface MarketingStats {
    total_campaigns: number;
    sent_campaigns: number;
    draft_campaigns: number;
    total_messages_sent: number;
    avg_open_rate: number;
    avg_click_rate: number;
    avg_conversion_rate: number;
}

// ─── Component ───
export default function MarketingAutomations() {
    const { t } = useTranslation();
    const { activeVenue } = useVenue();
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'analytics'>('campaigns');
    const [showNewCampaign, setShowNewCampaign] = useState(false);
    const [newCampaign, setNewCampaign] = useState({ name: '', type: 'email', subject: '', body: '', target_segment: 'all' });

    const venueId = activeVenue?.id || '';

    const headers = useCallback(() => ({
        Authorization: `Bearer ${token}`,
    }), [token]);

    // ─── Queries ───
    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['marketing-stats', venueId],
        queryFn: async () => {
            const res = await api.get(`/api/marketing/stats?venue_id=${venueId}`, { headers: headers() });
            return res.data?.data as MarketingStats;
        },
        enabled: !!venueId,
    });

    const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
        queryKey: ['marketing-campaigns', venueId],
        queryFn: async () => {
            const res = await api.get(`/api/marketing/campaigns?venue_id=${venueId}`, { headers: headers() });
            return (res.data?.data || []) as Campaign[];
        },
        enabled: !!venueId,
    });

    const { data: templates = [] } = useQuery({
        queryKey: ['marketing-templates', venueId],
        queryFn: async () => {
            const res = await api.get(`/api/marketing/templates?venue_id=${venueId}`, { headers: headers() });
            return (res.data?.data || []) as Template[];
        },
        enabled: !!venueId,
    });

    // ─── Mutations ───
    const createCampaignMut = useMutation({
        mutationFn: async () => {
            return api.post('/api/marketing/campaigns', { ...newCampaign, venue_id: venueId }, { headers: headers() });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['marketing-stats'] });
            setShowNewCampaign(false);
            setNewCampaign({ name: '', type: 'email', subject: '', body: '', target_segment: 'all' });
            toast.success(t('Campaign created'));
        },
    });

    const sendCampaignMut = useMutation({
        mutationFn: async (campaignId: string) => {
            return api.post(`/api/marketing/campaigns/${campaignId}/send`, {}, { headers: headers() });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['marketing-stats'] });
            toast.success(t('Campaign sent successfully'));
        },
        onError: () => toast.error(t('Failed to send campaign')),
    });

    const seedMut = useMutation({
        mutationFn: async () => {
            return api.post(`/api/marketing/seed/${venueId}`, {}, { headers: headers() });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['marketing-templates'] });
            queryClient.invalidateQueries({ queryKey: ['marketing-stats'] });
            toast.success(t('Demo data seeded'));
        },
    });

    const typeIcon = (type: string) => {
        switch (type) {
            case 'email': return <Mail className="w-4 h-4" />;
            case 'sms': return <MessageSquare className="w-4 h-4" />;
            case 'push': return <Bell className="w-4 h-4" />;
            default: return <Mail className="w-4 h-4" />;
        }
    };

    const segmentLabel = (seg: string) => {
        switch (seg) {
            case 'all': return 'All Guests';
            case 'vip': return 'VIP Only';
            case 'at_risk': return 'At Risk';
            case 'new': return 'New Guests';
            default: return seg;
        }
    };

    const stats = statsData;
    const loading = statsLoading || campaignsLoading;

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Megaphone className="w-7 h-7 text-purple-500" />
                        {t('Marketing Automations')}
                    </h1>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                        {t('Create, manage and track marketing campaigns')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
                        {seedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                        {t('Seed Demo')}
                    </Button>
                    <Button size="sm" onClick={() => setShowNewCampaign(true)}>
                        <Plus className="w-4 h-4 mr-1" /> {t('New Campaign')}
                    </Button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> {t('Total Campaigns')}</div>
                    <div className="text-2xl font-bold mt-1">{stats?.total_campaigns ?? '—'}</div>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Send className="w-3 h-3" /> {t('Messages Sent')}</div>
                    <div className="text-2xl font-bold mt-1">{stats?.total_messages_sent?.toLocaleString() ?? '—'}</div>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" /> {t('Avg Open Rate')}</div>
                    <div className="text-2xl font-bold mt-1 text-green-600">{stats?.avg_open_rate ?? 0}%</div>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><MousePointer className="w-3 h-3" /> {t('Avg Conversion')}</div>
                    <div className="text-2xl font-bold mt-1 text-blue-600">{stats?.avg_conversion_rate ?? 0}%</div>
                </CardContent></Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border dark:border-border">
                {(['campaigns', 'templates', 'analytics'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={cn(
                            'px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize',
                            activeTab === tab
                                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                : 'border-transparent text-muted-foreground hover:text-zinc-700 dark:hover:text-secondary-foreground'
                        )}>
                        {t(tab)}
                    </button>
                ))}
            </div>

            {/* New Campaign Form */}
            {showNewCampaign && (
                <Card className="border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20">
                    <CardHeader><CardTitle className="text-sm">{t('Create New Campaign')}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <Input aria-label="Input field" placeholder={t('Campaign name')} value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))} />
                        <div className="flex gap-2">
                            <select title="Campaign type" className="flex-1 rounded-md border px-3 py-2 text-sm bg-white dark:bg-card dark:border-border"
                                value={newCampaign.type} onChange={e => setNewCampaign(p => ({ ...p, type: e.target.value }))}>
                                <option value="email">📧 Email</option>
                                <option value="sms">💬 SMS</option>
                                <option value="push">🔔 Push</option>
                            </select>
                            <select title="Target audience" className="flex-1 rounded-md border px-3 py-2 text-sm bg-white dark:bg-card dark:border-border"
                                value={newCampaign.target_segment} onChange={e => setNewCampaign(p => ({ ...p, target_segment: e.target.value }))}>
                                <option value="all">All Guests</option>
                                <option value="vip">VIP Only</option>
                                <option value="at_risk">At Risk</option>
                                <option value="new">New Guests</option>
                            </select>
                        </div>
                        <Input aria-label="Input field" placeholder={t('Subject line')} value={newCampaign.subject} onChange={e => setNewCampaign(p => ({ ...p, subject: e.target.value }))} />
                        <textarea aria-label="Input" className="w-full rounded-md border px-3 py-2 text-sm min-h-20 bg-white dark:bg-card dark:border-border"
                            placeholder={t('Message body')} value={newCampaign.body} onChange={e => setNewCampaign(p => ({ ...p, body: e.target.value }))} />
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setShowNewCampaign(false)}>{t('Cancel')}</Button>
                            <Button size="sm" onClick={() => createCampaignMut.mutate()} disabled={!newCampaign.name || createCampaignMut.isPending}>
                                {createCampaignMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                                {t('Create')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Campaigns Tab */}
            {activeTab === 'campaigns' && (
                <div className="space-y-3">
                    {loading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
                    {!loading && campaigns.length === 0 && (
                        <Card><CardContent className="py-12 text-center text-muted-foreground">
                            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>{t('No campaigns yet. Click "Seed Demo" to get started.')}</p>
                        </CardContent></Card>
                    )}
                    {campaigns.map(c => (
                        <Card key={c.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            'w-10 h-10 rounded-lg flex items-center justify-center',
                                            c.type === 'email' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                                                c.type === 'sms' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                                                    'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                                        )}>
                                            {typeIcon(c.type)}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-sm">{c.name}</h3>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                <span className="capitalize">{c.type}</span>
                                                <span>•</span>
                                                <Users className="w-3 h-3" />
                                                <span>{segmentLabel(c.target_segment)}</span>
                                                {c.sent_at && <>
                                                    <span>•</span>
                                                    <Clock className="w-3 h-3" />
                                                    <span>{new Date(c.sent_at).toLocaleDateString()}</span>
                                                </>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {c.status === 'sent' && (
                                            <div className="flex gap-4 text-xs">
                                                <div className="text-center">
                                                    <div className="font-semibold text-green-600">{c.open_rate}%</div>
                                                    <div className="text-muted-foreground">{t('Opens')}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-semibold text-blue-600">{c.click_rate}%</div>
                                                    <div className="text-muted-foreground">{t('Clicks')}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-semibold text-purple-600">{c.conversion_rate}%</div>
                                                    <div className="text-muted-foreground">{t('Conv.')}</div>
                                                </div>
                                            </div>
                                        )}
                                        <span className={cn(
                                            'px-2 py-0.5 rounded-full text-xs font-medium',
                                            c.status === 'sent' ? 'bg-green-100 text-green-700 dark:text-green-400 dark:bg-green-900/30 dark:text-green-400' :
                                                c.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                    'bg-zinc-100 text-muted-foreground dark:bg-secondary dark:text-muted-foreground'
                                        )}>
                                            {c.status === 'sent' ? <CheckCircle className="w-3 h-3 inline mr-1" /> : null}
                                            {c.status}
                                        </span>
                                        {c.status === 'draft' && (
                                            <Button size="sm" variant="outline" onClick={() => sendCampaignMut.mutate(c.id)}
                                                disabled={sendCampaignMut.isPending}>
                                                <Send className="w-3 h-3 mr-1" /> {t('Send')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
                <div className="grid md:grid-cols-2 gap-4">
                    {templates.length === 0 && (
                        <Card className="md:col-span-2"><CardContent className="py-12 text-center text-muted-foreground">
                            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>{t('No templates yet. Seed demo data to get started.')}</p>
                        </CardContent></Card>
                    )}
                    {templates.map(tmpl => (
                        <Card key={tmpl.id}>
                            <CardContent className="py-4">
                                <div className="flex items-center gap-2 mb-2">
                                    {typeIcon(tmpl.type)}
                                    <h3 className="font-medium text-sm">{tmpl.name}</h3>
                                    <span className="text-xs px-2 py-0.5 rounded bg-muted dark:bg-secondary capitalize">{tmpl.type}</span>
                                </div>
                                {tmpl.subject && <p className="text-xs text-muted-foreground mb-1"><strong>{t('Subject')}:</strong> {tmpl.subject}</p>}
                                <p className="text-xs text-muted-foreground dark:text-muted-foreground line-clamp-2">{tmpl.body}</p>
                                <div className="flex gap-1 mt-2">
                                    {tmpl.variables.map(v => (
                                        <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                                            {`{{${v}}}`}
                                        </span>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card><CardContent className="pt-4 pb-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground"><BarChart3 className="w-3 h-3" /> {t('Sent Campaigns')}</div>
                            <div className="text-3xl font-bold mt-2">{stats?.sent_campaigns ?? 0}</div>
                            <div className="text-xs text-muted-foreground mt-1">{t('of')} {stats?.total_campaigns ?? 0} {t('total')}</div>
                        </CardContent></Card>
                        <Card><CardContent className="pt-4 pb-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="w-3 h-3" /> {t('Avg Open Rate')}</div>
                            <div className="text-3xl font-bold mt-2 text-green-600">{stats?.avg_open_rate ?? 0}%</div>
                            <div className="text-xs text-muted-foreground mt-1">{t('Across all campaigns')}</div>
                        </CardContent></Card>
                        <Card><CardContent className="pt-4 pb-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Zap className="w-3 h-3" /> {t('Avg Click Rate')}</div>
                            <div className="text-3xl font-bold mt-2 text-blue-600">{stats?.avg_click_rate ?? 0}%</div>
                            <div className="text-xs text-muted-foreground mt-1">{t('Engagement metric')}</div>
                        </CardContent></Card>
                    </div>

                    {/* Campaign Performance Table */}
                    <Card>
                        <CardHeader><CardTitle className="text-sm">{t('Campaign Performance')}</CardTitle></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b dark:border-border">
                                            <th className="text-left py-2 font-medium text-muted-foreground">{t('Campaign')}</th>
                                            <th className="text-center py-2 font-medium text-muted-foreground">{t('Type')}</th>
                                            <th className="text-center py-2 font-medium text-muted-foreground">{t('Sent')}</th>
                                            <th className="text-center py-2 font-medium text-muted-foreground">{t('Open %')}</th>
                                            <th className="text-center py-2 font-medium text-muted-foreground">{t('Click %')}</th>
                                            <th className="text-center py-2 font-medium text-muted-foreground">{t('Conv %')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {campaigns.filter(c => c.status === 'sent').map(c => (
                                            <tr key={c.id} className="border-b dark:border-border hover:bg-zinc-50 dark:hover:bg-card/50">
                                                <td className="py-2 font-medium">{c.name}</td>
                                                <td className="py-2 text-center capitalize">{c.type}</td>
                                                <td className="py-2 text-center">{c.sent_count}</td>
                                                <td className="py-2 text-center text-green-600">{c.open_rate}%</td>
                                                <td className="py-2 text-center text-blue-600">{c.click_rate}%</td>
                                                <td className="py-2 text-center text-purple-600">{c.conversion_rate}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
