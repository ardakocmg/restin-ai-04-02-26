/**
 * TableTracker.tsx — K-Series Table Tracker / Live Floor View
 * Real-time table status overview for managers
 * Lightspeed K-Series Back Office > Live > Table Tracker parity
 */
import React, { useState } from 'react';
import { ArrowLeft, Clock, Users, DollarSign, RefreshCw, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './pos-shared.css';

type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'blocked';
interface TrackedTable { id: string; name: string; floor: string; status: TableStatus; guests: number; server: string; orderTotal: number; occupiedSince: string; course: string; }

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
        <div className="pos-page"><div className="pos-container pos-container--1200">
            <div className="flex justify-between items-start mb-5">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn pos-btn--outline mb-2 py-1.5 px-3.5 text-xs"><ArrowLeft size={14} /> Back</button>
                    <h1 className="text-2xl font-bold m-0">Table Tracker</h1>
                    <p className="text-[13px] text-[var(--text-secondary,#a1a1aa)] mt-1 mb-0">Real-time table status and occupancy overview</p>
                </div>
                <button className="pos-btn pos-btn--outline" onClick={() => { }}><RefreshCw size={14} /> Refresh</button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-5">
                {[{ l: 'Occupied', v: `${occupied.length}/${tables.length}`, c: '#3B82F6', i: <Users size={16} /> }, { l: 'Available', v: available.toString(), c: '#10B981', i: <Eye size={16} /> }, { l: 'Guests', v: totalGuests.toString(), c: '#F59E0B', i: <Users size={16} /> }, { l: 'Revenue', v: `€${totalRevenue.toFixed(0)}`, c: '#8B5CF6', i: <DollarSign size={16} /> }].map((s, i) => (
                    <div key={i} className="pos-card p-4 flex items-center gap-3">
                        {/* keep-inline: dynamic color from data-driven config */}
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${s.c}15`, color: s.c }}>{s.i}</div>
                        <div><div className="text-[22px] font-bold">{s.v}</div><div className="text-xs text-[var(--text-secondary)]">{s.l}</div></div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
                <div className="pos-tab-group">
                    <button onClick={() => setFilterFloor('all')} className={`pos-filter-btn${filterFloor === 'all' ? ' pos-filter-btn--active' : ''}`}>All Floors</button>
                    {floors.map(f => <button key={f} onClick={() => setFilterFloor(f)} className={`pos-filter-btn${filterFloor === f ? ' pos-filter-btn--active' : ''}`}>{f}</button>)}
                </div>
                <div className="pos-tab-group">
                    <button onClick={() => setFilterStatus('all')} className={`pos-filter-btn${filterStatus === 'all' ? ' pos-filter-btn--active' : ''}`}>All</button>
                    {/* keep-inline: dynamic background/color from STATUS_COLORS/STATUS_BG maps */}
                    {(Object.keys(STATUS_COLORS) as TableStatus[]).map(s => <button key={s} onClick={() => setFilterStatus(s)} className="py-1.5 px-3 rounded-md border-none text-xs cursor-pointer capitalize" style={{ background: filterStatus === s ? STATUS_BG[s] : 'transparent', color: filterStatus === s ? STATUS_COLORS[s] : 'var(--text-secondary)' }}>{s}</button>)}
                </div>
            </div>

            {/* Table Grid */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                {filtered.map(table => (
                    // keep-inline: dynamic borderLeft color from STATUS_COLORS map
                    <div key={table.id} className="pos-card p-3.5 cursor-pointer" style={{ borderLeft: `3px solid ${STATUS_COLORS[table.status]}` }}>
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-base font-bold">{table.name}</span>
                            {/* keep-inline: dynamic background/color from STATUS maps */}
                            <span className="text-[9px] py-0.5 px-1.5 rounded capitalize" style={{ background: STATUS_BG[table.status], color: STATUS_COLORS[table.status] }}>{table.status}</span>
                        </div>
                        {table.status === 'occupied' && <>
                            <div className="text-xs text-[var(--text-secondary)] mb-0.5"><Users size={10} className="inline mr-1" />{table.guests} guests · {table.server}</div>
                            <div className="text-xs text-[var(--text-secondary)] mb-0.5"><Clock size={10} className="inline mr-1" />Since {table.occupiedSince}</div>
                            <div className="text-[11px] py-0.5 px-1.5 rounded bg-blue-500/10 text-blue-500 inline-block mb-1">{table.course}</div>
                            <div className="text-base font-bold text-emerald-500">€{table.orderTotal.toFixed(2)}</div>
                        </>}
                        {table.status === 'reserved' && <div className="text-xs text-amber-500">Reserved for {table.occupiedSince}</div>}
                        {table.status === 'cleaning' && <div className="text-xs text-purple-500">Being cleaned...</div>}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-4 justify-center flex-wrap">
                {/* keep-inline: dynamic background color from STATUS_COLORS map entries */}
                {(Object.entries(STATUS_COLORS)).map(([s, c]) => (<div key={s} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} /><span className="capitalize">{s}</span></div>))}
            </div>
        </div></div>
    );
};

export default TableTracker;
