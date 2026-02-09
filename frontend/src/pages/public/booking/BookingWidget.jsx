import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useSearchParams, useParams } from 'react-router-dom';

import { Calendar, Users, Clock, CheckCircle, ChevronRight, Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { toast } from 'sonner';

import api from '@/lib/api';

export default function BookingWidget() {
    const { venueId } = useParams();
    const [searchParams] = useSearchParams();
    const source = searchParams.get('source');

    // State
    const [step, setStep] = useState(1); // 1: Search, 2: Select Slot, 3: Guest Details, 4: Confirmation
    const [loading, setLoading] = useState(false);

    // Query
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [guests, setGuests] = useState(2);
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);

    // Guest
    const [guestDetails, setGuestDetails] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        notes: ''
    });

    const [confirmedRes, setConfirmedRes] = useState(null);

    // Methods
    const fetchSlots = async () => {
        setLoading(true);
        try {
            const res = await api.post('/reservations/check-availability', {
                venue_id: venueId || 'vendor_001', // Fallback for dev
                date: date,
                guest_count: parseInt(guests)
            });
            setSlots(res.data.slots);
            setStep(2);
        } catch (error) {
            logger.error(error);
            toast.error("Could not find availability. Please try another date.");
        } finally {
            setLoading(false);
        }
    };

    const submitBooking = async () => {
        setLoading(true);
        try {
            // Determine Channel
            let channel = 'WEB_DIRECT';
            if (source === 'google_maps') channel = 'GOOGLE_REDIRECT';
            if (source === 'instagram') channel = 'SOCIAL';

            const payload = {
                venue_id: venueId || 'vendor_001',
                guest_count: parseInt(guests),
                datetime_start: `${date}T${selectedSlot}:00`,
                channel: channel,
                guest: guestDetails,
                notes: guestDetails.notes
            };

            const res = await api.post('/reservations/', payload);
            setConfirmedRes(res.data);
            setStep(4);
            toast.success("Reservation Confirmed!");
        } catch (error) {
            logger.error(error);
            toast.error("Booking failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Render Steps
    const renderStep1 = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-zinc-400">Date</Label>
                    <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-zinc-400">Guests</Label>
                    <Select value={String(guests)} onValueChange={setGuests}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                            <SelectValue placeholder="2 Guests" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                <SelectItem key={n} value={String(n)}>{n} People</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Button className="w-full bg-white text-foreground hover:bg-zinc-200 mt-4" onClick={fetchSlots} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
                Find a Table
            </Button>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400">Available Slots for {date}</h3>
            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {slots.filter(s => s.available).map((slot, idx) => (
                    <Button
                        key={idx}
                        variant={selectedSlot === slot.time ? "default" : "outline"}
                        className={`text-xs ${selectedSlot === slot.time ? 'bg-blue-600 border-blue-600' : 'border-zinc-700 text-zinc-300'}`}
                        onClick={() => setSelectedSlot(slot.time)}
                    >
                        {slot.time}
                    </Button>
                ))}
                {slots.filter(s => s.available).length === 0 && (
                    <div className="col-span-3 text-center text-zinc-500 py-4">No slots available</div>
                )}
            </div>
            <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1 bg-white text-foreground" disabled={!selectedSlot} onClick={() => setStep(3)}>Next</Button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-3">
            <div className="space-y-2">
                <Label>Details</Label>
                <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="First Name" className="bg-zinc-800 border-zinc-700" value={guestDetails.first_name} onChange={e => setGuestDetails({ ...guestDetails, first_name: e.target.value })} />
                    <Input placeholder="Last Name" className="bg-zinc-800 border-zinc-700" value={guestDetails.last_name} onChange={e => setGuestDetails({ ...guestDetails, last_name: e.target.value })} />
                </div>
                <Input placeholder="Email" className="bg-zinc-800 border-zinc-700" value={guestDetails.email} onChange={e => setGuestDetails({ ...guestDetails, email: e.target.value })} />
                <Input placeholder="Phone" className="bg-zinc-800 border-zinc-700" value={guestDetails.phone} onChange={e => setGuestDetails({ ...guestDetails, phone: e.target.value })} />
                <Input placeholder="Special Requests (Optional)" className="bg-zinc-800 border-zinc-700" value={guestDetails.notes} onChange={e => setGuestDetails({ ...guestDetails, notes: e.target.value })} />
            </div>

            <div className="flex gap-2 mt-4">
                <Button variant="ghost" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-500" onClick={submitBooking} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Booking"}
                </Button>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-white">Booking Confirmed!</h3>
                <p className="text-zinc-500 mt-1">Ref: {confirmedRes?.id?.split('-')[0]}</p>
                <p className="text-zinc-400 mt-2">
                    We'll see you on <b>{date}</b> at <b>{selectedSlot}</b>.
                </p>
            </div>
            <Button className="w-full mt-6" variant="outline" onClick={() => window.location.reload()}>Make Another</Button>
        </div>
    );

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-white shadow-2xl">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="tracking-tight text-2xl font-black uppercase">Reserve a Table</CardTitle>
                    <CardDescription>
                        {source === 'google_maps' && <span className="text-blue-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> Book with Google</span>}
                        {!source && <span className="text-zinc-500">Live Availability</span>}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                </CardContent>
            </Card>
        </div>
    );
}