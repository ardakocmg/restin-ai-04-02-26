import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Key, Hash, Timer, Ban, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import type { Door, KeypadPin } from '../doorAccessTypes';
import { getVenueId } from '../doorAccessTypes';

export default function KeypadTab() {
    const [pins, setPins] = useState<KeypadPin[]>([]);
    const [doors, setDoors] = useState<Door[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newPin, setNewPin] = useState({ door_id: '', name: '', code: '', valid_from: '', valid_until: '' });

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
        } catch (e: any) {
            logger.error('Keypad load failed', { error: String(e) });
        } finally { setLoading(false); }
    };

    const createPin = async () => {
        if (!newPin.door_id || !newPin.name || !newPin.code) { toast.error('Door, name, and code are required'); return; }
        const codeNum = parseInt(newPin.code, 10);
        if (isNaN(codeNum) || codeNum < 1000 || codeNum > 999999) { toast.error('PIN must be 4-6 digits'); return; }
        setCreating(true);
        try {
            const resp = await api.post(`/access-control/keypad/pins?venue_id=${getVenueId()}`, {
                door_id: newPin.door_id, name: newPin.name, code: codeNum,
                valid_from: newPin.valid_from || null, valid_until: newPin.valid_until || null,
            });
            if (resp.status === 200) {
                toast.success('PIN created and dispatched to Nuki device');
                setNewPin({ door_id: '', name: '', code: '', valid_from: '', valid_until: '' });
                loadData();
            } else { toast.error(resp.data.detail || 'PIN creation failed'); }
        } catch (e: any) { toast.error('PIN creation error'); logger.error('Create PIN failed', { error: String(e) }); }
        finally { setCreating(false); }
    };

    const revokePin = async (pinId: string) => {
        try {
            const resp = await api.delete(`/access-control/keypad/pins/${pinId}?venue_id=${getVenueId()}`);
            if (resp.status === 200) { toast.success('PIN revoked from device'); loadData(); }
            else { toast.error('Revocation failed'); }
        } catch (e: any) { toast.error('Revoke error'); logger.error('Revoke PIN failed', { error: String(e) }); }
    };

    const activePins = pins.filter(p => p.status === 'active');
    const revokedPins = pins.filter(p => p.status === 'revoked');

    return (
        <div className="space-y-6">
            <Card className="bg-background border-border">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-400" />Create Keypad PIN</CardTitle>
                    <CardDescription className="text-muted-foreground">Create a time-limited PIN for Nuki Keypad 2. The PIN is dispatched directly to the device.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-6 gap-3 items-end">
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">Door</label>
                            <select title="Select door for PIN" className="w-full bg-card border border-border text-secondary-foreground rounded px-3 py-2 text-sm" value={newPin.door_id} onChange={(e) => setNewPin({ ...newPin, door_id: e.target.value })}>
                                <option value="">Select door...</option>
                                {doors.map(d => <option key={d.id} value={d.id}>{d.display_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Label</label>
                            <Input placeholder="Morning Shift" value={newPin.name} onChange={(e) => setNewPin({ ...newPin, name: e.target.value })} className="bg-card border-border text-secondary-foreground" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">PIN (4-6 digits)</label>
                            <Input type="password" placeholder="••••" value={newPin.code} maxLength={6} onChange={(e) => setNewPin({ ...newPin, code: e.target.value.replace(/\D/g, '') })} className="bg-card border-border text-secondary-foreground" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Valid Until</label>
                            <Input type="datetime-local" value={newPin.valid_until} onChange={(e) => setNewPin({ ...newPin, valid_until: e.target.value })} className="bg-card border-border text-secondary-foreground text-xs" />
                        </div>
                        <Button onClick={createPin} disabled={creating} className="bg-emerald-600 text-foreground hover:bg-emerald-700">
                            {creating ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Key className="h-4 w-4 mr-1" />}Create
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-background border-border">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2 text-sm"><Key className="h-4 w-4 text-emerald-400" />Active PINs ({activePins.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Name</th>
                                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Door</th>
                                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Code</th>
                                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Valid Until</th>
                                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Created</th>
                                <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {activePins.map(pin => (
                                    <motion.tr key={pin.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-zinc-900 hover:bg-card/50 transition-colors">
                                        <td className="p-3"><div className="flex items-center gap-2"><Hash className="h-3.5 w-3.5 text-emerald-400" /><span className="text-sm text-secondary-foreground font-medium">{pin.name}</span></div></td>
                                        <td className="p-3 text-sm text-secondary-foreground">{pin.door_display_name}</td>
                                        <td className="p-3"><code className="text-xs text-muted-foreground bg-card px-2 py-0.5 rounded">{pin.code_hint}</code></td>
                                        <td className="p-3 text-xs text-muted-foreground">
                                            {pin.valid_until ? <div className="flex items-center gap-1"><Timer className="h-3 w-3 text-amber-400" />{new Date(pin.valid_until).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</div> : <span className="text-muted-foreground">No expiry</span>}
                                        </td>
                                        <td className="p-3 text-xs text-muted-foreground">{new Date(pin.created_at).toLocaleDateString('en-GB')} by {pin.created_by}</td>
                                        <td className="p-3 text-right">
                                            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-950" onClick={() => revokePin(pin.id)}>
                                                <Ban className="h-4 w-4 mr-1" />Revoke
                                            </Button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                            {activePins.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No active PINs. Create one above.</td></tr>}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {revokedPins.length > 0 && (
                <Card className="bg-background border-border/50">
                    <CardHeader><CardTitle className="text-muted-foreground flex items-center gap-2 text-sm"><Ban className="h-4 w-4 text-muted-foreground" />Revoked PINs ({revokedPins.length})</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full">
                            <tbody>
                                {revokedPins.map(pin => (
                                    <tr key={pin.id} className="border-b border-zinc-900/30">
                                        <td className="p-3 text-sm text-muted-foreground line-through">{pin.name}</td>
                                        <td className="p-3 text-xs text-muted-foreground">{pin.door_display_name}</td>
                                        <td className="p-3 text-xs text-muted-foreground">Revoked {pin.revoked_at ? new Date(pin.revoked_at).toLocaleDateString('en-GB') : ''}</td>
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
