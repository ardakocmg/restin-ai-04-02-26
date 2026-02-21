/**
 * StaffScheduler.tsx — K-Series Staff Scheduling
 * Weekly shift management with drag-and-drop scheduling
 * Lightspeed K-Series Back Office > Staff > Scheduling parity
 */
import React, { useState, useMemo } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Clock, DollarSign, Users, RefreshCw, Download, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
// import { useShiftService } from '../../hooks/useShiftService';
// import { useStaffService } from '../../hooks/useStaffService';
import './pos-shared.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ROLE_COLORS: Record<string, string> = { Manager: '#3B82F6', Waiter: '#10B981', Bartender: '#F59E0B', Chef: '#EF4444', Host: '#8B5CF6', Runner: '#EC4899', Cashier: '#06B6D4' };

interface StaffMember { id: string; name: string; role: string; avatar: string; shifts: Record<string, { start: string; end: string } | null>; }

const SEED: StaffMember[] = [
    { id: '1', name: 'Maria Borg', role: 'Manager', avatar: 'MB', shifts: { Mon: { start: '08:00', end: '16:00' }, Tue: { start: '08:00', end: '16:00' }, Wed: { start: '08:00', end: '16:00' }, Thu: { start: '08:00', end: '16:00' }, Fri: { start: '08:00', end: '16:00' }, Sat: null, Sun: null } },
    { id: '2', name: 'Stefan Camilleri', role: 'Waiter', avatar: 'SC', shifts: { Mon: { start: '10:00', end: '18:00' }, Tue: null, Wed: { start: '10:00', end: '18:00' }, Thu: { start: '10:00', end: '18:00' }, Fri: { start: '16:00', end: '00:00' }, Sat: { start: '16:00', end: '00:00' }, Sun: null } },
    { id: '3', name: 'Joseph Zammit', role: 'Chef', avatar: 'JZ', shifts: { Mon: { start: '06:00', end: '14:00' }, Tue: { start: '06:00', end: '14:00' }, Wed: { start: '06:00', end: '14:00' }, Thu: null, Fri: { start: '14:00', end: '22:00' }, Sat: { start: '14:00', end: '22:00' }, Sun: { start: '10:00', end: '18:00' } } },
    { id: '4', name: 'Claire Vella', role: 'Bartender', avatar: 'CV', shifts: { Mon: null, Tue: { start: '16:00', end: '00:00' }, Wed: { start: '16:00', end: '00:00' }, Thu: { start: '16:00', end: '00:00' }, Fri: { start: '18:00', end: '02:00' }, Sat: { start: '18:00', end: '02:00' }, Sun: null } },
    { id: '5', name: 'David Micallef', role: 'Waiter', avatar: 'DM', shifts: { Mon: null, Tue: { start: '10:00', end: '18:00' }, Wed: null, Thu: { start: '10:00', end: '18:00' }, Fri: { start: '10:00', end: '18:00' }, Sat: { start: '10:00', end: '18:00' }, Sun: { start: '10:00', end: '18:00' } } },
    { id: '6', name: 'Daniela Grech', role: 'Host', avatar: 'DG', shifts: { Mon: { start: '11:00', end: '15:00' }, Tue: { start: '11:00', end: '15:00' }, Wed: { start: '11:00', end: '15:00' }, Thu: { start: '11:00', end: '15:00' }, Fri: { start: '17:00', end: '23:00' }, Sat: { start: '17:00', end: '23:00' }, Sun: null } },
];

const getHours = (s: { start: string; end: string }): number => {
    const [sh, sm] = s.start.split(':').map(Number);
    const [eh, em] = s.end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60;
    return diff / 60;
};

