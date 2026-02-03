import React, { useState, useEffect } from 'react';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, ArrowRight } from 'lucide-react';
import { format, addHours, startOfDay, addDays } from 'date-fns';

export default function ReservationTimeline() {
    const { activeVenue } = useVenue();
    const [viewDate, setViewDate] = useState(new Date());
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hours, setHours] = useState([]);

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
            console.error('Failed to load reservations:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer
            title="Operational Timeline"
            description="Real-time reservation flow and table occupancy"
            actions={
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setViewDate(addDays(viewDate, -1))}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="px-4 py-2 bg-zinc-900 border border-white/5 rounded-md text-xs font-black uppercase text-white">
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
                    {[
                        { label: 'Total Covers', value: '142', icon: Users, color: 'text-blue-500' },
                        { label: 'Upcoming', value: '12', icon: Clock, color: 'text-orange-500' },
                        { label: 'Seated', value: '8', icon: CheckCircle, color: 'text-green-500' },
                        { label: 'Waitlist', value: '3', icon: ArrowRight, color: 'text-purple-500' }
                    ].map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <Card key={i} className="bg-zinc-950 border-white/5 shadow-xl">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{s.label}</p>
                                        <p className="text-2xl font-black text-white">{s.value}</p>
                                    </div>
                                    <Icon className={`w-8 h-8 ${s.color} opacity-20`} />
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Timeline Grid */}
                <Card className="bg-zinc-950 border-white/5 shadow-2xl overflow-hidden">
                    <CardContent className="p-0 overflow-x-auto">
                        <div className="min-w-[1200px]">
                            {/* Header */}
                            <div className="flex bg-zinc-900 border-b border-white/5">
                                <div className="w-48 p-4 border-r border-white/5 text-[10px] font-black text-zinc-500 uppercase">Table / Section</div>
                                {hours.map(h => (
                                    <div key={h} className="flex-1 p-4 text-center border-r border-white/5 text-xs font-black text-white">{h}</div>
                                ))}
                            </div>

                            {/* Data Rows */}
                            {loading ? (
                                <div className="p-8 text-center text-zinc-500 font-black uppercase text-xs animate-pulse">Synchronizing Timeline...</div>
                            ) : reservations.length === 0 ? (
                                <div className="p-12 text-center text-zinc-600 italic font-bold">No operational data for this date</div>
                            ) : (
                                reservations.map((res, idx) => (
                                    <div key={res.id || idx} className="flex border-b border-white/5 hover:bg-white/[0.02] group">
                                        <div className="w-48 p-4 border-r border-white/5 flex flex-col">
                                            <span className="text-xs font-bold text-white uppercase">{res.table_id || `Table ${idx + 1}`}</span>
                                            <span className="text-[10px] text-zinc-500 font-medium">{res.guest_count} Pax | {res.channel}</span>
                                        </div>
                                        <div className="flex-1 relative h-16 flex">
                                            {/* Dynamic Reservation Block */}
                                            <div
                                                className="absolute top-2 h-12 bg-red-600/20 border border-red-500/40 rounded-lg p-2 flex flex-col justify-center cursor-pointer hover:bg-red-600/30 transition-all z-10"
                                                style={{
                                                    left: `${res.datetime_start ? ((parseInt(res.datetime_start.split('T')[1].split(':')[0]) - 17) * 60 + parseInt(res.datetime_start.split('T')[1].split(':')[1])) / 4.8 : 0}%`,
                                                    width: '15%'
                                                }}
                                            >
                                                <span className="text-[10px] font-black text-white uppercase truncate">{res.guest_name || 'Guest'}</span>
                                                <span className="text-[9px] text-red-400 font-bold uppercase tracking-tight">
                                                    {res.datetime_start ? res.datetime_start.split('T')[1].substring(0, 5) : ''} • {res.status}
                                                </span>
                                            </div>

                                            {/* Grid markings */}
                                            {hours.map(h => (
                                                <div key={h} className="flex-1 border-r border-white/5 opacity-20"></div>
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
    );
}

// Mocked missing icon
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
