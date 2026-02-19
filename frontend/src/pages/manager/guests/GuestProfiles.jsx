import React, { useState } from 'react';
import {
    User, Heart, ShoppingBag, TrendingUp, Star,
    Calendar, Tag, Loader2, Database, ChevronRight,
    ArrowUpRight, ArrowDownRight, Clock, Utensils,
    Phone, Mail, MapPin, Filter
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVenue } from '../../../context/VenueContext';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import api from '../../../lib/api';
import PermissionGate from '../../../components/shared/PermissionGate';
import { useAuditLog } from '../../../hooks/useAuditLog';

/**
 * 👤 Guest Profile CDP — Rule 51: Link every order to a Guest Profile
 * Customer Data Platform flywheel with taste tags, visit frequency, churn risk.
 */
export default function GuestProfiles() {
    const { currentVenue } = useVenue();
    const { user, isManager, isOwner } = useAuth();
    const venueId = currentVenue?.id || localStorage.getItem('currentVenueId') || 'default';
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [selectedGuest, setSelectedGuest] = useState(null);
    const { logAction } = useAuditLog();

    // Audit: GDPR requirement — log who accessed guest PII
    React.useEffect(() => {
        if (user?.id && venueId) {
            logAction('GUEST_PII_ACCESSED', 'guest_profiles', venueId);
        }
    }, [user?.id, venueId]);

    const { data: guests = [], isLoading } = useQuery({
        queryKey: ['cdp-guests', venueId],
        queryFn: async () => {
            const { data } = await api.get(`/crm/guests?venue_id=${venueId}`);
            return data;
        }
    });

    const { data: guestDetail, isLoading: loadingDetail } = useQuery({
        queryKey: ['cdp-guest-360', selectedGuest?.id],
        queryFn: async () => {
            const { data } = await api.get(`/crm/guests/${selectedGuest.id}/360?venue_id=${venueId}`);
            return data;
        },
        enabled: !!selectedGuest?.id
    });

    const filtered = guests.filter(g =>
        (g.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (g.email || '').toLowerCase().includes(search.toLowerCase())
    );

    const riskColor = (risk) => {
        if (risk === 'high') return 'text-red-500 bg-red-500/10';
        if (risk === 'medium') return 'text-amber-500 bg-amber-500/10';
        return 'text-emerald-500 bg-emerald-500/10';
    };

    const tierColor = (tier) => {
        if (tier === 'vip') return 'text-yellow-400 bg-yellow-400/10';
        if (tier === 'regular') return 'text-blue-400 bg-blue-400/10';
        return 'text-zinc-400 bg-zinc-500/10';
    };

    return (
        <PermissionGate requiredRole="MANAGER">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <User className="w-6 h-6 text-violet-500" />
                            Guest Profiles
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Customer Data Platform — every order linked to a profile
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: 'Total Guests', value: guests.length, icon: User, color: 'text-violet-500' },
                        { label: 'VIP', value: guests.filter(g => g.tier === 'vip').length, icon: Star, color: 'text-yellow-400' },
                        { label: 'High Risk', value: guests.filter(g => g.churn_risk === 'high').length, icon: TrendingUp, color: 'text-red-500' },
                        { label: 'Avg Visits', value: guests.length > 0 ? Math.round(guests.reduce((s, g) => s + (g.visit_count || 0), 0) / guests.length) : 0, icon: Calendar, color: 'text-blue-500' },
                    ].map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <Card key={i} className="p-4 bg-card border-border">
                                <div className="flex items-center gap-2">
                                    <Icon className={cn("w-4 h-4", stat.color)} />
                                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                                </div>
                                <div className="text-2xl font-bold text-foreground mt-1">{stat.value}</div>
                            </Card>
                        );
                    })}
                </div>

                {/* Search */}
                <div className="flex gap-3">
                    <Input
                        placeholder="Search guests by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-background border-border text-foreground flex-1"
                    />
                </div>

                <div className="grid grid-cols-3 gap-6">
                    {/* Guest List */}
                    <div className="col-span-2 space-y-2">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <Card className="p-8 bg-card border-border text-center">
                                <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">No guests found. Guests are created automatically from orders.</p>
                            </Card>
                        ) : (
                            filtered.map(guest => (
                                <Card
                                    key={guest.id}
                                    onClick={() => setSelectedGuest(guest)}
                                    className={cn(
                                        "p-4 bg-card border-border cursor-pointer transition-all hover:border-violet-500/30",
                                        selectedGuest?.id === guest.id ? "border-violet-500 ring-1 ring-violet-500/20" : ""
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                                                <span className="text-violet-500 font-bold text-sm">
                                                    {(guest.name || '?')[0].toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">{guest.name || 'Unknown'}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                    {guest.email && <span>{guest.email}</span>}
                                                    {guest.phone && <span>• {guest.phone}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {guest.tier && (
                                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded capitalize", tierColor(guest.tier))}>
                                                    {guest.tier}
                                                </span>
                                            )}
                                            {guest.churn_risk && (
                                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded", riskColor(guest.churn_risk))}>
                                                    {guest.churn_risk} risk
                                                </span>
                                            )}
                                            <span className="text-xs text-muted-foreground">{guest.visit_count || 0} visits</span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                    {/* Taste Tags */}
                                    {guest.taste_tags && guest.taste_tags.length > 0 && (
                                        <div className="flex gap-1 mt-2">
                                            {guest.taste_tags.slice(0, 5).map(tag => (
                                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            ))
                        )}
                    </div>

                    {/* Guest 360 Detail Panel */}
                    <div>
                        {selectedGuest ? (
                            <Card className="p-5 bg-card border-border sticky top-6">
                                {loadingDetail ? (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="text-center">
                                            <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto">
                                                <span className="text-violet-500 font-bold text-xl">
                                                    {(guestDetail?.name || selectedGuest.name || '?')[0].toUpperCase()}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-foreground mt-2">{guestDetail?.name || selectedGuest.name}</h3>
                                            {guestDetail?.tier && (
                                                <span className={cn("text-xs px-2 py-0.5 rounded capitalize mt-1 inline-block", tierColor(guestDetail.tier))}>
                                                    {guestDetail.tier}
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            {guestDetail?.email && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Mail className="w-3.5 h-3.5" /> {guestDetail.email}
                                                </div>
                                            )}
                                            {guestDetail?.phone && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Phone className="w-3.5 h-3.5" /> {guestDetail.phone}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-muted/30 rounded p-2 text-center">
                                                <div className="text-lg font-bold text-foreground">{guestDetail?.visit_count || 0}</div>
                                                <div className="text-[10px] text-muted-foreground">Visits</div>
                                            </div>
                                            <div className="bg-muted/30 rounded p-2 text-center">
                                                <div className="text-lg font-bold text-foreground">
                                                    €{((guestDetail?.total_spent || 0) / 100).toFixed(0)}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">Total Spent</div>
                                            </div>
                                        </div>

                                        {guestDetail?.taste_tags && guestDetail.taste_tags.length > 0 && (
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Taste Profile</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {guestDetail.taste_tags.map(tag => (
                                                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-violet-500/10 text-violet-400 rounded">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {guestDetail?.recent_orders && guestDetail.recent_orders.length > 0 && (
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Recent Orders</div>
                                                <div className="space-y-1">
                                                    {guestDetail.recent_orders.slice(0, 5).map((order, i) => (
                                                        <div key={i} className="flex items-center justify-between text-xs">
                                                            <span className="text-foreground">{order.description || `Order #${order.id?.slice(-4)}`}</span>
                                                            <span className="text-muted-foreground">€{((order.total || 0) / 100).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        ) : (
                            <Card className="p-8 bg-card border-border text-center">
                                <User className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">Select a guest to view 360° profile</p>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </PermissionGate >
    );
}
