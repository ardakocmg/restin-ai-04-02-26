/**
 * TableTracker.tsx — K-Series Table Tracker / Live Floor View
 * Real-time table status overview for managers
 * Lightspeed K-Series Back Office > Live > Table Tracker parity
 */
import React, { useState } from 'react';
import { ArrowLeft, Clock, Users, DollarSign, RefreshCw, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'blocked';
interface TrackedTable { id: string; name: string; floor: string; status: TableStatus; guests: number; server: string; orderTotal: number; occupiedSince: string; course: string; }

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };

const STATUS_COLORS: Record<TableStatus, string> = { available: '#10B981', occupied: '#3B82F6', reserved: '#F59E0B', cleaning: '#8B5CF6', blocked: '#EF4444' };
const STATUS_BG: Record<TableStatus, string> = { available: 'rgba(16,185,129,0.12)', occupied: 'rgba(59,130,246,0.12)', reserved: 'rgba(245,158,11,0.12)', cleaning: 'rgba(139,92,246,0.12)', blocked: 'rgba(239,68,68,0.12)' };

const SEED: TrackedTable[] = [
    { id: '1', name: 'T-1', floor: 'Main Dining', status: 'occupied', guests: 4, server: 'Maria', orderTotal: 67.50, occupiedSince: '19:15', course: 'Main Course' },
    { id: '2', name: 'T-2', floor: 'Main Dining', status: 'occupied', guests: 2, server: 'Stefan', orderTotal: 34.00, occupiedSince: '19:45', course: 'Appetizer' },
    { id: '3', name: 'T-3', floor: 'Main Dining', status: 'available', guests: 0, server: '', orderTotal: 0, occupiedSince: '', course: '' },
    { id: '4', name: 'T-4', floor: 'Main Dining', status: 'reserved', guests: 0, server: '', orderTotal: 0, occupiedSince: '20:30', course: '' },
    { id: '5', name: 'T-5', floor: 'Main Dining', status: 'occupied', guests: 6, server: 'Maria', orderTotal: 142.80, occupiedSince: '18:30', course: 'Dessert' },
    { id: '6', name: 'T-6', floor: 'Main Dining', status: 'cleaning', guests: 0, server: '', orderTotal: 0, occupiedSince: '', course: '' },
    { id: '7', name: 'T-7', floor: 'Main Dining', status: 'occupied', guests: 8, server: 'Joseph', orderTotal: 218.50, occupiedSince: '19:00', course: 'Main Course' },
    { id: '8', name: 'T-8', floor: 'Main Dining', status: 'available', guests: 0, server: '', orderTotal: 0, occupiedSince: '', course: '' },
    { id: '9', name: 'P-1', floor: 'Terrace', status: 'occupied', guests: 2, server: 'Stefan', orderTotal: 28.00, occupiedSince: '20:00', course: 'Drinks' },
    { id: '10', name: 'P-2', floor: 'Terrace', status: 'available', guests: 0, server: '', orderTotal: 0, occupiedSince: '', course: '' },
    { id: '11', name: 'P-3', floor: 'Terrace', status: 'occupied', guests: 4, server: 'Maria', orderTotal: 56.00, occupiedSince: '19:30', course: 'Main Course' },
    { id: '12', name: 'P-4', floor: 'Terrace', status: 'reserved', guests: 0, server: '', orderTotal: 0, occupiedSince: '20:00', course: '' },
    { id: '13', name: 'B-1', floor: 'Bar', status: 'occupied', guests: 1, server: 'Joseph', orderTotal: 12.50, occupiedSince: '20:15', course: 'Drinks' },
    { id: '14', name: 'B-2', floor: 'Bar', status: 'available', guests: 0, server: '', orderTotal: 0, occupiedSince: '', course: '' },
    { id: '15', name: 'B-3', floor: 'Bar', status: 'occupied', guests: 3, server: 'Joseph', orderTotal: 45.00, occupiedSince: '19:45', course: 'Drinks' },
];

