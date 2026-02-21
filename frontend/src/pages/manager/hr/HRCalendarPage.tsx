import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { Calendar, Gift, Award, AlertTriangle, FileText, Plus, ChevronLeft, ChevronRight, X, Clock, LucideIcon } from 'lucide-react';

type EventType = 'birthday' | 'anniversary' | 'probation_expiry' | 'contract_end' | 'custom';

const EVENT_ICONS: Record<EventType, LucideIcon> = { birthday: Gift, anniversary: Award, probation_expiry: AlertTriangle, contract_end: FileText, custom: Calendar };
const EVENT_COLORS: Record<EventType, string> = { birthday: '#ec4899', anniversary: '#22c55e', probation_expiry: '#f59e0b', contract_end: '#ef4444', custom: '#6366f1' };

interface CalendarEvent {
    id: string;
    title?: string;
    employee_name?: string;
    date: string;
    event_type: EventType;
    description?: string;
}

interface UpcomingEvent {
    employee?: string;
    title?: string;
    date: string;
    type: EventType;
}

interface NewEventForm {
    title: string;
    date: string;
    event_type: string;
    description: string;
}

export default function HRCalendarPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [showNewEvent, setShowNewEvent] = useState(false);
    const [newEvent, setNewEvent] = useState<NewEventForm>({ title: '', date: '', event_type: 'custom', description: '' });

    const venueId = localStorage.getItem('currentVenueId');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const fetchEvents = useCallback(async () => {
        if (!venueId) return;
        setLoading(true);
        try {
            const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
            const [evRes, upRes] = await Promise.all([
                api.get(`/venues/${venueId}/hr/calendar/events?month=${monthStr}`),
                api.get(`/venues/${venueId}/hr/calendar/upcoming?days=30`),
            ]);
            setEvents(evRes.data || []);
            const upData = upRes.data;
            setUpcoming(upData?.alerts || upData || []);
        } catch (e) { logger.error('Failed to fetch calendar events:', e); }
        setLoading(false);
    }, [venueId, month, year]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const createEvent = async () => {
        try {
            await api.post(`/venues/${venueId}/hr/calendar/events`, newEvent);
            setShowNewEvent(false);
            setNewEvent({ title: '', date: '', event_type: 'custom', description: '' });
            fetchEvents();
        } catch (e) { logger.error('Failed to create event:', e); }
    };

    const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
    const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

    // Build calendar grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

    const getEventsForDay = (day: number | null): CalendarEvent[] => {
        if (!day) return [];
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(e => (e.date || '').startsWith(dateStr));
    };

    /* No full-page spinner — calendar renders immediately */

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Calendar size={28} style={{ color: '#6366f1' }} /> HR Calendar
                    </h1>
                    <p style={{ color: '#64748b', marginTop: 4 }}>Birthdays, anniversaries, probation expiry & custom events</p>
                </div>
                <button onClick={() => setShowNewEvent(true)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={16} /> Add Event
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
                {/* Calendar Grid */}
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <button onClick={prevMonth} style={{ background: '#1e293b', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#94a3b8', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
                        <h3 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 600, margin: 0 }}>{monthNames[month]} {year}</h3>
                        <button onClick={nextMonth} style={{ background: '#1e293b', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#94a3b8', cursor: 'pointer' }}><ChevronRight size={18} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} style={{ textAlign: 'center', padding: 8, color: '#64748b', fontSize: 12, fontWeight: 600 }}>{d}</div>
                        ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                        {calendarDays.map((day, i) => {
                            const dayEvents = getEventsForDay(day);
                            const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                            return (
                                <div key={i} style={{ background: isToday ? '#1e293b' : day ? '#0f172a' : 'transparent', border: isToday ? '2px solid #6366f1' : '1px solid #1e293b22', borderRadius: 8, minHeight: 70, padding: 6 }}>
                                    {day && (
                                        <>
                                            <div style={{ color: isToday ? '#6366f1' : '#94a3b8', fontSize: 13, fontWeight: isToday ? 700 : 400 }}>{day}</div>
                                            {dayEvents.slice(0, 2).map((ev, j) => {
                                                const color = EVENT_COLORS[ev.event_type] || '#6366f1';
                                                return <div key={j} style={{ background: color + '22', color, fontSize: 10, padding: '2px 4px', borderRadius: 4, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title || ev.employee_name}</div>;
                                            })}
                                            {dayEvents.length > 2 && <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>+{dayEvents.length - 2} more</div>}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Upcoming Events Sidebar */}
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
                    <h3 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600, marginBottom: 16, margin: '0 0 16px' }}>Upcoming (30 days)</h3>
                    {upcoming.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>No upcoming events</p>
                    ) : upcoming.map((ev, i) => {
                        const Icon = EVENT_ICONS[ev.type] || Calendar;
                        const color = EVENT_COLORS[ev.type] || '#6366f1';
                        return (
                            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e293b' }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Icon size={18} style={{ color }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.employee || ev.title}</div>
                                    <div style={{ color: '#64748b', fontSize: 12 }}>{ev.date} • {ev.type?.replace('_', ' ')}</div>
                                </div>
                            </div>
                        );
                    })}
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
                        <h4 style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 8, margin: '0 0 8px' }}>Event Types</h4>
                        {(Object.entries(EVENT_COLORS) as [EventType, string][]).map(([type, color]) => (
                            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                                <span style={{ color: '#94a3b8', fontSize: 12, textTransform: 'capitalize' }}>{type.replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* New Event Modal */}
            {showNewEvent && (
                <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 32, width: 440 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 600, margin: 0 }}>Add Custom Event</h2>
                            <button onClick={() => setShowNewEvent(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        {[{ f: 'title' as const, t: 'text' }, { f: 'date' as const, t: 'date' }, { f: 'description' as const, t: 'text' }].map(({ f, t }) => (
                            <div key={f} style={{ marginBottom: 16 }}>
                                <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6, textTransform: 'capitalize' }}>{f}</label>
                                <input type={t} value={newEvent[f]} onChange={e => setNewEvent(p => ({ ...p, [f]: e.target.value }))} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14 }} />
                            </div>
                        ))}
                        <button onClick={createEvent} style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Create Event</button>
                    </div>
                </div>
            )}
        </div>
    );
}
