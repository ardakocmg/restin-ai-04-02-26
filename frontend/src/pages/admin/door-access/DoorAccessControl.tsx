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
 */
import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Lock, Unlock, DoorOpen, Shield, ShieldCheck, ShieldAlert,
    Wifi, WifiOff, Battery, BatteryWarning, RefreshCw, Pencil,
    Check, X, Clock, Eye, Plus, Trash2, Key, Settings,
    Globe, Router, Activity, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const API = process.env.REACT_APP_API_URL || '';

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
            const resp = await fetch(`${API}/api/access-control/connection/status?venue_id=${getVenueId()}`);
            if (resp.ok) setStatus(await resp.json());
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
            const resp = await fetch(`${API}/api/access-control/connect/token?venue_id=${getVenueId()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_token: apiToken }),
            });
            if (resp.ok) {
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
            const resp = await fetch(`${API}/api/access-control/connect/oauth?venue_id=${getVenueId()}`, {
                method: 'POST',
            });
            if (resp.ok) {
                const data = await resp.json();
                window.location.href = data.redirect_url;
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
            const resp = await fetch(`${API}/api/access-control/doors?venue_id=${getVenueId()}`);
            if (resp.ok) setDoors(await resp.json());
        } catch (e) {
            logger.error('Load doors failed', { error: String(e) });
        } finally {
            setLoading(false);
        }
    };

    const syncDevices = async () => {
        setSyncing(true);
        try {
            const resp = await fetch(`${API}/api/access-control/doors/sync?venue_id=${getVenueId()}`, { method: 'POST' });
            if (resp.ok) {
                const data = await resp.json();
                toast.success(`Synced: ${data.discovered} devices (${data.new} new, ${data.updated} updated)`);
                loadDoors();
            } else {
                const err = await resp.json();
                toast.error(err.detail || 'Sync failed');
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
            const resp = await fetch(`${API}/api/access-control/doors/${doorId}?venue_id=${getVenueId()}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ display_name: editName }),
            });
            if (resp.ok) {
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
            const resp = await fetch(
                `${API}/api/access-control/doors/${doorId}/${action.toLowerCase()}?venue_id=${getVenueId()}&user_id=${userId}`,
                { method: 'POST' }
            );
            const data = await resp.json();
            if (resp.ok) {
                toast.success(`${action} successful via ${data.provider_path} (${data.duration_ms}ms)`);
                loadDoors();
            } else {
                toast.error(data.detail || `${action} failed`);
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
                fetch(`${API}/api/access-control/permissions?venue_id=${getVenueId()}`),
                fetch(`${API}/api/access-control/doors?venue_id=${getVenueId()}`),
            ]);
            if (permResp.ok) setPermissions(await permResp.json());
            if (doorResp.ok) setDoors(await doorResp.json());
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
            const resp = await fetch(`${API}/api/access-control/permissions?venue_id=${getVenueId()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPerm),
            });
            if (resp.ok) {
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
            const resp = await fetch(`${API}/api/access-control/permissions/${permId}`, { method: 'DELETE' });
            if (resp.ok) {
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
            const resp = await fetch(`${API}/api/access-control/audit?venue_id=${getVenueId()}&limit=200`);
            if (resp.ok) setEntries(await resp.json());
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
            const resp = await fetch(`${API}/api/access-control/bridge/health?venue_id=${getVenueId()}`);
            if (resp.ok) setHealth(await resp.json());
        } catch (e) {
            logger.error('Bridge health check failed', { error: String(e) });
        }
    };

    const configureBridge = async () => {
        if (!bridgeIp) { toast.error('Enter bridge IP'); return; }
        setLoading(true);
        try {
            const resp = await fetch(`${API}/api/access-control/bridge/configure?venue_id=${getVenueId()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip_address: bridgeIp, port: parseInt(bridgePort), token: bridgeToken || null }),
            });
            if (resp.ok) {
                const data = await resp.json();
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
                <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
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
                    <TabsTrigger value="bridge" className="data-[state=active]:bg-zinc-800 text-zinc-400 data-[state=active]:text-zinc-100">
                        <Router className="h-4 w-4 mr-1.5" /> Bridge
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="connection"><ConnectionTab /></TabsContent>
                <TabsContent value="doors"><DoorsTab /></TabsContent>
                <TabsContent value="permissions"><PermissionsTab /></TabsContent>
                <TabsContent value="audit"><AuditTab /></TabsContent>
                <TabsContent value="bridge"><BridgeTab /></TabsContent>
            </Tabs>
        </div>
    );
}
