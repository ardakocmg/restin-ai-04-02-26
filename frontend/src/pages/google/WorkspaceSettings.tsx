/**
 * GoogleIntegrationHub — Centralized Google Services Management
 * @route /manager/google-workspace
 * Wraps Workspace SSO, Business Profile, Maps, and Reviews.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    Shield, Globe, Users, Plus, Trash2, TestTube, CheckCircle2,
    XCircle, Loader2, LinkIcon, AlertTriangle, Settings2, Lock,
    MapPin, Star, Calendar, HardDrive, Building2, ExternalLink,
    BarChart3, RefreshCw, Send, ChevronRight
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../features/auth/AuthContext';
import { logger } from '../../lib/logger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ── Types ────────────────────────────────────────────────────────────────

interface WorkspaceDomain {
    domain: string;
    workspace_customer_id: string;
    admin_email: string;
    service_account_key_ref: string;
    auto_provision: boolean;
    license_pool: string;
    cost_center_tag: string;
    created_at: string;
}

interface SSOConfig {
    sso_enabled: boolean;
    sso_enforce: boolean;
    venue_domains: WorkspaceDomain[];
    allowed_login_domains: string[];
    group_domains: string[];
    group_id?: string;
    is_group_admin?: boolean;
}

interface GoogleSettings {
    enabled: boolean;
    enabled_features: {
        business_profile: boolean;
        reviews: boolean;
        calendar: boolean;
        drive: boolean;
        analytics: boolean;
    };
    connected_at?: string;
}

interface Review {
    id: string;
    author_name: string;
    rating: number;
    text: string;
    published_at: string;
    status: string;
    reply_text?: string;
}

interface CalendarEvent {
    id: string;
    title: string;
    start_time: string;
    event_type: string;
}

interface AnalyticsSnapshot {
    metrics: Record<string, number>;
    captured_at: string;
}


// ── Component ────────────────────────────────────────────────────────────

export default function WorkspaceSettings() {
    const { t } = useTranslation();
    const { user, isOwner } = useAuth();
    const venueId = user?.venueId || '';

    // Config & Settings
    const [config, setConfig] = useState<SSOConfig | null>(null);
    const [googleSettings, setGoogleSettings] = useState<GoogleSettings | null>(null);

    // Data States
    const [reviews, setReviews] = useState<Review[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsSnapshot[]>([]);

    // UI States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingDomain, setTestingDomain] = useState<string | null>(null);
    const [replyDialog, setReplyDialog] = useState<{ open: boolean, review: Review | null, text: string }>({ open: false, review: null, text: '' });

    // Add domain form
    const [showAddDomain, setShowAddDomain] = useState(false);
    const [newDomain, setNewDomain] = useState('');
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newCustomerId, setNewCustomerId] = useState('');

    // ── Load Data ────────────────────────────────────────────────────────

    const loadConfig = useCallback(async () => {
        if (!venueId) return;
        try {
            setLoading(true);
            const promises = [];

            // Only Owners can see/edit Workspace Domain settings
            if (isOwner()) {
                promises.push(api.get(`/workspace/domains?venue_id=${venueId}`).then(res => setConfig(res.data.data)));
            }

            // Managers & Owners can see Google Integration status
            promises.push(api.get(`/google/settings?venue_id=${venueId}`).then(res => setGoogleSettings(res.data.data)));

            await Promise.all(promises);

            // Fetch operational data if connected (Lazy load to speed up initial render)
            // Note: In real app, we might check googleSettings before fetching, but here we optimistically fetch.
            const [reviewsRes, eventsRes, analyticsRes] = await Promise.all([
                api.get(`/google/reviews?venue_id=${venueId}`).catch(() => ({ data: { data: [] } })),
                api.get(`/google/calendar/events?venue_id=${venueId}`).catch(() => ({ data: { data: [] } })),
                api.get(`/google/analytics/snapshot?venue_id=${venueId}`).catch(() => ({ data: { data: [] } }))
            ]);
            setReviews(reviewsRes.data?.data || []);
            setEvents(eventsRes.data?.data || []);
            setAnalytics(analyticsRes.data?.data || []);

        } catch (err) {
            logger.error('Failed to load settings', { error: err });
            // toast.error('Failed to load settings'); // Suppress to avoid spamming on partial loads
        } finally {
            setLoading(false);
        }
    }, [venueId, isOwner]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    // ── Actions ──────────────────────────────────────────────────────────

    const toggleSSO = async (field: 'sso_enabled' | 'sso_enforce', value: boolean) => {
        if (!config) return;
        setSaving(true);
        try {
            await api.patch(`/workspace/sso-config?venue_id=${venueId}`, {
                [field]: value,
            });
            setConfig({ ...config, [field]: value });
            toast.success(`SSO ${field === 'sso_enabled' ? (value ? 'enabled' : 'disabled') : (value ? 'enforced' : 'relaxed')}`);
        } catch (err) {
            logger.error('SSO toggle failed', { error: err });
            toast.error('Failed to update SSO settings');
        } finally {
            setSaving(false);
        }
    };

    const syncToGroup = async () => {
        if (!config?.group_id || !config?.is_group_admin) return;
        if (!confirm("This will overwrite allowed login domains for ALL venues in this group. Continue?")) return;
        setSaving(true);
        try {
            await api.patch(`/workspace/groups/${config.group_id}/domains`, {
                allowed_login_domains: config.allowed_login_domains
            });
            toast.success("Group domains updated successfully");
        } catch (err) {
            toast.error('Failed to sync group domains');
        } finally {
            setSaving(false);
        }
    };

    const handleAddDomain = async () => {
        if (!newDomain.includes('.')) {
            toast.error('Invalid domain format');
            return;
        }
        setSaving(true);
        try {
            await api.post(`/workspace/domains?venue_id=${venueId}`, {
                domain: newDomain.toLowerCase().trim(),
                admin_email: newAdminEmail,
                workspace_customer_id: newCustomerId,
            });
            toast.success(`Domain ${newDomain} added`);
            setNewDomain('');
            setNewAdminEmail('');
            setNewCustomerId('');
            setShowAddDomain(false);
            await loadConfig();
        } catch (err) {
            toast.error('Failed to add domain');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveDomain = async (domain: string) => {
        if (!confirm(`Remove domain ${domain}? This cannot be undone.`)) return;
        try {
            await api.delete(`/workspace/domains/${domain}?venue_id=${venueId}`);
            toast.success(`Domain ${domain} removed`);
            await loadConfig();
        } catch (err) {
            toast.error('Failed to remove domain');
        }
    };

    const handleTestDomain = async (domain: string) => {
        setTestingDomain(domain);
        try {
            const res = await api.post(`/workspace/domains/${domain}/test?venue_id=${venueId}`);
            if (res.data.ok) {
                toast.success(`Connected to ${domain} — ${res.data.test_user_count} users found`);
            } else {
                toast.error(`Connection failed: ${res.data.message}`);
            }
        } catch (err) {
            toast.error('Test failed');
        } finally {
            setTestingDomain(null);
        }
    };

    const handleConnectGoogle = async () => {
        try {
            await api.post(`/google/connect?venue_id=${venueId}`);
            await loadConfig();
            toast.success("Google Account Connected");
        } catch (err) {
            toast.error("Failed to connect Google");
        }
    };

    const handleReply = async () => {
        if (!replyDialog.review || !replyDialog.text.trim()) return;
        try {
            await api.post(`/google/reviews/${replyDialog.review.id}/reply?venue_id=${venueId}&reply_text=${encodeURIComponent(replyDialog.text)}`);
            toast.success('Reply saved');
            setReplyDialog({ open: false, review: null, text: '' });
            // Refresh reviews
            const reviewsRes = await api.get(`/google/reviews?venue_id=${venueId}`);
            setReviews(reviewsRes.data?.data || []);
        } catch (error) {
            toast.error('Failed to save reply');
        }
    };

    // ── Render ───────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                    <Shield className="w-8 h-8 text-blue-500" />
                    Google Integration Hub
                </h1>
                <p className="text-base text-muted-foreground mt-2">
                    {isOwner()
                        ? "Manage Single Sign-On, Domain Verification, and Business Profile."
                        : "Manage Venue Presence, Reviews, and Operational Sync."
                    }
                </p>
            </div>

            <Tabs defaultValue={isOwner() ? "workspace" : "marketing"} className="w-full">
                <TabsList className={`grid w-full ${isOwner() ? "grid-cols-3" : "grid-cols-2"} bg-muted/50 p-1 mb-6`}>
                    {isOwner() && <TabsTrigger value="workspace">Workspace & SSO</TabsTrigger>}
                    <TabsTrigger value="marketing">Marketing & Presence</TabsTrigger>
                    <TabsTrigger value="operations">Operations</TabsTrigger>
                </TabsList>

                {/* ── TAB: WORKSPACE & SSO ──────────────────────────────── */}
                {isOwner() && (
                    <TabsContent value="workspace" className="space-y-6">

                        {/* SSO Status Card */}
                        <div className="rounded-xl border border-border bg-card p-6 space-y-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Lock className="w-5 h-5 text-blue-500" />
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">SSO Configuration</h2>
                                        <p className="text-sm text-muted-foreground">Allow team members to sign in with their Google Workspace accounts</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {config?.sso_enabled ? (
                                        <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                                            <XCircle className="w-3.5 h-3.5" /> Disabled
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4">
                                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Enable Google SSO</p>
                                        <p className="text-xs text-muted-foreground">Team members can sign in with their @domain email</p>
                                    </div>
                                    <Switch
                                        checked={config?.sso_enabled || false}
                                        onCheckedChange={(c) => toggleSSO('sso_enabled', c)}
                                        disabled={saving}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Enforce SSO (Block PIN login for Admin)</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                                            PIN login will only work for POS/KDS devices
                                        </p>
                                    </div>
                                    <Switch
                                        checked={config?.sso_enforce || false}
                                        onCheckedChange={(c) => toggleSSO('sso_enforce', c)}
                                        disabled={saving || !config?.sso_enabled}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Domains Card */}
                        <div className="rounded-xl border border-border bg-card p-6 space-y-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Globe className="w-5 h-5 text-emerald-500" />
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">Workspace Domains</h2>
                                        <p className="text-sm text-muted-foreground">Manage which Google Workspace domains can access this venue</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {config?.is_group_admin && (
                                        <Button variant="link" size="sm" onClick={syncToGroup} className="h-auto p-0 text-muted-foreground hover:text-foreground">
                                            Sync to Group
                                        </Button>
                                    )}
                                    <Button size="sm" onClick={() => setShowAddDomain(true)} className="gap-2">
                                        <Plus className="w-4 h-4" /> Add Domain
                                    </Button>
                                </div>
                            </div>

                            {showAddDomain && (
                                <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <h3 className="text-sm font-semibold text-foreground">Register New Domain</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Domain</label>
                                            <input
                                                type="text"
                                                value={newDomain}
                                                onChange={(e) => setNewDomain(e.target.value)}
                                                placeholder="caviar-bull.com"
                                                className="w-full px-3 py-2 rounded-md bg-background text-foreground border border-input text-sm focus:ring-1 focus:ring-ring"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Admin Email (Delegated)</label>
                                            <input
                                                type="email"
                                                value={newAdminEmail}
                                                onChange={(e) => setNewAdminEmail(e.target.value)}
                                                placeholder="admin@caviar-bull.com"
                                                className="w-full px-3 py-2 rounded-md bg-background text-foreground border border-input text-sm focus:ring-1 focus:ring-ring"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Workspace Customer ID</label>
                                            <input
                                                type="text"
                                                value={newCustomerId}
                                                onChange={(e) => setNewCustomerId(e.target.value)}
                                                placeholder="C0xxxxxxx"
                                                className="w-full px-3 py-2 rounded-md bg-background text-foreground border border-input text-sm focus:ring-1 focus:ring-ring"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="ghost" size="sm" onClick={() => setShowAddDomain(false)}>Cancel</Button>
                                        <Button size="sm" onClick={handleAddDomain} disabled={saving || !newDomain}>
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Domain'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {config?.venue_domains && config.venue_domains.length > 0 ? (
                                    config.venue_domains.map((d) => (
                                        <div key={d.domain} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:border-muted-foreground/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                    <Globe className="w-4 h-4 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{d.domain}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {d.admin_email || 'No admin email'} · {d.license_pool}
                                                        {d.auto_provision && (
                                                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 font-medium">Auto-Provision</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleTestDomain(d.domain)} disabled={testingDomain === d.domain}>
                                                    {testingDomain === d.domain ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                                                </Button>
                                                <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleRemoveDomain(d.domain)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed border-muted rounded-xl">
                                        <Globe className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                                        <p className="text-sm text-foreground">{"No "}domains configured yet</p>
                                    </div>
                                )}
                            </div>

                            {config?.group_domains && config.group_domains.length > 0 && (
                                <div className="border-t border-border pt-4 mt-4">
                                    <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                                        <Building2 className="w-3.5 h-3.5" /> Inherited from Group
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {config.group_domains.map((gd) => (
                                            <span key={gd} className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border flex items-center gap-1.5">
                                                <LinkIcon className="w-3 h-3" /> {gd}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                )}

                {/* ── TAB: MARKETING ────────────────────────────────────── */}
                <TabsContent value="marketing" className="space-y-6">
                    {/* Connection Status */}
                    {!googleSettings?.enabled && (
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6 flex flex-col items-center text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Globe className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">Connect your Business Profile</h2>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                                    Sync your Google Maps listing, manage reviews, and track analytics directly from Restin.
                                </p>
                            </div>
                            <Button onClick={handleConnectGoogle} className="bg-blue-600 hover:bg-blue-700 text-foreground">
                                Connect Google Account
                            </Button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Maps Card */}
                        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <MapPin className="w-5 h-5 text-red-500" />
                                </div>
                                <h3 className="font-semibold text-foreground">Google Maps</h3>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/30 border border-border">
                                <p className="text-sm font-medium text-foreground">Caviar & Bull</p>
                                <p className="text-xs text-muted-foreground mt-1">Corinthia Hotel, St George's Bay</p>
                                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-500">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Location
                                </div>
                            </div>
                            <Button variant="outline" className="w-full">Edit Business Info</Button>
                        </div>

                        {/* Analytics Card */}
                        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <BarChart3 className="w-5 h-5 text-purple-500" />
                                </div>
                                <h3 className="font-semibold text-foreground">Impact</h3>
                            </div>
                            {analytics.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-muted/50 rounded text-center">
                                        <p className="text-xs text-muted-foreground">Views</p>
                                        <p className="text-xl font-bold">{analytics[0].metrics?.views || 1240}</p>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded text-center">
                                        <p className="text-xs text-muted-foreground">Calls</p>
                                        <p className="text-xl font-bold">{analytics[0].metrics?.calls || 42}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">{"No "}data yet</p>
                            )}
                            <Button variant="outline" className="w-full">View Report</Button>
                        </div>
                    </div>

                    {/* Reviews List */}
                    <div className="rounded-xl border border-border bg-card shadow-sm">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <Star className="w-5 h-5 text-amber-500" /> Reviews Inbox
                            </h3>
                            <Badge variant="secondary">{reviews.length} reviews</Badge>
                        </div>
                        <div className="divide-y divide-border">
                            {reviews.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    No reviews synced yet.
                                </div>
                            ) : (
                                reviews.slice(0, 5).map(review => (
                                    <div key={review.id} className="p-6 hover:bg-muted/50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex text-amber-500">
                                                    {[...Array(review.rating)].map((_, i) => (
                                                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                                                    ))}
                                                </div>
                                                <span className="text-sm font-medium">{review.author_name}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">{new Date(review.published_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-foreground/80 mb-3">{review.text}</p>

                                        {review.status === 'REPLIED' && review.reply_text ? (
                                            <div className="ml-4 pl-4 border-l-2 border-primary/30 py-2">
                                                <p className="text-xs text-primary font-medium mb-1">Your Reply</p>
                                                <p className="text-sm text-muted-foreground">{review.reply_text}</p>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setReplyDialog({ open: true, review, text: '' })}
                                            >
                                                <Send className="w-3.5 h-3.5 mr-2" /> Reply
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* ── TAB: OPERATIONS ───────────────────────────────────── */}
                <TabsContent value="operations" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Calendar Sync */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-500/10 rounded-lg">
                                    <Calendar className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Calendar Sync</h3>
                                    <p className="text-xs text-muted-foreground">Sync reservations to Google Calendar</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                                <span className="text-sm font-medium">Auto-Sync</span>
                                <Switch checked={true} />
                            </div>
                            <div className="mt-4 space-y-2">
                                {events.slice(0, 3).map(event => (
                                    <div key={event.id} className="flex justify-between items-center text-xs p-2 rounded bg-muted/50">
                                        <span>{event.title}</span>
                                        <span className="text-muted-foreground">{new Date(event.start_time).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Drive Backup */}
                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <HardDrive className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Drive Backups</h3>
                                    <p className="text-xs text-muted-foreground">{"Save "}daily reports to Google Drive</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                                <span className="text-sm font-medium">Daily PDF Export</span>
                                <Switch checked={false} />
                            </div>
                        </div>
                    </div>
                </TabsContent>

            </Tabs>

            {/* Reply Dialog */}
            <Dialog open={replyDialog.open} onOpenChange={(open) => setReplyDialog({ ...replyDialog, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reply to Review</DialogTitle>
                    </DialogHeader>
                    {replyDialog.review && (
                        <div className="space-y-4">
                            <div className="p-3 bg-muted/50 rounded">
                                <p className="text-sm font-medium">{replyDialog.review.author_name}</p>
                                <p className="text-sm text-muted-foreground">{replyDialog.review.text}</p>
                            </div>
                            <Input
                                placeholder="Write your reply..."
                                value={replyDialog.text}
                                onChange={(e) => setReplyDialog({ ...replyDialog, text: e.target.value })}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReplyDialog({ open: false, review: null, text: '' })}>Cancel</Button>
                        <Button onClick={handleReply} disabled={!replyDialog.text.trim()}>Send Reply</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