const TableTracker: React.FC = () => {
    const navigate = useNavigate();
    const [tables] = useState(SEED);
    const [filterFloor, setFilterFloor] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const floors = Array.from(new Set(tables.map(t => t.floor)));
    const filtered = tables.filter(t => (filterFloor === 'all' || t.floor === filterFloor) && (filterStatus === 'all' || t.status === filterStatus));
    const occupied = tables.filter(t => t.status === 'occupied');
    const totalGuests = occupied.reduce((s, t) => s + t.guests, 0);
    const totalRevenue = occupied.reduce((s, t) => s + t.orderTotal, 0);
    const available = tables.filter(t => t.status === 'available').length;

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Table Tracker</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Real-time table status and occupancy overview</p>
                </div>
                <button style={bo} onClick={() => { }}><RefreshCw size={14} /> Refresh</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {[{ l: 'Occupied', v: `${occupied.length}/${tables.length}`, c: '#3B82F6', i: <Users size={16} /> }, { l: 'Available', v: available.toString(), c: '#10B981', i: <Eye size={16} /> }, { l: 'Guests', v: totalGuests.toString(), c: '#F59E0B', i: <Users size={16} /> }, { l: 'Revenue', v: `€${totalRevenue.toFixed(0)}`, c: '#8B5CF6', i: <DollarSign size={16} /> }].map((s, i) => (
                    <div key={i} style={{ ...cd, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.c}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.c }}>{s.i}</div>
                        <div><div style={{ fontSize: 22, fontWeight: 700 }}>{s.v}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.l}</div></div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', borderRadius: 8, padding: 3, border: '1px solid var(--border-primary,#27272a)' }}>
                    <button onClick={() => setFilterFloor('all')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 12, cursor: 'pointer', background: filterFloor === 'all' ? 'rgba(59,130,246,0.1)' : 'transparent', color: filterFloor === 'all' ? '#3B82F6' : 'var(--text-secondary)' }}>All Floors</button>
                    {floors.map(f => <button key={f} onClick={() => setFilterFloor(f)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 12, cursor: 'pointer', background: filterFloor === f ? 'rgba(59,130,246,0.1)' : 'transparent', color: filterFloor === f ? '#3B82F6' : 'var(--text-secondary)' }}>{f}</button>)}
                </div>
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', borderRadius: 8, padding: 3, border: '1px solid var(--border-primary,#27272a)' }}>
                    <button onClick={() => setFilterStatus('all')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 12, cursor: 'pointer', background: filterStatus === 'all' ? 'rgba(59,130,246,0.1)' : 'transparent', color: filterStatus === 'all' ? '#3B82F6' : 'var(--text-secondary)' }}>All</button>
                    {(Object.keys(STATUS_COLORS) as TableStatus[]).map(s => <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize', background: filterStatus === s ? STATUS_BG[s] : 'transparent', color: filterStatus === s ? STATUS_COLORS[s] : 'var(--text-secondary)' }}>{s}</button>)}
                </div>
            </div>

            {/* Table Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                {filtered.map(table => (
                    <div key={table.id} style={{ ...cd, padding: 14, borderLeft: `3px solid ${STATUS_COLORS[table.status]}`, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 16, fontWeight: 700 }}>{table.name}</span>
                            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: STATUS_BG[table.status], color: STATUS_COLORS[table.status], textTransform: 'capitalize' }}>{table.status}</span>
                        </div>
                        {table.status === 'occupied' && <>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}><Users size={10} style={{ display: 'inline', marginRight: 4 }} />{table.guests} guests · {table.server}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}><Clock size={10} style={{ display: 'inline', marginRight: 4 }} />Since {table.occupiedSince}</div>
                            <div style={{ fontSize: 11, padding: '2px 6px', borderRadius: 3, background: 'rgba(59,130,246,0.1)', color: '#3B82F6', display: 'inline-block', marginBottom: 4 }}>{table.course}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#10B981' }}>€{table.orderTotal.toFixed(2)}</div>
                        </>}
                        {table.status === 'reserved' && <div style={{ fontSize: 12, color: '#F59E0B' }}>Reserved for {table.occupiedSince}</div>}
                        {table.status === 'cleaning' && <div style={{ fontSize: 12, color: '#8B5CF6' }}>Being cleaned...</div>}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                {(Object.entries(STATUS_COLORS)).map(([s, c]) => (<div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}><div style={{ width: 10, height: 10, borderRadius: 2, background: c }} /><span style={{ textTransform: 'capitalize' }}>{s}</span></div>))}
            </div>
        </div></div>
    );
};

export default TableTracker;
