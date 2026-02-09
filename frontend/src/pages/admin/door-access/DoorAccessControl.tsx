/**
 * 🔐 Door Access Control — Nuki Smart Lock Admin Panel
 *
 * Server-authoritative: all decisions are backend-only.
 * This component is UI-only — no business logic.
 *
 * Tabs:
 *  1. Connection Setup    — OAuth2 or API token onboarding
 *  2. Door Management     — List doors, rename, battery/status
 *  3. Quick Actions       — Unlock/Lock/Unlatch per door
 *  4. Permissions         — Role × Door matrix
 *  5. Audit Trail         — Immutable access history
 *  6. Bridge              — Health indicator, LAN/WEB routing
 *  7. Reporting           — Analytics, heatmap, timeline
 *  8. Keypad PINs         — Time-limited PIN lifecycle
 */
import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Lock, Unlock, DoorOpen, Shield, ShieldCheck, ShieldAlert,
    Wifi, WifiOff, Battery, BatteryWarning, RefreshCw, Pencil,
    Check, X, Clock, Eye, Plus, Trash2, Key, Settings,
    Globe, Router, Activity, AlertTriangle, BarChart3, Keyboard,
    TrendingUp, Users, Zap, Hash, Timer, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';



interface Door {
    id: string;
    venue_id: string;
    nuki_smartlock_id: number;
    display_name: string;
    device_type: string;
    battery_charge?: number;
    battery_critical: boolean;
    lock_state: string;
    last_synced_at?: string;
}

interface Permission {
    id: string;
    door_id: string;
    role_id?: string;
    user_id?: string;
    can_unlock: boolean;
    can_lock: boolean;
    can_unlatch: boolean;
}

interface AuditEntry {
    id: string;
    user_name: string;
    door_display_name: string;
    action: string;
    result: string;
    provider_path: string;
    timestamp: string;
    error_message?: string;
    duration_ms?: number;
}

interface ConnectionStatus {
    connected: boolean;
    mode?: string;
    status?: string;
    connected_at?: string;
}

interface BridgeHealth {
    configured: boolean;
    is_healthy: boolean;
    ip_address?: string;
    port?: number;
}

interface AccessSummary {
    total_actions: number;
    success_count: number;
    failure_count: number;
    unauthorized_count: number;
    success_rate: number;
    busiest_door: { name: string; count: number } | null;
    most_active_user: { name: string; count: number } | null;
    avg_response_ms: number;
    bridge_usage_pct: number;
    period_days: number;
}

interface TimelineEntry {
    id: string;
    timestamp: string;
    description: string;
    severity: string;
    action: string;
    result: string;
    user_name: string;
    door_name: string;
    provider_path: string;
    duration_ms?: number;
    error_message?: string;
}

interface HeatmapEntry {
    date: string;
    hour: number;
    count: number;
    unlock: number;
    lock: number;
    unlatch: number;
}

interface KeypadPin {
    id: string;
    venue_id: string;
    door_id: string;
    door_display_name: string;
    name: string;
    code_hint: string;
    valid_from?: string;
    valid_until?: string;
    status: string;
    created_at: string;
    created_by: string;
    revoked_at?: string;
}

function getVenueId(): string {
    return localStorage.getItem('selectedVenueId') || 'venue-caviar-bull';
}

// ==================== CONNECTION TAB ====================

