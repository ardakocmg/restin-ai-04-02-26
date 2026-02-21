import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, Clock, Loader2, UserPlus, Info } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';

export default function ReservationModal({ open, onOpenChange, venueId, onCreated }) {
    const { user, isManager, isOwner } = useAuth();
    const { logAction } = useAuditLog();
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [slots, setSlots] = useState([]);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date: new Date().toISOString().split('T')[0],
        time: '19:00',
        guests: '2',
        notes: '',
        table_id: ''
    });

    const checkAvailability = async () => {
        setChecking(true);
        try {
            const res = await api.post('/reservations/check-availability', {
                venue_id: venueId,
                date: formData.date,
                guest_count: parseInt(formData.guests)
            });
            setSlots(res.data.slots);
            toast.success("Availability updated");
        } catch (e: any) {
            toast.error("Error checking availability");
        } finally {
            setChecking(false);
        }
    };

    const handleCreate = async () => {
        setLoading(true);
        try {
            const payload = {
                venue_id: venueId,
                guest_count: parseInt(formData.guests),
                datetime_start: `${formData.date}T${formData.time}:00`,
                channel: 'INTERNAL',
                guest: {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    email: formData.email,
                    phone: formData.phone
                },
                notes: formData.notes
            };

            await api.post('/reservations/', payload);
            logAction('RESERVATION_CREATED', 'reservation', venueId, {
                guest_name: `${formData.first_name} ${formData.last_name}`,
                date: formData.date,
                time: formData.time,
                guests: formData.guests
            });
            toast.success("Reservation created successfully");
            onCreated();
            onOpenChange(false);
        } catch (e: any) {
            toast.error("Error creating reservation. Check for overlaps.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl bg-background border-border text-foreground">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">
                        New Internal Reservation
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground font-bold uppercase text-[10px]">
                        Add a phone-in or walk-in guest to the books
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6 py-4">
                    {/* Guest Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <UserPlus className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Guest Profile</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">First Name</Label>
                                <Input value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="bg-card border-border h-9" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Last Name</Label>
                                <Input value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="bg-card border-border h-9" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Phone</Label>
                            <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="bg-card border-border h-9" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Notes</Label>
                            <textarea
                                className="w-full bg-card border border-border rounded-md p-2 text-sm focus:outline-none focus:border-red-500/50"
                                rows={3}
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="VIP, Allergy, etc..."
                            />
                        </div>
                    </div>

                    {/* Booking Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Calendar className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Availability</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Date</Label>
                                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="bg-card border-border h-9" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Covers</Label>
                                <Input type="number" value={formData.guests} onChange={e => setFormData({ ...formData, guests: e.target.value })} className="bg-card border-border h-9" />
                            </div>
                        </div>

                        <Button
                            variant="secondary"
                            size="sm"
                            className="w-full bg-card border border-border text-[10px] font-black uppercase tracking-widest h-8"
                            onClick={checkAvailability}
                            disabled={checking}
                        >
                            {checking ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : "Check Slots"}
                        </Button>

                        {slots.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Select Time</Label>
                                <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto pr-1">
                                    {slots.map(s => (
                                        <button
                                            key={s.time}
                                            disabled={!s.available}
                                            onClick={() => setFormData({ ...formData, time: s.time })}
                                            className={`text-[10px] p-2 rounded border transition-all ${!s.available
                                                ? 'bg-background border-border text-foreground cursor-not-allowed'
                                                : formData.time === s.time
                                                    ? 'bg-red-600 border-red-600 text-foreground font-black'
                                                    : 'bg-card border-border text-muted-foreground hover:border-red-500/50'
                                                }`}
                                        >
                                            {s.time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-4 gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="uppercase text-[10px] font-black">Cancel</Button>
                    <Button
                        onClick={handleCreate}
                        disabled={loading || !formData.first_name}
                        className="bg-red-600 hover:bg-red-500 text-foreground uppercase text-[10px] font-black tracking-widest px-8"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Booking"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