const StaffScheduler: React.FC = () => {
    const navigate = useNavigate();
    const [staff] = useState(SEED);
    const [weekOffset, setWeekOffset] = useState(0);

    const weekStart = useMemo(() => {
        const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1 + weekOffset * 7); return d;
    }, [weekOffset]);

    const weekLabel = useMemo(() => {
        const end = new Date(weekStart); end.setDate(end.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }, [weekStart]);

    const totalHours = staff.reduce((sum, s) => sum + DAYS.reduce((ds, d) => ds + (s.shifts[d] ? getHours(s.shifts[d]!) : 0), 0), 0);
    const totalCost = totalHours * 12; // avg €12/hr

    return (
        <div className="pos-page"><div className="pos-container pos-container--1200">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn pos-btn--outline" style={{ marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Staff Scheduling</h1> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>{staff.length} staff · {totalHours.toFixed(0)}h this week · ~€{totalCost.toFixed(0)} est.</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
                </div>
                <div style={{ display: 'flex', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <button className="pos-btn pos-btn--outline" onClick={() => toast.info('Export coming soon')}><Download size={14} /></button>
                    <button className="pos-btn pos-btn--primary" onClick={() => toast.info('Add shift modal coming soon')}><Plus size={16} /> Add Shift</button>
                </div>
            </div>

            {/* Week Navigator */}
            <div className="pos-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', marginBottom: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <button className="pos-btn pos-btn--outline" style={{ padding: '6px 10px' }} onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft size={16} /></button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <Calendar size={16} style={{ color: '#3B82F6' }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{weekLabel}</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    {weekOffset !== 0 && <button style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 12 }} onClick={() => setWeekOffset(0)}>Today</button>} /* keep-inline */ /* keep-inline */ /* keep-inline */
                </div>
                <button className="pos-btn pos-btn--outline" style={{ padding: '6px 10px' }} onClick={() => setWeekOffset(w => w + 1)}><ChevronRight size={16} /></button> /* keep-inline */ /* keep-inline */ /* keep-inline */
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                {[{ l: 'Staff', v: staff.length.toString(), c: '#3B82F6', i: <Users size={16} /> }, { l: 'Total Hours', v: `${totalHours.toFixed(0)}h`, c: '#10B981', i: <Clock size={16} /> }, { l: 'Est. Cost', v: `€${totalCost.toFixed(0)}`, c: '#F59E0B', i: <DollarSign size={16} /> }, { l: 'Avg/Person', v: `${(totalHours / staff.length).toFixed(1)}h`, c: '#8B5CF6', i: <Clock size={16} /> }].map((s, i) => (
                    <div key={i} className="pos-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: `${s.c}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.c }}>{s.i}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div><div style={{ fontSize: 18, fontWeight: 700 }}>{s.v}</div><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.l}</div></div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    </div>
                ))}
            </div>

            {/* Schedule Grid */}
            <div className="pos-card" style={{ padding: 0, overflow: 'auto' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-primary,#27272a)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, position: 'sticky', left: 0, background: 'var(--card-bg,#18181b)', zIndex: 2, minWidth: 160 }}>Staff Member</th>
                            {DAYS.map(d => <th key={d} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, minWidth: 100 }}>{d}</th>)} /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, minWidth: 70 }}>Total</th> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </tr>
                    </thead>
                    <tbody>
                        {staff.map(member => {
                            const weekHrs = DAYS.reduce((s, d) => s + (member.shifts[d] ? getHours(member.shifts[d]!) : 0), 0);
                            return (
                                <tr key={member.id} style={{ borderBottom: '1px solid var(--border-primary,#27272a)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <td style={{ padding: '10px 14px', position: 'sticky', left: 0, background: 'var(--card-bg,#18181b)', zIndex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${ROLE_COLORS[member.role] || '#3B82F6'}20`, color: ROLE_COLORS[member.role] || '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{member.avatar}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                            <div><div style={{ fontWeight: 600, fontSize: 13 }}>{member.name}</div><div style={{ fontSize: 10, color: ROLE_COLORS[member.role] || 'var(--text-secondary)' }}>{member.role}</div></div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        </div>
                                    </td>
                                    {DAYS.map(d => {
                                        const shift = member.shifts[d];
                                        return <td key={d} style={{ padding: '6px 4px', textAlign: 'center' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                            {shift ? <div style={{ background: `${ROLE_COLORS[member.role] || '#3B82F6'}18`, color: ROLE_COLORS[member.role] || '#3B82F6', padding: '5px 6px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                                {shift.start}–{shift.end}<br /><span style={{ fontSize: 9, opacity: 0.7 }}>{getHours(shift)}h</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                            </div> : <div style={{ color: 'var(--text-secondary)', opacity: 0.3, fontSize: 18 }}>—</div>} /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        </td>;
                                    })}
                                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, color: weekHrs > 40 ? '#EF4444' : 'var(--text-primary,#fafafa)' }}>{weekHrs}h</td> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div></div>
    );
};

export default StaffScheduler;
