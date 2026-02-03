import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Users, Heart, Star, Clock, CreditCard, ShoppingBag,
    Calendar, Phone, Mail, MapPin, Loader2, Tag, Plus
} from 'lucide-react';
import api from '@/lib/api';

export default function GuestDrawer({ open, onOpenChange, guestId }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        if (open && guestId) {
            loadGuestData();
        }
    }, [open, guestId]);

    const loadGuestData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/crm/guests/${guestId}/360`);
            setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!guestId) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl bg-zinc-950 border-white/10 text-white overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Retrieving Guest 360...</p>
                    </div>
                ) : data && (
                    <div className="space-y-8">
                        {/* Header Section */}
                        <div className="relative pt-8">
                            <div className="flex items-center gap-6">
                                <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-4xl font-black text-white shadow-2xl border border-white/20">
                                    {data.profile.first_name[0]}{data.profile.last_name[0]}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                                            {data.profile.first_name} {data.profile.last_name}
                                        </h2>
                                        {data.profile.tags.includes('VIP') && (
                                            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 text-[10px] font-black uppercase">
                                            {data.profile.loyalty?.tier || 'BRONZE'} MEMBER
                                        </Badge>
                                        <Badge className="bg-zinc-900 text-zinc-400 border-white/5 text-[10px] font-black uppercase">
                                            ID: {data.profile.id.substring(0, 8)}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 text-center">
                                <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Visits</p>
                                <p className="text-xl font-black text-white">{data.profile.visit_summary?.total_visits || 0}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 text-center">
                                <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Lifetime Spend</p>
                                <p className="text-xl font-black text-green-500">€{Math.round(data.profile.visit_summary?.total_spend || 0)}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 text-center">
                                <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Loyalty Pts</p>
                                <p className="text-xl font-black text-red-500">{Math.round(data.profile.loyalty?.points_balance || 0)}</p>
                            </div>
                        </div>

                        {/* Content Tabs */}
                        <Tabs defaultValue="history" className="w-full">
                            <TabsList className="w-full bg-zinc-900 border border-white/10 h-12 p-1">
                                <TabsTrigger value="history" className="flex-1 text-[10px] font-black uppercase">Activity</TabsTrigger>
                                <TabsTrigger value="preferences" className="flex-1 text-[10px] font-black uppercase">Preferences</TabsTrigger>
                                <TabsTrigger value="contact" className="flex-1 text-[10px] font-black uppercase">Contact</TabsTrigger>
                            </TabsList>

                            <TabsContent value="history" className="mt-6 space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <Calendar className="w-3 h-3" /> Recent Reservations
                                    </h4>
                                    {data.history.reservations?.map((res, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                            <div>
                                                <p className="text-xs font-black text-white uppercase">{new Date(res.datetime_start).toLocaleDateString()}</p>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase">{res.guest_count} Pax • {res.status}</p>
                                            </div>
                                            <Badge variant="outline" className="text-[8px] font-black border-white/10">{res.channel}</Badge>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <ShoppingBag className="w-3 h-3" /> Favorite Items
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {data.history.favorite_items?.map((item, i) => (
                                            <Badge key={i} className="bg-zinc-900 border-white/5 text-zinc-300 py-1.5 px-3">
                                                {item.name} <span className="ml-2 text-red-500 font-black">x{item.count}</span>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="preferences" className="mt-6 space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Manual Tags</h4>
                                    <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-zinc-900 border border-white/5">
                                        {data.profile.tags.map(tag => (
                                            <Badge key={tag} className="bg-red-600/20 text-red-500 border-red-500/30 uppercase text-[9px] font-black">
                                                {tag}
                                            </Badge>
                                        ))}
                                        <Button variant="outline" size="sm" className="h-6 px-2 text-[9px] font-black border-dashed">
                                            <Plus className="w-3 h-3 mr-1" /> ADD TAG
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Internal Notes</h4>
                                    <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 text-xs text-zinc-400 font-medium italic">
                                        {data.profile.internal_notes || "No internal notes for this guest."}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="contact" className="mt-6 space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900 border border-white/5">
                                        <Phone className="w-4 h-4 text-zinc-500" />
                                        <div>
                                            <p className="text-[8px] font-black text-zinc-500 uppercase">Phone Number</p>
                                            <p className="text-sm font-black text-white">{data.profile.contact_info.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900 border border-white/5">
                                        <Mail className="w-4 h-4 text-zinc-500" />
                                        <div>
                                            <p className="text-[8px] font-black text-zinc-500 uppercase">Email Address</p>
                                            <p className="text-sm font-black text-white">{data.profile.contact_info.email || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="flex gap-2 pt-8">
                            <Button className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px] tracking-widest h-12">
                                Create Reservation
                            </Button>
                            <Button variant="outline" className="flex-1 font-black uppercase text-[10px] tracking-widest h-12 border-white/10">
                                Send Message
                            </Button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
