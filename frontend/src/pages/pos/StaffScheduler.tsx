/**
 * StaffScheduler.tsx — K-Series Staff Shift Scheduler
 * Weekly shift scheduling for POS staff
 * Lightspeed K-Series Back Office > Staff > Schedule parity
 * 
 * WIRED TO: /api/venues/{venueId}/shifts (useShiftService)
 *           /api/venues/{venueId}/staff  (useStaffService)
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Users, Clock, DollarSign, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useShiftService } from '../../hooks/shared/useShiftService';
import { useStaffService } from '../../hooks/shared/useStaffService';
import authStore from '../../lib/AuthStore';

/* ── local types ─── */
interface LocalShift {
    id: string;
    staff: string;
    staffId: string;
    day: number;
    startHour: number;
    endHour: number;
    role: string;
    color: string;
}

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ROLE_COLORS: Record<string, string> = {
    Server: '#3B82F6', Bartender: '#8B5CF6', Host: '#EC4899',
    Kitchen: '#F59E0B', Manager: '#EF4444', Cashier: '#10B981',
};
const ROLES = Object.entries(ROLE_COLORS).map(([name, color]) => ({ name, color }));

/* ── helper: map API shift to local ─── */
function apiShiftToLocal(s: { id: string; user_id?: string; user_name?: string; start_time: string; end_time: string; role?: string }, staffNames: Map<string, string>): LocalShift {
    const start = new Date(s.start_time);
    const end = new Date(s.end_time);
    const name = s.user_name || staffNames.get(s.user_id || '') || 'Unknown';
    const role = s.role || 'Server';
    return {
        id: s.id,
        staff: name,
        staffId: s.user_id || '',
        day: (start.getDay() + 6) % 7, // Mon=0
        startHour: start.getHours(),
        endHour: end.getHours(),
        role,
        color: ROLE_COLORS[role] || '#3B82F6',
    };
}

