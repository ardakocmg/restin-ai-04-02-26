import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useVenue } from '@/context/VenueContext';
import { useAuth } from '@/context/AuthContext';

import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';

import api from '@/lib/api';

import PageContainer from '@/layouts/PageContainer';

import { Card, CardContent } from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';

import { Calendar, ChevronLeft, ChevronRight, Clock, Users, ArrowRight } from 'lucide-react';

import { format, addHours, startOfDay, addDays } from 'date-fns';

export default function ReservationTimeline() {
    const { activeVenue } = useVenue();
    const { user, isManager, isOwner } = useAuth();
    const [viewDate, setViewDate] = useState(new Date());
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hours, setHours] = useState([]);
    const { logAction } = useAuditLog();

    // Audit: log who viewed reservations
    useEffect(() => {
        if (user?.id && activeVenue?.id) {
            logAction('RESERVATIONS_VIEWED', 'reservation_timeline', activeVenue.id);
        }
    }, [user?.id, activeVenue?.id]);

    useEffect(() => {
        // Generate hours for the timeline (17:00 to 01:00)
        const dayStart = startOfDay(viewDate);
        const timeGrid = [];
        for (let i = 17; i < 25; i++) {
            timeGrid.push(format(addHours(dayStart, i), 'HH:00'));
        }
        setHours(timeGrid);

        if (activeVenue?.id) {
            loadReservations();
        }
    }, [activeVenue?.id, viewDate]);

    const loadReservations = async () => {
        setLoading(true);
        try {
            // In a real app, query by date
            const response = await api.get(`/venues/${activeVenue.id}/reservations`);
            setReservations(response.data);
        } catch (error) {
            logger.error('Failed to load reservations:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PermissionGate requiredRole="MANAGER">
            <PageContainer
                title="Operational Timeline"
                description="Real-time reservation flow and table occupancy"
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setViewDate(addDays(viewDate, -1))}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="px-4 py-2 bg-muted dark:bg-card border border-border dark:border-border rounded-md text-xs font-black uppercase text-foreground dark:text-foreground">
                            {format(viewDate, 'EEEE, MMM do')}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setViewDate(addDays(viewDate, 1))}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-4 gap-4">
                        {(() => {
                            const totalCovers = reservations.reduce((sum, r) => sum + (r.guest_count || 0), 0);
                            const upcoming = reservations.filter(r => r.status === 'confirmed' || r.status === 'pending').length;
                            const seated = reservations.filter(r => r.status === 'seated' || r.status === 'in_progress').length;
                            const waitlist = reservations.filter(r => r.status === 'waitlist').length;
                            return [
                                { label: 'Total Covers', value: totalCovers, icon: Users, color: 'text-blue-600 dark:text-blue-400' },
                                { label: 'Upcoming', value: upcoming, icon: Clock, color: 'text-orange-600 dark:text-orange-400' },
                                { label: 'Seated', value: seated, icon: CheckCircle, color: 'text-green-600 dark:text-green-400' },
                                { label: 'Waitlist', value: waitlist, icon: ArrowRight, color: 'text-purple-600 dark:text-purple-400' }
                            ];
                        })().map((s, i) => {
                            const Icon = s.icon;
                            return (
                                <Card key={i} className="bg-white dark:bg-background border-border dark:border-border shadow-xl">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-muted-foreground dark:text-muted-foreground uppercase tracking-widest">{s.label}</p>
                                            <p className="text-2xl font-black text-foreground dark:text-foreground">{s.value}</p>
                                        </div>
                                        <Icon className={`w-8 h-8 ${s.color} opacity-20`} />
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Timeline Grid */}
                    <Card className="bg-white dark:bg-background border-border dark:border-border shadow-2xl overflow-hidden">
                        <CardContent className="p-0 overflow-x-auto">
                            <div className="min-w-[1200px]">
                                {/* Header */}
                                <div className="flex bg-muted dark:bg-card border-b border-border dark:border-border">
                                    <div className="w-48 p-4 border-r border-border dark:border-border text-[10px] font-black text-muted-foreground uppercase">Table / Section</div>
                                    {hours.map(h => (
                                        <div key={h} className="flex-1 p-4 text-center border-r border-border dark:border-border text-xs font-black text-foreground dark:text-foreground">{h}</div>
                                    ))}
                                </div>

                                {/* Data Rows */}
                                {loading ? (
                                    <div className="p-8 text-center text-muted-foreground font-black uppercase text-xs animate-pulse">Synchronizing Timeline...</div>
                                ) : reservations.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground italic font-bold">{"No "}operational data for this date</div>
                                ) : (
                                    reservations.map((res, idx) => (
                                        <div key={res.id || idx} className="flex border-b border-border dark:border-border hover:bg-zinc-50 dark:hover:bg-white/[0.02] group">
                                            <div className="w-48 p-4 border-r border-border dark:border-border flex flex-col">
                                                <span className="text-xs font-bold text-foreground dark:text-foreground uppercase">{res.table_id || `Table ${idx + 1}`}</span>
                                                <span className="text-[10px] text-muted-foreground font-medium">{res.guest_count} Pax | {res.channel}</span>
                                            </div>
                                            <div className="flex-1 relative h-16 flex">
                                                {/* Dynamic Reservation Block */}
                                                <div
                                                    className="absolute top-2 h-12 bg-red-100 dark:bg-red-600/20 border border-red-200 dark:border-red-500/40 rounded-lg p-2 flex flex-col justify-center cursor-pointer hover:bg-red-200 dark:hover:bg-red-600/30 transition-all z-10"
                                                    style={{ /* keep-inline */ /* keep-inline */
                                                        left: `${res.datetime_start ? ((parseInt(res.datetime_start.split('T')[1].split(':')[0]) - 17) * 60 + parseInt(res.datetime_start.split('T')[1].split(':')[1])) / 4.8 : 0}%`,
                                                        width: '15%'
                                                    }}
                                                >
                                                    <span className="text-[10px] font-black text-red-900 dark:text-foreground uppercase truncate">{res.guest_name || 'Guest'}</span>
                                                    <span className="text-[9px] text-red-600 dark:text-red-400 dark:text-red-400 font-bold uppercase tracking-tight">
                                                        {res.datetime_start ? res.datetime_start.split('T')[1].substring(0, 5) : ''} • {res.status}
                                                    </span>
                                                </div>

                                                {/* Grid markings */}
                                                {hours.map(h => (
                                                    <div key={h} className="flex-1 border-r border-border dark:border-border opacity-20"></div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </PageContainer>
        </PermissionGate>
    );
}
function CheckCircle(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}