import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card,CardContent } from '@/components/ui/card';
import {
Dialog,DialogContent,
DialogDescription,
DialogHeader,DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import api,{ accessControlAPI } from '@/lib/api';
import { logger } from '@/lib/logger';
import { AnimatePresence,motion } from 'framer-motion';
import {
Activity,
AlertTriangle,
Battery,BatteryWarning,
Check,
Clock,
DoorOpen,
Lock,
Pencil,
Plus,
RefreshCw,
Settings,
Trash2,
Unlock,
User,
X,
} from 'lucide-react';
import React,{ useEffect,useState } from 'react';
import { toast } from 'sonner';
import type { Door,DoorConfig,NukiAuth,NukiLog } from '../doorAccessTypes';
import { getVenueId } from '../doorAccessTypes';

// ==================== CREATE PIN DIALOG ====================

function CreatePinDialog({ doorId, isOpen, onClose, onSuccess }: { doorId: string; isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name || code.length !== 6) {
            toast.error('Name and 6-digit code required');
            return;
        }
        setLoading(true);
        try {
            const resp = await accessControlAPI.createPin(getVenueId(), doorId, name, code, undefined, undefined);
            if (resp.status === 200) {
                toast.success('PIN created successfully');
                onSuccess();
                onClose();
                setName('');
                setCode('');
            }
        } catch (e) {
            toast.error('Failed to create PIN');
            logger.error('Create PIN failed', { error: String(e) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-background border-border text-foreground">
                <DialogHeader>
                    <DialogTitle>Create New PIN</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Create a 6-digit access code for the Keypad.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input aria-label="e.g. Guest Access" placeholder="e.g. Guest Access" value={name} onChange={(e) => setName(e.target.value)} className="bg-card border-border text-secondary-foreground" />
                    </div>
                    <div className="space-y-2">
                        <Label>Code (6 digits)</Label>
                        <Input aria-label="123456" placeholder="123456" value={code} maxLength={6} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} className="bg-card border-border text-secondary-foreground font-mono tracking-widest text-center text-lg" />
                    </div>
                    <Button onClick={handleSubmit} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-foreground">
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        Create PIN
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ==================== DOOR DETAIL MODAL ====================

function DoorDetailModal({ door, isOpen, onClose }: { door: Door; isOpen: boolean; onClose: () => void }) {
    const [activeTab, setActiveTab] = useState('settings');
    const [config, setConfig] = useState<DoorConfig | null>(null);
    const [auths, setAuths] = useState<NukiAuth[]>([]);
    const [logs, setLogs] = useState<NukiLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isCreatePinOpen, setIsCreatePinOpen] = useState(false);

    useEffect(() => {
        if (isOpen && door) { loadTabContent(activeTab); }
    }, [isOpen, activeTab, door]);

    const loadTabContent = async (tab: string) => {
        setLoading(true);
        try {
            if (tab === 'settings') {
                const resp = await accessControlAPI.getConfig(door.id, getVenueId());
                if (resp.status === 200) setConfig(resp.data);
            } else if (tab === 'users') {
                const resp = await accessControlAPI.listAuths(door.id, getVenueId());
                if (resp.status === 200) setAuths(resp.data);
            } else if (tab === 'logs') {
                const resp = await accessControlAPI.getNativeLogs(door.id, getVenueId());
                if (resp.status === 200) setLogs(resp.data);
            }
        } catch (e) {
            logger.error(`Load ${tab} failed`, { error: String(e) });
            toast.error(`Failed to load ${tab}`);
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        if (!config) return;
        setSaving(true);
        try {
            const resp = await accessControlAPI.updateConfig(door.id, config as/**/any, getVenueId());
            if (resp.status === 200) { toast.success('Settings saved'); setConfig(resp.data); }
        } catch (e) {
            toast.error('Save failed');
            logger.error('Save config failed', { error: String(e) });
        } finally { setSaving(false); }
    };

    const revokeAuth = async (authId: string) => {
        if (!confirm('Are you sure you want to revoke this user?')) return;
        try {
            const resp = await accessControlAPI.deleteAuth(door.id, authId, getVenueId());
            if (resp.status === 200) { toast.success('User revoked'); loadTabContent('users'); }
        } catch (e) { toast.error('Revoke failed'); }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-background border-border text-foreground max-w-4xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 border-b border-border">
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        Manage {door?.display_name}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Configure device settings, manage authorizations, and view internal logs.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden flex">
                    <div className="w-48 border-r border-border bg-card/50 p-4 space-y-2">
                        <Button variant={activeTab === 'settings' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('settings')}>
                            <Settings className="h-4 w-4 mr-2" /> Settings
                        </Button>
                        <Button variant={activeTab === 'users' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('users')}>
                            <Activity className="h-4 w-4 mr-2" /> Users
                        </Button>
                        <Button variant={activeTab === 'logs' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setActiveTab('logs')}>
                            <Activity className="h-4 w-4 mr-2" /> Native Logs
                        </Button>
                    </div>
                    <div className="flex-1 p-6 overflow-auto bg-background">
                        {loading ? (
                            <div className="flex justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                        ) : activeTab === 'settings' && config ? (
                            <div className="space-y-6 max-w-lg">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-foreground">Device Behavior</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5"><Label className="text-base text-secondary-foreground">Single Lock</Label><p className="text-sm text-muted-foreground">Only lock once (don't double bolt)</p></div>
                                        <Switch checked={config.single_lock} onCheckedChange={(c) => setConfig({ ...config, single_lock: c })} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5"><Label className="text-base text-secondary-foreground">Button Enabled</Label><p className="text-sm text-muted-foreground">Allow physical button on device</p></div>
                                        <Switch checked={config.button_enabled} onCheckedChange={(c) => setConfig({ ...config, button_enabled: c })} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5"><Label className="text-base text-secondary-foreground">LED Enabled</Label><p className="text-sm text-muted-foreground">Ring/Indicator light</p></div>
                                        <Switch checked={config.led_enabled} onCheckedChange={(c) => setConfig({ ...config, led_enabled: c })} />
                                    </div>
                                    {config.led_enabled && (
                                        <div className="space-y-2 pt-2">
                                            <Label className="text-sm text-muted-foreground">LED Brightness ({config.led_brightness}%)</Label>
                                            <Slider value={[config.led_brightness]} min={0} max={5} step={1} onValueChange={(v) => setConfig({ ...config, led_brightness: v[0] })} />
                                        </div>
                                    )}
                                </div>
                                <Button onClick={saveConfig} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-foreground">
                                    {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </div>
                        ) : activeTab === 'users' ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-foreground">Authorized Users</h3>
                                    <Button size="sm" onClick={() => setIsCreatePinOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-foreground">
                                        <Plus className="h-4 w-4 mr-2" /> New PIN
                                    </Button>
                                    <CreatePinDialog doorId={door.id} isOpen={isCreatePinOpen} onClose={() => setIsCreatePinOpen(false)} onSuccess={() => loadTabContent('users')} />
                                </div>
                                <div className="border border-border rounded-md">
                                    <table className="w-full">
                                        <thead className="bg-card/50">
                                            <tr>
                                                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Name</th>
                                                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                                                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                                                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {auths.map(auth => (
                                                <tr key={auth.id} className="border-t border-border hover:bg-card/30">
                                                    <td className="p-3 text-sm text-secondary-foreground">{auth.name}</td>
                                                    <td className="p-3"><Badge variant="outline" className="text-xs border-border text-muted-foreground">{auth.type}</Badge></td>
                                                    <td className="p-3"><span className={`text-xs ${auth.status === 'ACT' ? 'text-emerald-400' : 'text-muted-foreground'}`}>{auth.status === 'ACT' ? 'Active' : auth.status}</span></td>
                                                    <td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={() => revokeAuth(auth.id)} className="text-red-400 hover:bg-red-950/50 h-6 w-6 p-0"><Trash2 className="h-3 w-3" /></Button></td>
                                                </tr>
                                            ))}
                                            {auths.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{"No "}authorizations found.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : activeTab === 'logs' ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-medium text-foreground">Native Device Logs</h3>
                                    <Button size="sm" variant="outline" onClick={async () => {
                                        toast.loading("Syncing logs...");
                                        try { await accessControlAPI.syncLogs(door.id, getVenueId()); toast.dismiss(); toast.success("Logs synced!"); loadTabContent('logs'); }
                                        catch (e) { toast.dismiss(); toast.error("Sync failed"); }
                                    }} className="h-8 gap-2 border-border text-secondary-foreground">
                                        <RefreshCw className="h-3 w-3" /> Sync from Device
                                    </Button>
                                </div>
                                <div className="border border-border rounded-md overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-card/50">
                                            <tr>
                                                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Time</th>
                                                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Action</th>
                                                <th className="text-left p-3 text-xs font-medium text-muted-foreground">User / Staff</th>
                                                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Trigger</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logs.map(log => (
                                                <tr key={log.id} className="border-t border-border hover:bg-card/30">
                                                    <td className="p-3 text-xs text-muted-foreground">{new Date(log.date).toLocaleString()}</td>
                                                    <td className="p-3 text-sm text-secondary-foreground">{log.action}</td>
                                                    <td className="p-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-secondary-foreground">{log.auth_name || '—'}</span>
                                                            {log.staff_name && (
                                                                <Badge variant="outline" className="w-fit mt-1 text-[10px] h-4 px-1 gap-1 border-emerald-900/50 text-emerald-400 bg-emerald-950/30">
                                                                    <User className="h-2 w-2" />{log.staff_name}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-xs text-muted-foreground">{log.trigger}</td>
                                                </tr>
                                            ))}
                                            {logs.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{"No "}logs found on device.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ==================== DOORS TAB ====================

export default function DoorsTab() {
    const [doors, setDoors] = useState<Door[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [manageDoor, setManageDoor] = useState<Door | null>(null);

    useEffect(() => { loadDoors(); }, []);

    const loadDoors = async () => {
        setLoading(true);
        try {
            const resp = await api.get(`/access-control/doors?venue_id=${getVenueId()}`);
            if (resp.status === 200) setDoors(resp.data);
        } catch (e) { logger.error('Load doors failed', { error: String(e) }); }
        finally { setLoading(false); }
    };

    const syncDevices = async () => {
        setSyncing(true);
        try {
            const resp = await api.post(`/access-control/doors/sync?venue_id=${getVenueId()}`);
            if (resp.status === 200) {
                const data = resp.data;
                toast.success(`Synced: ${data.discovered} devices (${data.new} new, ${data.updated} updated)`);
                loadDoors();
            } else { toast.error(resp.data.detail || 'Sync failed'); }
        } catch (e) { toast.error('Device sync failed'); logger.error('Sync failed', { error: String(e) }); }
        finally { setSyncing(false); }
    };

    const renameDoor = async (doorId: string) => {
        if (!editName.trim()) return;
        try {
            const resp = await api.post(`/access-control/doors/${doorId}/rename?venue_id=${getVenueId()}`, { new_name: editName });
            if (resp.status === 200) { toast.success('Door renamed'); setEditingId(null); loadDoors(); }
        } catch (e) { toast.error('Rename failed'); logger.error('Rename failed', { error: String(e) }); }
    };

    const executeAction = async (doorId: string, action: string) => {
        const key = `${doorId}-${action}`;
        setActionLoading(key);
        try {
            const userId = localStorage.getItem('restin_user_id') || JSON.parse(localStorage.getItem('restin_user') || '{}')?.id || 'admin';
            const resp = await api.post(`/access-control/doors/${doorId}/${action.toLowerCase()}?venue_id=${getVenueId()}&user_id=${userId}`);
            if (resp.status === 200) { toast.success(`${action} successful via ${resp.data.provider_path} (${resp.data.duration_ms}ms)`); loadDoors(); }
            else { toast.error(resp.data.detail || `${action} failed`); }
        } catch (e) { toast.error(`${action} failed`); logger.error('Action failed', { error: String(e) }); }
        finally { setActionLoading(null); }
    };

    const lockStateColors: Record<string, string> = {
        LOCKED: 'bg-emerald-500/10 text-emerald-400 border-emerald-800',
        UNLOCKED: 'bg-amber-500/10 text-amber-400 border-amber-800',
        UNLATCHED: 'bg-blue-500/10 text-blue-400 border-blue-800',
        UNKNOWN: 'bg-zinc-700/30 text-muted-foreground border-border',
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
                <h3 className="text-lg font-semibold text-foreground">Registered Doors</h3>
                <Button onClick={syncDevices} disabled={syncing} variant="outline" className="border-border text-secondary-foreground">
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Discovering...' : 'Sync Devices'}
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : doors.length === 0 ? (
                <Card className="bg-background border-border p-8 text-center">
                    <DoorOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{"No "}doors registered. Click "Sync Devices" to discover your Nuki locks.</p>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence>
                        {doors.map((door) => (
                            <motion.div key={door.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                                <Card className="bg-background border-border hover:border-border transition-colors overflow-hidden">
                                    <div className={`h-1 ${door.lock_state === 'LOCKED' ? 'bg-emerald-500' : door.lock_state === 'UNLOCKED' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                    <CardContent className="p-4 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                {editingId === door.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input aria-label="Input field" value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-card border-border text-secondary-foreground h-8 text-sm" autoFocus onKeyDown={(e) => e.key === 'Enter' && renameDoor(door.id)} />
                                                        <Button size="sm" variant="ghost" onClick={() => renameDoor(door.id)} className="text-emerald-400 h-8 w-8 p-0"><Check className="h-4 w-4" /></Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-muted-foreground h-8 w-8 p-0"><X className="h-4 w-4" /></Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold text-foreground">{door.display_name}</h4>
                                                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-secondary-foreground h-6 w-6 p-0" onClick={() => { setEditingId(door.id); setEditName(door.display_name); }}>
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-emerald-400 h-6 w-6 p-0 ml-1" onClick={() => setManageDoor(door)} title="Manage Device">
                                                            <Settings className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                                <p className="text-xs text-muted-foreground mt-1">{door.device_type.replace(/_/g, ' ')}</p>
                                            </div>
                                            <Badge variant="outline" className={lockStateColors[door.lock_state] || lockStateColors.UNKNOWN}>
                                                {lockStateIcons[door.lock_state]}
                                                <span className="ml-1">{door.lock_state}</span>
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {door.battery_critical ? <BatteryWarning className="h-4 w-4 text-red-400" /> : <Battery className="h-4 w-4 text-emerald-400" />}
                                            <span className={`text-xs ${door.battery_critical ? 'text-red-400' : 'text-muted-foreground'}`}>{door.battery_charge != null ? `${door.battery_charge}%` : 'N/A'}</span>
                                            {door.last_synced_at && <span className="text-xs text-muted-foreground ml-auto"><Clock className="h-3 w-3 inline mr-1" />{new Date(door.last_synced_at).toLocaleTimeString()}</span>}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <Button size="sm" className="bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 border border-emerald-900" onClick={() => executeAction(door.id, 'UNLOCK')} disabled={actionLoading === `${door.id}-UNLOCK`}>
                                                {actionLoading === `${door.id}-UNLOCK` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3 mr-1" />} Unlock
                                            </Button>
                                            <Button size="sm" className="bg-red-900/30 hover:bg-red-800/50 text-red-300 border border-red-900" onClick={() => executeAction(door.id, 'LOCK')} disabled={actionLoading === `${door.id}-LOCK`}>
                                                {actionLoading === `${door.id}-LOCK` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3 mr-1" />} Lock
                                            </Button>
                                            <Button size="sm" className="bg-blue-900/30 hover:bg-blue-800/50 text-blue-300 border border-blue-900" onClick={() => executeAction(door.id, 'UNLATCH')} disabled={actionLoading === `${door.id}-UNLATCH`}>
                                                {actionLoading === `${door.id}-UNLATCH` ? <RefreshCw className="h-3 w-3 animate-spin" /> : <DoorOpen className="h-3 w-3 mr-1" />} Unlatch
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
            {manageDoor && <DoorDetailModal door={manageDoor} isOpen={!!manageDoor} onClose={() => setManageDoor(null)} />}
        </div>
    );
}