const StaffScheduler: React.FC = () => {
    const navigate = useNavigate();
    const [weekOffset, setWeekOffset] = useState(0);
    const [localShifts, setLocalShifts] = useState<LocalShift[]>([]);
    const [staffList, setStaffList] = useState<string[]>([]);

    // Get venueId
    const venueId = localStorage.getItem('restin_pos_venue') || authStore.getUser()?.venue_id || '';

    // Wire to real APIs
    const { shifts, loading: shiftsLoading, error: shiftsError, refetch: refetchShifts } = useShiftService({
        venueId,
        weekOffset,
        enabled: !!venueId,
    });

    const { staff, loading: staffLoading } = useStaffService({
        venueId,
        includePos: false,
        enabled: !!venueId,
    });

    // Build name lookup
    const staffNames = useMemo(() => {
        const map = new Map<string, string>();
        staff.forEach(s => map.set(s.id, s.name));
        return map;
    }, [staff]);

    // Sync API data → local state
    useEffect(() => {
        if (shifts.length > 0) {
            const mapped = shifts.map(s => apiShiftToLocal(s as unknown as Parameters<typeof apiShiftToLocal>[0], staffNames));
            setLocalShifts(mapped);
            const uniqueStaff = Array.from(new Set(mapped.map(s => s.staff)));
            setStaffList(uniqueStaff);
        } else if (staff.length > 0 && shifts.length === 0) {
            // No shifts yet but staff exists — show staff names with empty schedule
            setStaffList(staff.map(s => s.name));
            setLocalShifts([]);
        }
    }, [shifts, staff, staffNames]);

    const loading = shiftsLoading || staffLoading;

    const getStaffShifts = useCallback(
        (staffName: string, day: number) => localShifts.filter(s => s.staff === staffName && s.day === day),
        [localShifts]
    );

    const totalHours = useCallback(
        (staffName: string) => localShifts.filter(s => s.staff === staffName).reduce((acc, s) => {
            const h = s.endHour > s.startHour ? s.endHour - s.startHour : 24 - s.startHour + s.endHour;
            return acc + h;
        }, 0),
        [localShifts]
    );

    const totalStaffHours = useMemo(
        () => staffList.reduce((sum, name) => sum + totalHours(name), 0),
        [staffList, totalHours]
    );

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Staff Scheduler</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>
                        Weekly shift planning for all roles
                        {venueId && <span style={{ marginLeft: 8, fontSize: 11, color: '#10B981' }}>● Live</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button style={{ ...bo, padding: '8px 12px' }} onClick={() => setWeekOffset(p => p - 1)} title="Previous week"><ChevronLeft size={14} /></button>
                    <span style={{ fontSize: 13, fontWeight: 500, minWidth: 120, textAlign: 'center' }}>Week {weekOffset === 0 ? '(Current)' : weekOffset > 0 ? `+${weekOffset}` : weekOffset}</span>
                    <button style={{ ...bo, padding: '8px 12px' }} onClick={() => setWeekOffset(p => p + 1)} title="Next week"><ChevronRight size={14} /></button>
                    <button style={{ ...bo, padding: '8px 12px' }} onClick={() => refetchShifts()} title="Refresh shifts"><RefreshCw size={14} /></button>
                    <button style={bp} onClick={() => toast.success('Schedule published')}><Plus size={14} /> Publish</button>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div style={{ ...cd, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40 }}>
                    <Loader2 size={18} className="animate-spin" style={{ color: '#3B82F6' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Loading shifts from API...</span>
                </div>
            )}

            {/* Error Banner */}
            {shiftsError && (
                <div style={{ ...cd, borderColor: '#EF4444', padding: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#EF4444', fontSize: 13 }}>⚠ {shiftsError}</span>
                    <button style={{ ...bo, padding: '6px 14px', fontSize: 12 }} onClick={() => refetchShifts()}>Retry</button>
                </div>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                {[
                    { l: 'Staff Scheduled', v: staffList.length.toString(), c: '#3B82F6', i: <Users size={16} /> },
                    { l: 'Total Hours', v: totalStaffHours.toString(), c: '#10B981', i: <Clock size={16} /> },
                    { l: 'Est. Labor Cost', v: `€${(totalStaffHours * 12.5).toFixed(0)}`, c: '#F59E0B', i: <DollarSign size={16} /> },
                ].map((s, i) => (
                    <div key={i} style={{ ...cd, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.c}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.c }}>{s.i}</div>
                        <div><div style={{ fontSize: 20, fontWeight: 700 }}>{s.v}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.l}</div></div>
                    </div>
                ))}
            </div>

            {/* Schedule Grid */}
            {!loading && (
                <div style={{ ...cd, padding: 0, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.06)', width: 140 }}>Staff</th>
                                {DAYS.map(d => <th key={d} style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{d}</th>)}
                                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.06)', width: 60 }}>Hrs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffList.length === 0 && (
                                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                                    No staff or shifts found. {!venueId && 'Please select a venue first.'}
                                </td></tr>
                            )}
                            {staffList.map(staffName => (
                                <tr key={staffName}>
                                    <td style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 14, fontWeight: 500 }}>{staffName}</td>
                                    {DAYS.map((_, dayIdx) => {
                                        const dayShifts = getStaffShifts(staffName, dayIdx);
                                        return (
                                            <td key={dayIdx} style={{ padding: '6px 4px', borderBottom: '1px solid rgba(255,255,255,0.03)', textAlign: 'center', verticalAlign: 'middle' }}>
                                                {dayShifts.map(s => (
                                                    <div key={s.id} style={{ background: `${s.color}15`, border: `1px solid ${s.color}30`, borderRadius: 6, padding: '4px 6px', fontSize: 10, color: s.color, margin: '2px 0', fontWeight: 500 }}>
                                                        {`${s.startHour}:00-${s.endHour}:00`}
                                                    </div>
                                                ))}
                                                {dayShifts.length === 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.1)' }}>—</span>}
                                            </td>
                                        );
                                    })}
                                    <td style={{ padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.03)', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{totalHours(staffName)}h</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Role Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {ROLES.map(r => (<div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}><div style={{ width: 10, height: 10, borderRadius: 2, background: r.color }} />{r.name}</div>))}
            </div>
        </div></div>
    );
};

export default StaffScheduler;
