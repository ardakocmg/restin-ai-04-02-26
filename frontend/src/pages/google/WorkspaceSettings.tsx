/**
 * WorkspaceSettings — Google Workspace SSO & Domain Management
 * @route /admin/google-workspace
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    Shield, Globe, Users, Plus, Trash2, TestTube, CheckCircle2,
    XCircle, Loader2, LinkIcon, AlertTriangle, Settings2, Lock
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../features/auth/AuthContext';
import { logger } from '../../lib/logger';

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
}

// ── Component ────────────────────────────────────────────────────────────

export default function WorkspaceSettings() {
    const { t } = useTranslation();
    const { user } = useAuth();

    const [config, setConfig] = useState<SSOConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingDomain, setTestingDomain] = useState<string | null>(null);

    // Add domain form
    const [showAddDomain, setShowAddDomain] = useState(false);
    const [newDomain, setNewDomain] = useState('');
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newCustomerId, setNewCustomerId] = useState('');

    const venueId = user?.venueId || '';

    // ── Load Config ──────────────────────────────────────────────────────

    const loadConfig = useCallback(async () => {
        if (!venueId) return;
        try {
            setLoading(true);
            const res = await api.get(`/workspace/domains?venue_id=${venueId}`);
            setConfig(res.data.data);
        } catch (err) {
            logger.error('Failed to load workspace config', { error: err });
            toast.error('Failed to load workspace settings');
        } finally {
            setLoading(false);
        }
    }, [venueId]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    // ── SSO Toggle ───────────────────────────────────────────────────────

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

    // ── Add Domain ───────────────────────────────────────────────────────

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
            logger.error('Add domain failed', { error: err });
            toast.error('Failed to add domain');
        } finally {
            setSaving(false);
        }
    };

    // ── Remove Domain ────────────────────────────────────────────────────

    const handleRemoveDomain = async (domain: string) => {
        if (!confirm(`Remove domain ${domain}? This cannot be undone.`)) return;
        try {
            await api.delete(`/workspace/domains/${domain}?venue_id=${venueId}`);
            toast.success(`Domain ${domain} removed`);
            await loadConfig();
        } catch (err) {
            logger.error('Remove domain failed', { error: err });
            toast.error('Failed to remove domain');
        }
    };

    // ── Test Domain ──────────────────────────────────────────────────────

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
            logger.error('Domain test failed', { error: err });
            toast.error('Test failed');
        } finally {
            setTestingDomain(null);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <Shield className="w-7 h-7 text-blue-400" />
                    Google Workspace & SSO
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage Single Sign-On, domain verification, and user provisioning
                </p>
            </div>

            {/* SSO Status Card */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-blue-400" />
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">SSO Configuration</h2>
                            <p className="text-xs text-muted-foreground">Allow team members to sign in with their Google Workspace accounts</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {config?.sso_enabled ? (
                            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" /> Active
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-500">
                                <XCircle className="w-4 h-4" /> Disabled
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid gap-4">
                    {/* Enable SSO */}
                    <label className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-border cursor-pointer">
                        <div>
                            <p className="text-sm font-medium text-foreground">Enable Google SSO</p>
                            <p className="text-xs text-muted-foreground">Team members can sign in with their @domain email</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={config?.sso_enabled || false}
                            onChange={(e) => toggleSSO('sso_enabled', e.target.checked)}
                            disabled={saving}
                            className="w-5 h-5 accent-blue-500 rounded"
                        />
                    </label>

                    {/* Enforce SSO */}
                    <label className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-border cursor-pointer">
                        <div>
                            <p className="text-sm font-medium text-foreground">Enforce SSO (Block PIN login for Admin)</p>
                            <p className="text-xs text-muted-foreground">
                                <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                                PIN login will only work for POS/KDS devices
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={config?.sso_enforce || false}
                            onChange={(e) => toggleSSO('sso_enforce', e.target.checked)}
                            disabled={saving || !config?.sso_enabled}
                            className="w-5 h-5 accent-amber-500 rounded"
                        />
                    </label>
                </div>
            </div>

            {/* Domains Card */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-emerald-400" />
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Workspace Domains</h2>
                            <p className="text-xs text-muted-foreground">Manage which Google Workspace domains can access this venue</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddDomain(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Domain
                    </button>
                </div>

                {/* Add Domain Form */}
                {showAddDomain && (
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-blue-500/20 space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">Register New Domain</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Domain</label>
                                <input
                                    type="text"
                                    value={newDomain}
                                    onChange={(e) => setNewDomain(e.target.value)}
                                    placeholder="caviar-bull.com"
                                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 text-foreground border border-border text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Admin Email (Delegated Admin)</label>
                                <input
                                    type="email"
                                    value={newAdminEmail}
                                    onChange={(e) => setNewAdminEmail(e.target.value)}
                                    placeholder="admin@caviar-bull.com"
                                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 text-foreground border border-border text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Workspace Customer ID</label>
                                <input
                                    type="text"
                                    value={newCustomerId}
                                    onChange={(e) => setNewCustomerId(e.target.value)}
                                    placeholder="C0xxxxxxx"
                                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 text-foreground border border-border text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowAddDomain(false)}
                                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddDomain}
                                disabled={saving || !newDomain}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Domain'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Domain List */}
                <div className="space-y-3">
                    {config?.venue_domains && config.venue_domains.length > 0 ? (
                        config.venue_domains.map((d) => (
                            <div key={d.domain} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-border">
                                <div className="flex items-center gap-3">
                                    <Globe className="w-4 h-4 text-emerald-400" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{d.domain}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {d.admin_email || 'No admin email'} · {d.license_pool}
                                            {d.auto_provision && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400">
                                                    Auto-Provision
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleTestDomain(d.domain)}
                                        disabled={testingDomain === d.domain}
                                        className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                                        title="Test connectivity"
                                    >
                                        {testingDomain === d.domain ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <TestTube className="w-4 h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleRemoveDomain(d.domain)}
                                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                        title="Remove domain"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No domains configured yet</p>
                            <p className="text-xs mt-1">Add a Google Workspace domain to enable SSO</p>
                        </div>
                    )}
                </div>

                {/* Group-level domains */}
                {config?.group_domains && config.group_domains.length > 0 && (
                    <div className="border-t border-border pt-4">
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                            <LinkIcon className="w-3.5 h-3.5" /> Group-Level Domains (inherited)
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {config.group_domains.map((gd) => (
                                <span key={gd} className="px-3 py-1 rounded-full text-xs bg-zinc-800 text-zinc-400 border border-border">
                                    {gd}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Allowed Login Domains */}
            {config?.allowed_login_domains && config.allowed_login_domains.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <Settings2 className="w-5 h-5 text-zinc-400" />
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Allowed Login Domains</h2>
                            <p className="text-xs text-muted-foreground">Only these email domains can use Google SSO to access this venue</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {config.allowed_login_domains.map((d) => (
                            <span key={d} className="px-3 py-1.5 rounded-full text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                @{d}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* User Provisioning Link */}
            <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-violet-400" />
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">User Provisioning</h2>
                        <p className="text-xs text-muted-foreground">
                            Create, suspend, and manage Google Workspace users directly from the HR module.
                            Go to <strong>HR → Employees</strong> to provision Workspace accounts during onboarding.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