function ConnectionTab() {
    const [status, setStatus] = useState<ConnectionStatus>({ connected: false });
    const [apiToken, setApiToken] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => { checkStatus(); }, []);

    const checkStatus = async () => {
        try {
            const resp = await api.get(`/access-control/connection/status?venue_id=${getVenueId()}`);
            if (resp.status === 200) setStatus(resp.data);
        } catch (e) {
            logger.error('Connection check failed', { error: String(e) });
        }
    };

    const connectToken = async () => {
        if (!apiToken || apiToken.length < 10) {
            toast.error('Please enter a valid Nuki API token');
            return;
        }
        setLoading(true);
        try {
            const resp = await api.post(`/access-control/connect/token?venue_id=${getVenueId()}`, {
                api_token: apiToken
            });
            if (resp.status === 200 || resp.status === 201) {
                toast.success('Nuki connected successfully!');
                setApiToken('');
                checkStatus();
            } else {
                toast.error('Connection failed');
            }
        } catch (e) {
            toast.error('Connection error');
            logger.error('Token connect failed', { error: String(e) });
        } finally {
            setLoading(false);
        }
    };

    const startOAuth = async () => {
        try {
            const resp = await api.post(`/access-control/connect/oauth?venue_id=${getVenueId()}`);
            if (resp.status === 200) {
                window.location.href = resp.data.redirect_url;
            } else {
                toast.error('OAuth2 not configured on server');
            }
        } catch (e) {
            toast.error('OAuth2 start failed');
            logger.error('OAuth start failed', { error: String(e) });
        }
    };

    return (
        <div className="space-y-6">
            {/* Current Status */}
            <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-zinc-100">
                        <Wifi className="h-5 w-5 text-emerald-400" />
                        Connection Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className={`h-3 w-3 rounded-full ${status.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-zinc-200 font-medium">
                            {status.connected ? `Connected via ${status.mode}` : 'Not Connected'}
                        </span>
                        {status.connected_at && (
                            <span className="text-xs text-zinc-500">
                                Since {new Date(status.connected_at).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Onboarding Options */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* API Token (Fast) */}
                <Card className="bg-zinc-950 border-zinc-800 hover:border-emerald-900/50 transition-colors">
                    <CardHeader>
                        <CardTitle className="text-zinc-100 flex items-center gap-2">
                            <Key className="h-5 w-5 text-amber-400" />
                            API Token
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Quick setup — enter your Nuki API token once. Stored encrypted, never shown again.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input
                            type="password"
                            placeholder="Paste your Nuki API token..."
                            value={apiToken}
                            onChange={(e) => setApiToken(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-zinc-200"
                        />
                        <Button
                            onClick={connectToken}
                            disabled={loading || !apiToken}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                            Connect with Token
                        </Button>
                    </CardContent>
                </Card>

                {/* OAuth2 (Enterprise) */}
                <Card className="bg-zinc-950 border-zinc-800 hover:border-blue-900/50 transition-colors">
                    <CardHeader>
                        <CardTitle className="text-zinc-100 flex items-center gap-2">
                            <Shield className="h-5 w-5 text-blue-400" />
                            OAuth2 (Enterprise)
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Recommended. Secure OAuth2 flow with automatic token refresh. Requires Nuki Advanced API.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={startOAuth}
                            variant="outline"
                            className="w-full border-blue-800 text-blue-400 hover:bg-blue-950"
                        >
                            <Globe className="h-4 w-4 mr-2" />
                            Connect with OAuth2
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ==================== DOORS TAB ====================

function DoorsTab() {
    const [doors, setDoors] = useState<Door[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => { loadDoors(); }, []);

    const loadDoors = async () => {
        setLoading(true);
        try {
            const resp = await api.get(`/access-control/doors?venue_id=${getVenueId()}`);
            if (resp.status === 200) setDoors(resp.data);
        } catch (e) {
            logger.error('Load doors failed', { error: String(e) });
        } finally {
            setLoading(false);
        }
    };

    const syncDevices = async () => {
        setSyncing(true);
        try {
            const resp = await api.post(`/access-control/doors/sync?venue_id=${getVenueId()}`);
            if (resp.status === 200) {
                const data = resp.data;
                toast.success(`Synced: ${data.discovered} devices (${data.new} new, ${data.updated} updated)`);
                loadDoors();
            } else {
                toast.error(resp.data.detail || 'Sync failed');
            }
        } catch (e) {
            toast.error('Device sync failed');
            logger.error('Sync failed', { error: String(e) });
        } finally {
            setSyncing(false);
        }
    };

    const renameDoor = async (doorId: string) => {
        if (!editName.trim()) return;
        try {
            const resp = await api.post(`/access-control/doors/${doorId}/rename?venue_id=${getVenueId()}`, {
                new_name: editName
            });
            if (resp.status === 200) {
                toast.success('Door renamed');
                setEditingId(null);
                loadDoors();
            }
        } catch (e) {
            toast.error('Rename failed');
            logger.error('Rename failed', { error: String(e) });
        }
    };

    const executeAction = async (doorId: string, action: string) => {
        const key = `${doorId}-${action}`;
        setActionLoading(key);
        try {
            const userId = localStorage.getItem('userId') || 'admin';
            const resp = await api.post(
                `/access-control/doors/${doorId}/${action.toLowerCase()}?venue_id=${getVenueId()}&user_id=${userId}`
            );
            if (resp.status === 200) {
                toast.success(`${action} successful via ${resp.data.provider_path} (${resp.data.duration_ms}ms)`);
                loadDoors();
            } else {
                toast.error(resp.data.detail || `${action} failed`);
            }
        } catch (e) {
            toast.error(`${action} failed`);
            logger.error('Action failed', { error: String(e) });
        } finally {
            setActionLoading(null);
        }
    };

    const lockStateColors: Record<string, string> = {
        LOCKED: 'bg-emerald-500/10 text-emerald-400 border-emerald-800',
        UNLOCKED: 'bg-amber-500/10 text-amber-400 border-amber-800',
        UNLATCHED: 'bg-blue-500/10 text-blue-400 border-blue-800',
        UNKNOWN: 'bg-zinc-700/30 text-zinc-400 border-zinc-700',
    };

    const lockStateIcons: Record<string, React.ReactNode> = {
        LOCKED: <Lock className="h-4 w-4" />,
        UNLOCKED: <Unlock className="h-4 w-4" />,
        UNLATCHED: <DoorOpen className="h-4 w-4" />,
        UNKNOWN: <AlertTriangle className="h-4 w-4" />,
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-zinc-100">Registered Doors</h3>
                <Button onClick={syncDevices} disabled={syncing} variant="outline" className="border-zinc-700 text-zinc-300">
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Discovering...' : 'Sync Devices'}
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-zinc-600" />
                </div>
            ) : doors.length === 0 ? (
                <Card className="bg-zinc-950 border-zinc-800 p-8 text-center">
                    <DoorOpen className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
                    <p className="text-zinc-400">No doors registered. Click "Sync Devices" to discover your Nuki locks.</p>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence>
                        {doors.map((door) => (
                            <motion.div
                                key={door.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card className="bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-colors overflow-hidden">
                                    {/* Status Bar */}
                                    <div className={`h-1 ${door.lock_state === 'LOCKED' ? 'bg-emerald-500' : door.lock_state === 'UNLOCKED' ? 'bg-amber-500' : 'bg-blue-500'}`} />

                                    <CardContent className="p-4 space-y-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                {editingId === door.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className="bg-zinc-900 border-zinc-700 text-zinc-200 h-8 text-sm"
                                                            autoFocus
                                                            onKeyDown={(e) => e.key === 'Enter' && renameDoor(door.id)}
                                                        />
                                                        <Button size="sm" variant="ghost" onClick={() => renameDoor(door.id)} className="text-emerald-400 h-8 w-8 p-0">
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-zinc-400 h-8 w-8 p-0">
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold text-zinc-100">{door.display_name}</h4>
                                                        <Button
                                                            size="sm" variant="ghost"
                                                            className="text-zinc-500 hover:text-zinc-300 h-6 w-6 p-0"
                                                            onClick={() => { setEditingId(door.id); setEditName(door.display_name); }}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                                <p className="text-xs text-zinc-500 mt-1">{door.device_type.replace(/_/g, ' ')}</p>
                                            </div>
                                            <Badge variant="outline" className={lockStateColors[door.lock_state] || lockStateColors.UNKNOWN}>
                                                {lockStateIcons[door.lock_state]}
                                                <span className="ml-1">{door.lock_state}</span>
                                            </Badge>
                                        </div>

                                        {/* Battery */}
                                        <div className="flex items-center gap-2">
                                            {door.battery_critical ? (
                                                <BatteryWarning className="h-4 w-4 text-red-400" />
                                            ) : (
                                                <Battery className="h-4 w-4 text-emerald-400" />
                                            )}
                                            <span className={`text-xs ${door.battery_critical ? 'text-red-400' : 'text-zinc-400'}`}>
                                                {door.battery_charge != null ? `${door.battery_charge}%` : 'N/A'}
                                            </span>
                                            {door.last_synced_at && (
                                                <span className="text-xs text-zinc-600 ml-auto">
                                                    <Clock className="h-3 w-3 inline mr-1" />
                                                    {new Date(door.last_synced_at).toLocaleTimeString()}
                                                </span>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <Button
                                                size="sm"
                                                className="bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 border border-emerald-900"
                                                onClick={() => executeAction(door.id, 'UNLOCK')}
                                                disabled={actionLoading === `${door.id}-UNLOCK`}
                                            >
                                                {actionLoading === `${door.id}-UNLOCK` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3 mr-1" />}
                                                Unlock
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-red-900/30 hover:bg-red-800/50 text-red-300 border border-red-900"
                                                onClick={() => executeAction(door.id, 'LOCK')}
                                                disabled={actionLoading === `${door.id}-LOCK`}
                                            >
                                                {actionLoading === `${door.id}-LOCK` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3 mr-1" />}
                                                Lock
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-blue-900/30 hover:bg-blue-800/50 text-blue-300 border border-blue-900"
                                                onClick={() => executeAction(door.id, 'UNLATCH')}
                                                disabled={actionLoading === `${door.id}-UNLATCH`}
                                            >
                                                {actionLoading === `${door.id}-UNLATCH` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <DoorOpen className="h-3 w-3 mr-1" />}
                                                Unlatch
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

// ==================== PERMISSIONS TAB ====================

function PermissionsTab() {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [doors, setDoors] = useState<Door[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPerm, setNewPerm] = useState({ door_id: '', role_id: '', can_unlock: true, can_lock: true, can_unlatch: false });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [permResp, doorResp] = await Promise.all([
                api.get(`/access-control/permissions?venue_id=${getVenueId()}`),
                api.get(`/access-control/doors?venue_id=${getVenueId()}`),
            ]);
            if (permResp.status === 200) setPermissions(permResp.data);
            if (doorResp.status === 200) setDoors(doorResp.data);
        } catch (e) {
            logger.error('Load permissions failed', { error: String(e) });
        } finally {
            setLoading(false);
        }
    };

    const createPermission = async () => {
        if (!newPerm.door_id || !newPerm.role_id) {
            toast.error('Select a door and role');
            return;
        }
        try {
            const resp = await api.post(`/access-control/permissions?venue_id=${getVenueId()}`, newPerm);
            if (resp.status === 200) {
                toast.success('Permission created');
                loadData();
                setNewPerm({ door_id: '', role_id: '', can_unlock: true, can_lock: true, can_unlatch: false });
            }
        } catch (e) {
            toast.error('Create failed');
            logger.error('Create perm failed', { error: String(e) });
        }
    };

    const deletePermission = async (permId: string) => {
        try {
            const resp = await api.delete(`/access-control/permissions/${permId}?venue_id=${getVenueId()}`);
            if (resp.status === 200) {
                toast.success('Permission revoked');
                loadData();
            }
        } catch (e) {
            toast.error('Revoke failed');
            logger.error('Delete perm failed', { error: String(e) });
        }
    };

    const roles = ['manager', 'chef', 'waiter', 'bartender', 'host', 'cleaner', 'admin'];

    const getDoorName = (doorId: string) => doors.find(d => d.id === doorId)?.display_name || doorId;

    return (
        <div className="space-y-6">
            {/* Create Permission */}
            <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-zinc-100 flex items-center gap-2">
                        <Plus className="h-5 w-5 text-emerald-400" />
                        Add Permission
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-6 gap-3 items-end">
                        <div className="col-span-2">
                            <label className="text-xs text-zinc-400 mb-1 block">Door</label>
                            <select
                                title="Select door"
                                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded px-3 py-2 text-sm"
                                value={newPerm.door_id}
                                onChange={(e) => setNewPerm({ ...newPerm, door_id: e.target.value })}
                            >
                                <option value="">Select door...</option>
                                {doors.map(d => <option key={d.id} value={d.id}>{d.display_name}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-zinc-400 mb-1 block">Role</label>
                            <select
                                title="Select role"
                                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded px-3 py-2 text-sm"
                                value={newPerm.role_id}
                                onChange={(e) => setNewPerm({ ...newPerm, role_id: e.target.value })}
                            >
                                <option value="">Select role...</option>
                                {roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-3 items-center col-span-1">
                            <label className="flex items-center gap-1 text-xs text-zinc-400">
                                <input type="checkbox" checked={newPerm.can_unlock} onChange={(e) => setNewPerm({ ...newPerm, can_unlock: e.target.checked })} className="accent-emerald-500" />
                                Unlock
                            </label>
                            <label className="flex items-center gap-1 text-xs text-zinc-400">
                                <input type="checkbox" checked={newPerm.can_lock} onChange={(e) => setNewPerm({ ...newPerm, can_lock: e.target.checked })} className="accent-red-500" />
                                Lock
                            </label>
                            <label className="flex items-center gap-1 text-xs text-zinc-400">
                                <input type="checkbox" checked={newPerm.can_unlatch} onChange={(e) => setNewPerm({ ...newPerm, can_unlatch: e.target.checked })} className="accent-blue-500" />
                                Unlatch
                            </label>
                        </div>
                        <Button onClick={createPermission} className="bg-emerald-600 text-white hover:bg-emerald-700">
                            <Plus className="h-4 w-4 mr-1" /> Grant
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Permission List */}
            <Card className="bg-zinc-950 border-zinc-800">
                <CardContent className="p-0">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-zinc-800">
                                <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Door</th>
                                <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Role / User</th>
                                <th className="text-center p-3 text-xs font-medium text-zinc-500 uppercase">Unlock</th>
                                <th className="text-center p-3 text-xs font-medium text-zinc-500 uppercase">Lock</th>
                                <th className="text-center p-3 text-xs font-medium text-zinc-500 uppercase">Unlatch</th>
                                <th className="text-right p-3 text-xs font-medium text-zinc-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {permissions.map(p => (
                                <tr key={p.id} className="border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors">
                                    <td className="p-3 text-sm text-zinc-200">{getDoorName(p.door_id)}</td>
                                    <td className="p-3">
                                        <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                                            {p.role_id || p.user_id || '—'}
                                        </Badge>
                                    </td>
                                    <td className="p-3 text-center">{p.can_unlock ? <ShieldCheck className="h-4 w-4 text-emerald-400 mx-auto" /> : <ShieldAlert className="h-4 w-4 text-zinc-700 mx-auto" />}</td>
                                    <td className="p-3 text-center">{p.can_lock ? <ShieldCheck className="h-4 w-4 text-emerald-400 mx-auto" /> : <ShieldAlert className="h-4 w-4 text-zinc-700 mx-auto" />}</td>
                                    <td className="p-3 text-center">{p.can_unlatch ? <ShieldCheck className="h-4 w-4 text-emerald-400 mx-auto" /> : <ShieldAlert className="h-4 w-4 text-zinc-700 mx-auto" />}</td>
                                    <td className="p-3 text-right">
                                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-950" onClick={() => deletePermission(p.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {permissions.length === 0 && (
                                <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No permissions configured. Grant access above.</td></tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}

// ==================== AUDIT TAB ====================

function AuditTab() {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadAudit(); }, []);

    const loadAudit = async () => {
        setLoading(true);
        try {
            const resp = await api.get(`/access-control/audit-logs?venue_id=${getVenueId()}&limit=200`);
            if (resp.status === 200) setEntries(resp.data);
        } catch (e) {
            logger.error('Audit load failed', { error: String(e) });
        } finally {
            setLoading(false);
        }
    };

    const resultColors: Record<string, string> = {
        SUCCESS: 'bg-emerald-500/10 text-emerald-400 border-emerald-800',
        FAILURE: 'bg-red-500/10 text-red-400 border-red-800',
        UNAUTHORIZED: 'bg-orange-500/10 text-orange-400 border-orange-800',
        TIMEOUT: 'bg-yellow-500/10 text-yellow-400 border-yellow-800',
        PROVIDER_UNAVAILABLE: 'bg-zinc-700/30 text-zinc-400 border-zinc-700',
    };

    const actionIcons: Record<string, React.ReactNode> = {
        UNLOCK: <Unlock className="h-3.5 w-3.5 text-emerald-400" />,
        LOCK: <Lock className="h-3.5 w-3.5 text-red-400" />,
        UNLATCH: <DoorOpen className="h-3.5 w-3.5 text-blue-400" />,
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-zinc-100">Access Audit Trail</h3>
                <Button onClick={loadAudit} variant="outline" className="border-zinc-700 text-zinc-300" size="sm">
                    <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                </Button>
            </div>

            <Card className="bg-zinc-950 border-zinc-800">
                <CardContent className="p-0">
                    <div className="max-h-[600px] overflow-auto">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-zinc-950 z-10">
                                <tr className="border-b border-zinc-800">
                                    <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Time</th>
                                    <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">User</th>
                                    <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Door</th>
                                    <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Action</th>
                                    <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Result</th>
                                    <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Path</th>
                                    <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Speed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(entry => (
                                    <tr key={entry.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                                        <td className="p-3 text-xs text-zinc-400 whitespace-nowrap">
                                            {new Date(entry.timestamp).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}
                                        </td>
                                        <td className="p-3 text-sm text-zinc-200">{entry.user_name}</td>
                                        <td className="p-3 text-sm text-zinc-300">{entry.door_display_name}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-1.5">
                                                {actionIcons[entry.action]}
                                                <span className="text-xs text-zinc-300">{entry.action}</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <Badge variant="outline" className={`text-[10px] ${resultColors[entry.result] || resultColors.FAILURE}`}>
                                                {entry.result}
                                            </Badge>
                                        </td>
                                        <td className="p-3">
                                            <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                                                {entry.provider_path === 'BRIDGE' ? <Router className="h-3 w-3 mr-1" /> : <Globe className="h-3 w-3 mr-1" />}
                                                {entry.provider_path}
                                            </Badge>
                                        </td>
                                        <td className="p-3 text-xs text-zinc-500">{entry.duration_ms ? `${entry.duration_ms}ms` : '—'}</td>
                                    </tr>
                                ))}
                                {entries.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-zinc-500">No audit entries yet. Actions will appear here automatically.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ==================== BRIDGE TAB ====================

function BridgeTab() {
    const [health, setHealth] = useState<BridgeHealth>({ configured: false, is_healthy: false });
    const [bridgeIp, setBridgeIp] = useState('');
    const [bridgePort, setBridgePort] = useState('8080');
    const [bridgeToken, setBridgeToken] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => { checkHealth(); }, []);

    const checkHealth = async () => {
        try {
            const resp = await api.get(`/access-control/bridge/health?venue_id=${getVenueId()}`);
            if (resp.status === 200) setHealth(resp.data);
        } catch (e) {
            logger.error('Bridge health check failed', { error: String(e) });
        }
    };

    const configureBridge = async () => {
        if (!bridgeIp) { toast.error('Enter bridge IP'); return; }
        setLoading(true);
        try {
            const resp = await api.post(`/access-control/bridge/configure?venue_id=${getVenueId()}`, {
                ip_address: bridgeIp, port: parseInt(bridgePort), token: bridgeToken || null
            });
            if (resp.status === 200) {
                const data = resp.data;
                toast.success(data.is_healthy ? 'Bridge connected and healthy!' : 'Bridge configured but unreachable');
                checkHealth();
            } else {
                toast.error('Configuration failed');
            }
        } catch (e) {
            toast.error('Bridge configuration error');
            logger.error('Bridge config failed', { error: String(e) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Status */}
            <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-zinc-100">
                        <Router className="h-5 w-5 text-cyan-400" />
                        Bridge Status
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                        Optional. When a bridge is present, actions execute via local LAN for faster response.
                        Falls back to Nuki Web API automatically if bridge is unavailable.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        {health.configured ? (
                            <>
                                <div className={`h-3 w-3 rounded-full ${health.is_healthy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className="text-zinc-200 font-medium">
                                    {health.is_healthy ? 'Bridge Online' : 'Bridge Offline'}
                                </span>
                                {health.ip_address && <span className="text-xs text-zinc-500">{health.ip_address}:{health.port}</span>}
                                <Badge variant="outline" className={health.is_healthy ? 'border-emerald-800 text-emerald-400' : 'border-red-800 text-red-400'}>
                                    {health.is_healthy ? 'LAN Priority' : 'Web API Fallback'}
                                </Badge>
                            </>
                        ) : (
                            <>
                                <WifiOff className="h-5 w-5 text-zinc-600" />
                                <span className="text-zinc-400">No bridge configured — using Nuki Web API only</span>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Configure */}
            <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-zinc-100 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-zinc-400" />
                        Configure Bridge
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-3 items-end">
                        <div className="col-span-2">
                            <label className="text-xs text-zinc-400 mb-1 block">Bridge IP Address</label>
                            <Input
                                placeholder="192.168.1.100"
                                value={bridgeIp}
                                onChange={(e) => setBridgeIp(e.target.value)}
                                className="bg-zinc-900 border-zinc-700 text-zinc-200"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Port</label>
                            <Input
                                placeholder="8080"
                                value={bridgePort}
                                onChange={(e) => setBridgePort(e.target.value)}
                                className="bg-zinc-900 border-zinc-700 text-zinc-200"
                            />
                        </div>
                        <Button onClick={configureBridge} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                            {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Router className="h-4 w-4 mr-1" />}
                            Connect
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ==================== REPORTS TAB (Phase 2) ====================

function ReportsTab() {
    const [summary, setSummary] = useState<AccessSummary | null>(null);
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => { loadReports(); }, [days]);

    const loadReports = async () => {
        setLoading(true);
        try {
            const [sumResp, tlResp, hmResp] = await Promise.all([
                api.get(`/access-control/reports/summary?venue_id=${getVenueId()}&days=${days}`),
                api.get(`/access-control/reports/timeline?venue_id=${getVenueId()}&limit=50`),
                api.get(`/access-control/reports/heatmap?venue_id=${getVenueId()}&days=14`),
            ]);
            if (sumResp.status === 200) setSummary(sumResp.data);
            if (tlResp.status === 200) setTimeline(tlResp.data);
            if (hmResp.status === 200) setHeatmap(hmResp.data);
        } catch (e) {
            logger.error('Reports load failed', { error: String(e) });
        } finally {
            setLoading(false);
        }
    };

    const severityColors: Record<string, string> = {
        info: 'border-l-emerald-500 bg-emerald-500/5',
        warning: 'border-l-amber-500 bg-amber-500/5',
        error: 'border-l-red-500 bg-red-500/5',
    };

    const severityIcons: Record<string, React.ReactNode> = {
        info: <Check className="h-4 w-4 text-emerald-400" />,
        warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
        error: <X className="h-4 w-4 text-red-400" />,
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-zinc-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Period Selector */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-zinc-100">Access Reports</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Period:</span>
                    {[7, 14, 30, 90].map(d => (
                        <Button
                            key={d}
                            size="sm"
                            variant={days === d ? 'default' : 'outline'}
                            className={days === d
                                ? 'bg-emerald-600 text-white h-7 text-xs'
                                : 'border-zinc-700 text-zinc-400 h-7 text-xs'}
                            onClick={() => setDays(d)}
                        >
                            {d}d
                        </Button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                        <Card className="bg-zinc-950 border-zinc-800">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity className="h-4 w-4 text-blue-400" />
                                    <span className="text-xs text-zinc-400 uppercase">Total Actions</span>
                                </div>
                                <p className="text-2xl font-bold text-zinc-100">{summary.total_actions.toLocaleString()}</p>
                                <p className="text-xs text-zinc-500 mt-1">Last {summary.period_days} days</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                        <Card className="bg-zinc-950 border-zinc-800">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                                    <span className="text-xs text-zinc-400 uppercase">Success Rate</span>
                                </div>
                                <p className="text-2xl font-bold text-emerald-400">{summary.success_rate}%</p>
                                <p className="text-xs text-zinc-500 mt-1">{summary.success_count} / {summary.total_actions}</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="bg-zinc-950 border-zinc-800">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="h-4 w-4 text-cyan-400" />
                                    <span className="text-xs text-zinc-400 uppercase">Avg Response</span>
                                </div>
                                <p className="text-2xl font-bold text-zinc-100">{summary.avg_response_ms}ms</p>
                                <p className="text-xs text-zinc-500 mt-1">Bridge: {summary.bridge_usage_pct}%</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <Card className="bg-zinc-950 border-zinc-800">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-4 w-4 text-red-400" />
                                    <span className="text-xs text-zinc-400 uppercase">Failures</span>
                                </div>
                                <p className="text-2xl font-bold text-red-400">{summary.failure_count + summary.unauthorized_count}</p>
                                <p className="text-xs text-zinc-500 mt-1">{summary.unauthorized_count} unauthorized</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            )}

            {/* Highlights */}
            {summary && (summary.busiest_door || summary.most_active_user) && (
                <div className="grid grid-cols-2 gap-4">
                    {summary.busiest_door && (
                        <Card className="bg-zinc-950 border-zinc-800">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
                                    <DoorOpen className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-400">Busiest Door</p>
                                    <p className="text-sm font-semibold text-zinc-100">{summary.busiest_door.name}</p>
                                    <p className="text-xs text-zinc-500">{summary.busiest_door.count} actions</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {summary.most_active_user && (
                        <Card className="bg-zinc-950 border-zinc-800">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-400">Most Active User</p>
                                    <p className="text-sm font-semibold text-zinc-100">{summary.most_active_user.name}</p>
                                    <p className="text-xs text-zinc-500">{summary.most_active_user.count} actions</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Heatmap */}
            {heatmap.length > 0 && (
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-zinc-100 flex items-center gap-2 text-sm">
                            <BarChart3 className="h-4 w-4 text-orange-400" />
                            Access Heatmap (14 days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-24 gap-[2px]">
                            {Array.from({ length: 24 }, (_, hour) => {
                                const hourEntries = heatmap.filter(h => h.hour === hour);
                                const totalCount = hourEntries.reduce((s, e) => s + e.count, 0);
                                const maxCount = Math.max(...heatmap.map(h => h.count), 1);
                                const intensity = totalCount / (maxCount * Math.max(hourEntries.length, 1));
                                const bgOpacity = Math.min(0.1 + intensity * 0.9, 1);

                                return (
                                    <div
                                        key={hour}
                                        className="flex flex-col items-center"
                                        title={`${hour}:00 — ${totalCount} total actions`}
                                    >
                                        <div
                                            className="w-full h-8 rounded-sm"
                                            style={{
                                                backgroundColor: `rgba(52, 211, 153, ${bgOpacity})`,
                                            }}
                                        />
                                        <span className="text-[9px] text-zinc-600 mt-1">{hour}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-2 text-right">Hour of day (UTC)</p>
                    </CardContent>
                </Card>
            )}

            {/* Activity Timeline */}
            <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-zinc-100 flex items-center gap-2 text-sm">
                        <Activity className="h-4 w-4 text-emerald-400" />
                        Activity Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-auto">
                        <AnimatePresence>
                            {timeline.map((entry, i) => (
                                <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    className={`border-l-2 ${severityColors[entry.severity] || severityColors.info} px-3 py-2 rounded-r`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {severityIcons[entry.severity]}
                                            <span className="text-sm text-zinc-200">{entry.description}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {entry.duration_ms && (
                                                <span className="text-[10px] text-zinc-500">{entry.duration_ms}ms</span>
                                            )}
                                            <Badge variant="outline" className="text-[9px] border-zinc-700 text-zinc-500">
                                                {entry.provider_path}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-600 mt-1">
                                        {new Date(entry.timestamp).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}
                                    </p>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {timeline.length === 0 && (
                            <div className="text-center py-8 text-zinc-500">
                                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                                <p>No activity data yet. Actions will appear here automatically.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ==================== KEYPAD TAB (Phase 3) ====================

function KeypadTab() {
    const [pins, setPins] = useState<KeypadPin[]>([]);
    const [doors, setDoors] = useState<Door[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newPin, setNewPin] = useState({
        door_id: '',
        name: '',
        code: '',
        valid_from: '',
        valid_until: '',
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pinResp, doorResp] = await Promise.all([
                api.get(`/access-control/keypad/pins?venue_id=${getVenueId()}`),
                api.get(`/access-control/doors?venue_id=${getVenueId()}`),
            ]);
            if (pinResp.status === 200) setPins(pinResp.data);
            if (doorResp.status === 200) setDoors(doorResp.data);
        } catch (e) {
            logger.error('Keypad load failed', { error: String(e) });
        } finally {
            setLoading(false);
        }
    };

    const createPin = async () => {
        if (!newPin.door_id || !newPin.name || !newPin.code) {
            toast.error('Door, name, and code are required');
            return;
        }
        const codeNum = parseInt(newPin.code, 10);
        if (isNaN(codeNum) || codeNum < 1000 || codeNum > 999999) {
            toast.error('PIN must be 4-6 digits');
            return;
        }
        setCreating(true);
        try {
            const resp = await api.post(`/access-control/keypad/pins?venue_id=${getVenueId()}`, {
                door_id: newPin.door_id,
                name: newPin.name,
                code: codeNum,
                valid_from: newPin.valid_from || null,
                valid_until: newPin.valid_until || null,
            });
            if (resp.status === 200) {
                toast.success('PIN created and dispatched to Nuki device');
                setNewPin({ door_id: '', name: '', code: '', valid_from: '', valid_until: '' });
                loadData();
            } else {
                toast.error(resp.data.detail || 'PIN creation failed');
            }
        } catch (e) {
            toast.error('PIN creation error');
            logger.error('Create PIN failed', { error: String(e) });
        } finally {
            setCreating(false);
        }
    };

    const revokePin = async (pinId: string) => {
        try {
            const resp = await api.delete(`/access-control/keypad/pins/${pinId}?venue_id=${getVenueId()}`);
            if (resp.status === 200) {
                toast.success('PIN revoked from device');
                loadData();
            } else {
                toast.error('Revocation failed');
            }
        } catch (e) {
            toast.error('Revoke error');
            logger.error('Revoke PIN failed', { error: String(e) });
        }
    };

    const activePins = pins.filter(p => p.status === 'active');
    const revokedPins = pins.filter(p => p.status === 'revoked');

    return (
        <div className="space-y-6">
            {/* Create PIN */}
            <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-zinc-100 flex items-center gap-2">
                        <Plus className="h-5 w-5 text-emerald-400" />
                        Create Keypad PIN
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                        Create a time-limited PIN for Nuki Keypad 2. The PIN is dispatched directly to the device.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-6 gap-3 items-end">
                        <div className="col-span-2">
                            <label className="text-xs text-zinc-400 mb-1 block">Door</label>
                            <select
                                title="Select door for PIN"
                                className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded px-3 py-2 text-sm"
                                value={newPin.door_id}
                                onChange={(e) => setNewPin({ ...newPin, door_id: e.target.value })}
                            >
                                <option value="">Select door...</option>
                                {doors.map(d => <option key={d.id} value={d.id}>{d.display_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Label</label>
                            <Input
                                placeholder="Morning Shift"
                                value={newPin.name}
                                onChange={(e) => setNewPin({ ...newPin, name: e.target.value })}
                                className="bg-zinc-900 border-zinc-700 text-zinc-200"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-400 mb-1 block">PIN (4-6 digits)</label>
                            <Input
                                type="password"
                                placeholder="••••"
                                value={newPin.code}
                                maxLength={6}
                                onChange={(e) => setNewPin({ ...newPin, code: e.target.value.replace(/\D/g, '') })}
                                className="bg-zinc-900 border-zinc-700 text-zinc-200"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Valid Until</label>
                            <Input
                                type="datetime-local"
                                value={newPin.valid_until}
                                onChange={(e) => setNewPin({ ...newPin, valid_until: e.target.value })}
                                className="bg-zinc-900 border-zinc-700 text-zinc-200 text-xs"
                            />
                        </div>
                        <Button
                            onClick={createPin}
                            disabled={creating}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            {creating ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Key className="h-4 w-4 mr-1" />}
                            Create
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Active PINs */}
            <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-zinc-100 flex items-center gap-2 text-sm">
                        <Key className="h-4 w-4 text-emerald-400" />
                        Active PINs ({activePins.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-zinc-800">
                                <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Name</th>
                                <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Door</th>
                                <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Code</th>
                                <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Valid Until</th>
                                <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Created</th>
                                <th className="text-right p-3 text-xs font-medium text-zinc-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {activePins.map(pin => (
                                    <motion.tr
                                        key={pin.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors"
                                    >
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <Hash className="h-3.5 w-3.5 text-emerald-400" />
                                                <span className="text-sm text-zinc-200 font-medium">{pin.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-sm text-zinc-300">{pin.door_display_name}</td>
                                        <td className="p-3">
                                            <code className="text-xs text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">
                                                {pin.code_hint}
                                            </code>
                                        </td>
                                        <td className="p-3 text-xs text-zinc-400">
                                            {pin.valid_until ? (
                                                <div className="flex items-center gap-1">
                                                    <Timer className="h-3 w-3 text-amber-400" />
                                                    {new Date(pin.valid_until).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                                                </div>
                                            ) : (
                                                <span className="text-zinc-600">No expiry</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-xs text-zinc-500">
                                            {new Date(pin.created_at).toLocaleDateString('en-GB')} by {pin.created_by}
                                        </td>
                                        <td className="p-3 text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-400 hover:text-red-300 hover:bg-red-950"
                                                onClick={() => revokePin(pin.id)}
                                            >
                                                <Ban className="h-4 w-4 mr-1" />
                                                Revoke
                                            </Button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                            {activePins.length === 0 && (
                                <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No active PINs. Create one above.</td></tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Revoked PINs */}
            {revokedPins.length > 0 && (
                <Card className="bg-zinc-950 border-zinc-800/50">
                    <CardHeader>
                        <CardTitle className="text-zinc-400 flex items-center gap-2 text-sm">
                            <Ban className="h-4 w-4 text-zinc-500" />
                            Revoked PINs ({revokedPins.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full">
                            <tbody>
                                {revokedPins.map(pin => (
                                    <tr key={pin.id} className="border-b border-zinc-900/30">
                                        <td className="p-3 text-sm text-zinc-500 line-through">{pin.name}</td>
                                        <td className="p-3 text-xs text-zinc-600">{pin.door_display_name}</td>
                                        <td className="p-3 text-xs text-zinc-600">
                                            Revoked {pin.revoked_at ? new Date(pin.revoked_at).toLocaleDateString('en-GB') : ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ==================== MAIN COMPONENT ====================

export default function DoorAccessControl() {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Door Access Control</h1>
                    <p className="text-sm text-zinc-400">Nuki Smart Lock integration — server-authoritative access management</p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="doors" className="space-y-6">
                <TabsList className="bg-zinc-900 border border-zinc-800 p-1 flex-wrap">
                    <TabsTrigger value="connection" className="data-[state=active]:bg-zinc-800 text-zinc-400 data-[state=active]:text-zinc-100">
                        <Wifi className="h-4 w-4 mr-1.5" /> Connection
                    </TabsTrigger>
                    <TabsTrigger value="doors" className="data-[state=active]:bg-zinc-800 text-zinc-400 data-[state=active]:text-zinc-100">
                        <DoorOpen className="h-4 w-4 mr-1.5" /> Doors
                    </TabsTrigger>
                    <TabsTrigger value="permissions" className="data-[state=active]:bg-zinc-800 text-zinc-400 data-[state=active]:text-zinc-100">
                        <Shield className="h-4 w-4 mr-1.5" /> Permissions
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="data-[state=active]:bg-zinc-800 text-zinc-400 data-[state=active]:text-zinc-100">
                        <Eye className="h-4 w-4 mr-1.5" /> Audit Trail
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="data-[state=active]:bg-zinc-800 text-zinc-400 data-[state=active]:text-zinc-100">
                        <BarChart3 className="h-4 w-4 mr-1.5" /> Reports
                    </TabsTrigger>
                    <TabsTrigger value="keypad" className="data-[state=active]:bg-zinc-800 text-zinc-400 data-[state=active]:text-zinc-100">
                        <Keyboard className="h-4 w-4 mr-1.5" /> Keypad
                    </TabsTrigger>
                    <TabsTrigger value="bridge" className="data-[state=active]:bg-zinc-800 text-zinc-400 data-[state=active]:text-zinc-100">
                        <Router className="h-4 w-4 mr-1.5" /> Bridge
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="connection"><ConnectionTab /></TabsContent>
                <TabsContent value="doors"><DoorsTab /></TabsContent>
                <TabsContent value="permissions"><PermissionsTab /></TabsContent>
                <TabsContent value="audit"><AuditTab /></TabsContent>
                <TabsContent value="reports"><ReportsTab /></TabsContent>
                <TabsContent value="keypad"><KeypadTab /></TabsContent>
                <TabsContent value="bridge"><BridgeTab /></TabsContent>
            </Tabs>
        </div>
    );
}
