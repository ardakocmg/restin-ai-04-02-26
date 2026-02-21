import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { AlertTriangle,Award,Calendar,ChevronLeft,ChevronRight,FileText,Gift,LucideIcon,Plus,X } from 'lucide-react';
import { useCallback,useEffect,useState } from 'react';

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
        } catch (e) { logger.error('Failed to fetch calendar events:', { error: String(e) }); }
        setLoading(false);
    }, [venueId, month, year]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const createEvent = async () => {
        try {
            await api.post(`/venues/${venueId}/hr/calendar/events`, newEvent);
            setShowNewEvent(false);
            setNewEvent({ title: '', date: '', event_type: 'custom', description: '' });
            fetchEvents();
        } catch (e) { logger.error('Failed to create event:', { error: String(e) }); }
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
        <div className="px-8 py-6 max-w-[1400px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-[28px] font-bold text-slate-100 m-0 flex items-center gap-2.5">
                        <Calendar size={28} className="text-indigo-400" /> HR Calendar
                    </h1>
                    <p className="text-slate-500 mt-1">Birthdays, anniversaries, probation expiry & custom events</p>
                </div>
                <button onClick={() => setShowNewEvent(true)} className="px-4 py-2 rounded-lg border-none bg-indigo-500 text-white cursor-pointer font-semibold text-[13px] flex items-center gap-1.5">
                    <Plus size={16} /> Add Event
                </button>
            </div>

            <div className="grid grid-cols-[1fr_320px] gap-6">
                {/* Calendar Grid */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={prevMonth} className="bg-slate-800 border-none rounded-lg px-3 py-1.5 text-slate-400 cursor-pointer" aria-label="Previous month"><ChevronLeft size={18} /></button>
                        <h3 className="text-slate-100 text-lg font-semibold m-0">{monthNames[month]} {year}</h3>
                        <button onClick={nextMonth} className="bg-slate-800 border-none rounded-lg px-3 py-1.5 text-slate-400 cursor-pointer" aria-label="Next month"><ChevronRight size={18} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="text-center p-2 text-slate-500 text-xs font-semibold">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                        {calendarDays.map((day, i) => {
                            const dayEvents = getEventsForDay(day);
                            const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                            return (
                                <div key={i} className={`rounded-lg min-h-[70px] p-1.5 ${isToday ? 'bg-slate-800 border-2 border-indigo-500' : day ? 'bg-slate-950 border border-slate-800/20' : 'bg-transparent border border-transparent'}`}>
                                    {day && (
                                        <>
                                            <div className={`text-[13px] ${isToday ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>{day}</div>
                                            {dayEvents.slice(0, 2).map((ev, j) => {
                                                const color = EVENT_COLORS[ev.event_type] || '#6366f1';
                                                return <div key={j} className="text-[10px] px-1 py-0.5 rounded mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis" style={{ background: color + '22', color  /* keep-inline */ }} /* keep-inline */>{ev.title || ev.employee_name}</div>; // keep-inline
                                            })}
                                            {dayEvents.length > 2 && <div className="text-slate-500 text-[10px] mt-0.5">+{dayEvents.length - 2} more</div>}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Upcoming Events Sidebar */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-slate-100 text-base font-semibold mb-4 mt-0">Upcoming (30 days)</h3>
                    {upcoming.length === 0 ? (
                        <p className="text-slate-500 text-[13px] text-center p-5">{"No "}upcoming events</p>
                    ) : upcoming.map((ev, i) => {
                        const Icon = EVENT_ICONS[ev.type] || Calendar;
                        const color = EVENT_COLORS[ev.type] || '#6366f1';
                        return (
                            <div key={i} className="flex gap-3 py-2.5 border-b border-slate-800">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '22'  /* keep-inline */ }} /* keep-inline */> {}
                                    <Icon size={18} style={{ color  /* keep-inline */ }} /* keep-inline */ /> {}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-slate-100 text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis">{ev.employee || ev.title}</div>
                                    <div className="text-slate-500 text-xs">{ev.date} • {ev.type?.replace('_', ' ')}</div>
                                </div>
                            </div>
                        );
                    })}
                    <div className="mt-5 pt-4 border-t border-slate-800">
                        <h4 className="text-slate-400 text-xs font-semibold mb-2 mt-0">Event Types</h4>
                        {(Object.entries(EVENT_COLORS) as [EventType, string][]).map(([type, color]) => (
                            <div key={type} className="flex items-center gap-2 mb-1">
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color  /* keep-inline */ }} /* keep-inline */ /> {}
                                <span className="text-slate-400 text-xs capitalize">{type.replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* New Event Modal */}
            {showNewEvent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 w-[440px]">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-slate-100 text-xl font-semibold m-0">Add Custom Event</h2>
                            <button onClick={() => setShowNewEvent(false)} className="bg-transparent border-none text-slate-500 cursor-pointer" aria-label="Close"><X size={20} /></button>
                        </div>
                        {[{ f: 'title' as const, t: 'text' }, { f: 'date' as const, t: 'date' }, { f: 'description' as const, t: 'text' }].map(({ f, t }) => (
                            <div key={f} className="mb-4">
                                <label className="text-slate-400 text-[13px] block mb-1.5 capitalize">{f}</label>
                                <input type={t} value={newEvent[f]} onChange={e => setNewEvent(p => ({ ...p, [f]: e.target.value }))} aria-label={f} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm" />
                            </div>
                        ))}
                        <button onClick={createEvent} className="w-full py-3 rounded-lg border-none bg-indigo-500 text-white font-semibold text-sm cursor-pointer">Create Event</button>
                    </div>
                </div>
            )}
        </div>
    );
}
