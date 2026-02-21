import { useAuditLog } from '@/hooks/useAuditLog';
import { logger } from '@/lib/logger';
import { useEffect, useState } from 'react';

import { Sheet, SheetContent } from '@/components/ui/sheet';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
    Calendar,
    Loader2,
    Mail,
    Phone,
    Plus,
    ShoppingBag,
    Star
} from 'lucide-react';

import api from '@/lib/api';

interface GuestProfile {
    id: string;
    first_name: string;
    last_name: string;
    tags: string[];
    loyalty?: {
        tier?: string;
        points_balance?: number;
    };
    visit_summary?: {
        total_visits?: number;
        total_spend?: number;
    };
    internal_notes?: string;
    contact_info: {
        phone: string;
        email?: string;
    };
}

interface Reservation {
    datetime_start: string;
    guest_count: number;
    status: string;
    channel: string;
}

interface FavoriteItem {
    name: string;
    count: number;
}

interface GuestHistory {
    reservations?: Reservation[];
    favorite_items?: FavoriteItem[];
}

interface GuestData {
    profile: GuestProfile;
    history: GuestHistory;
}

interface GuestDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    guestId: string | null;
}

export default function GuestDrawer({ open, onOpenChange, guestId }: GuestDrawerProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<GuestData | null>(null);
    const { logAction } = useAuditLog();

    useEffect(() => {
        if (open && guestId) {
            loadGuestData();
        }
    }, [open, guestId]);

    const loadGuestData = async () => {
        setLoading(true);
        logAction('GUEST_PROFILE_VIEWED', 'guest_drawer', guestId || undefined);
        try {
            const res = await api.get(`/crm/guests/${guestId}/360`);
            setData(res.data);
        } catch (e: unknown) {
            logger.error('Failed to load guest data', { error: String(e) });
        } finally {
            setLoading(false);
        }
    };

    if (!guestId) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl bg-background border-border text-foreground overflow-y-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <Loader2 className="w-12 h-12 text-red-600 dark:text-red-400 animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Retrieving Guest 360...</p>
                    </div>
                ) : data && (
                    <div className="space-y-8">
                        {/* Header Section */}
                        <div className="relative pt-8">
                            <div className="flex items-center gap-6">
                                <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-4xl font-black text-foreground shadow-2xl border border-white/20">
                                    {data.profile.first_name[0]}{data.profile.last_name[0]}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                                            {data.profile.first_name} {data.profile.last_name}
                                        </h2>
                                        {data.profile.tags.includes('VIP') && (
                                            <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400 fill-yellow-500" />
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 text-[10px] font-black uppercase">
                                            {data.profile.loyalty?.tier || 'BRONZE'} MEMBER
                                        </Badge>
                                        <Badge className="bg-card text-muted-foreground border-border text-[10px] font-black uppercase">
                                            ID: {data.profile.id.substring(0, 8)}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-card border border-border text-center">
                                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Visits</p>
                                <p className="text-xl font-black text-foreground">{data.profile.visit_summary?.total_visits || 0}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-card border border-border text-center">
                                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Lifetime Spend</p>
                                <p className="text-xl font-black text-green-500">€{Math.round(data.profile.visit_summary?.total_spend || 0)}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-card border border-border text-center">
                                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Loyalty Pts</p>
                                <p className="text-xl font-black text-red-500">{Math.round(data.profile.loyalty?.points_balance || 0)}</p>
                            </div>
                        </div>

                        {/* Content Tabs */}
                        <Tabs defaultValue="history" className="w-full">
                            <TabsList className="w-full bg-card border border-border h-12 p-1">
                                <TabsTrigger value="history" className="flex-1 text-[10px] font-black uppercase">Activity</TabsTrigger>
                                <TabsTrigger value="preferences" className="flex-1 text-[10px] font-black uppercase">Preferences</TabsTrigger>
                                <TabsTrigger value="contact" className="flex-1 text-[10px] font-black uppercase">Contact</TabsTrigger>
                            </TabsList>

                            <TabsContent value="history" className="mt-6 space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Calendar className="w-3 h-3" /> Recent Reservations
                                    </h4>
                                    {data.history.reservations?.map((res: Reservation, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-border">
                                            <div>
                                                <p className="text-xs font-black text-foreground uppercase">{new Date(res.datetime_start).toLocaleDateString()}</p>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase">{res.guest_count} Pax • {res.status}</p>
                                            </div>
                                            <Badge variant="outline" className="text-[8px] font-black border-border">{res.channel}</Badge>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <ShoppingBag className="w-3 h-3" /> Favorite Items
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {data.history.favorite_items?.map((item: FavoriteItem, i: number) => (
                                            <Badge key={i} className="bg-card border-border text-secondary-foreground py-1.5 px-3">
                                                {item.name} <span className="ml-2 text-red-600 dark:text-red-400 font-black">x{item.count}</span>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="preferences" className="mt-6 space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Manual Tags</h4>
                                    <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-card border border-border">
                                        {data.profile.tags.map((tag: string) => (
                                            <Badge key={tag} className="bg-red-600/20 text-red-600 dark:text-red-400 border-red-500/30 uppercase text-[9px] font-black">
                                                {tag}
                                            </Badge>
                                        ))}
                                        <Button variant="outline" size="sm" className="h-6 px-2 text-[9px] font-black border-dashed">
                                            <Plus className="w-3 h-3 mr-1" /> ADD TAG
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Internal Notes</h4>
                                    <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground font-medium italic">
                                        {data.profile.internal_notes || "No internal notes for this guest."}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="contact" className="mt-6 space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-[8px] font-black text-muted-foreground uppercase">Phone Number</p>
                                            <p className="text-sm font-black text-foreground">{data.profile.contact_info.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-[8px] font-black text-muted-foreground uppercase">Email Address</p>
                                            <p className="text-sm font-black text-foreground">{data.profile.contact_info.email || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="flex gap-2 pt-8">
                            <Button className="flex-1 bg-red-600 hover:bg-red-500 text-foreground font-black uppercase text-[10px] tracking-widest h-12">
                                Create Reservation
                            </Button>
                            <Button variant="outline" className="flex-1 font-black uppercase text-[10px] tracking-widest h-12 border-border">
                                Send Message
                            </Button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}