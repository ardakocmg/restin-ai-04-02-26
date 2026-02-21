import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { Plus,RefreshCw,Shield,ShieldAlert,ShieldCheck,Trash2 } from 'lucide-react';
import { useEffect,useState } from 'react';
import { toast } from 'sonner';
import type { Door,Permission } from '../doorAccessTypes';
import { getVenueId } from '../doorAccessTypes';

export default function PermissionsTab() {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [doors, setDoors] = useState<Door[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPerm, setNewPerm] = useState({ door_id: '', role_id: '', can_unlock: true, can_lock: true, can_unlatch: false });

    useEffect(() => { loadData(); }, []);

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
            toast.error('Select a door and enter a role');
            return;
        }
        try {
            const resp = await api.post(`/access-control/permissions?venue_id=${getVenueId()}`, newPerm);
            if (resp.status === 200) {
                toast.success('Permission created');
                setNewPerm({ door_id: '', role_id: '', can_unlock: true, can_lock: true, can_unlatch: false });
                loadData();
            }
        } catch (e) {
            toast.error('Create failed');
            logger.error('Create permission failed', { error: String(e) });
        }
    };

    const deletePermission = async (permId: string) => {
        if (!confirm('Remove this permission?')) return;
        try {
            const resp = await api.delete(`/access-control/permissions/${permId}?venue_id=${getVenueId()}`);
            if (resp.status === 200) {
                toast.success('Permission removed');
                loadData();
            }
        } catch (e) {
            toast.error('Delete failed');
        }
    };

    const getDoorName = (doorId: string) => doors.find(d => d.id === doorId)?.display_name || doorId;

    if (loading) {
        return <div className="flex justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Create Permission */}
            <Card className="bg-background border-border">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                        <Plus className="h-5 w-5 text-emerald-400" />
                        Create Permission
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-5 gap-3 items-end">
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">Door</label>
                            <select aria-label="Input"
                                title="Select door"
                                className="w-full bg-card border border-border text-secondary-foreground rounded px-3 py-2 text-sm"
                                value={newPerm.door_id}
                                onChange={(e) => setNewPerm({ ...newPerm, door_id: e.target.value })}
                            >
                                <option value="">Select door...</option>
                                {doors.map(d => <option key={d.id} value={d.id}>{d.display_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Role</label>
                            <select aria-label="Input"
                                title="Select role"
                                className="w-full bg-card border border-border text-secondary-foreground rounded px-3 py-2 text-sm"
                                value={newPerm.role_id}
                                onChange={(e) => setNewPerm({ ...newPerm, role_id: e.target.value })}
                            >
                                <option value="">Select role...</option>
                                {['OWNER', 'MANAGER', 'WAITER', 'CHEF', 'DELIVERY', 'CLEANER'].map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <Switch checked={newPerm.can_unlock} onCheckedChange={(c) => setNewPerm({ ...newPerm, can_unlock: c })} />
                                <span className="text-xs text-muted-foreground">Unlock</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Switch checked={newPerm.can_unlatch} onCheckedChange={(c) => setNewPerm({ ...newPerm, can_unlatch: c })} />
                                <span className="text-xs text-muted-foreground">Unlatch</span>
                            </div>
                        </div>
                        <Button onClick={createPermission} className="bg-emerald-600 hover:bg-emerald-700 text-foreground">
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Permission Matrix */}
            <Card className="bg-background border-border">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-blue-400" />
                        Permission Matrix ({permissions.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Door</th>
                                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Role</th>
                                <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">Unlock</th>
                                <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">Lock</th>
                                <th className="text-center p-3 text-xs font-medium text-muted-foreground uppercase">Unlatch</th>
                                <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {permissions.map(perm => (
                                <tr key={perm.id} className="border-b border-zinc-900 hover:bg-card/30 transition-colors">
                                    <td className="p-3 text-sm text-secondary-foreground">{getDoorName(perm.door_id)}</td>
                                    <td className="p-3">
                                        <Badge variant="outline" className="border-border text-secondary-foreground">{perm.role_id}</Badge>
                                    </td>
                                    <td className="p-3 text-center">
                                        {perm.can_unlock ? <ShieldCheck className="h-4 w-4 text-emerald-400 mx-auto" /> : <ShieldAlert className="h-4 w-4 text-muted-foreground mx-auto" />}
                                    </td>
                                    <td className="p-3 text-center">
                                        {perm.can_lock ? <ShieldCheck className="h-4 w-4 text-emerald-400 mx-auto" /> : <ShieldAlert className="h-4 w-4 text-muted-foreground mx-auto" />}
                                    </td>
                                    <td className="p-3 text-center">
                                        {perm.can_unlatch ? <ShieldCheck className="h-4 w-4 text-emerald-400 mx-auto" /> : <ShieldAlert className="h-4 w-4 text-muted-foreground mx-auto" />}
                                    </td>
                                    <td className="p-3 text-right">
                                        <Button size="sm" variant="ghost" onClick={() => deletePermission(perm.id)} className="text-red-400 hover:bg-red-950/50 h-6 w-6 p-0">
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {permissions.length === 0 && (
                                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{"No "}permissions configured. Add one above.</td></tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
