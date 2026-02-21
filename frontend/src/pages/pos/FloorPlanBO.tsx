/**
 * FloorPlanBO.tsx — K-Series Floor Plan (Back Office)
 * Visual floor plan editor for table layout management
 * Lightspeed K-Series Back Office > Configuration > Floor Plans parity
 */
import React, { useState } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, X, Square, Circle, Armchair, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import './pos-shared.css';

interface FloorTable { id: string; name: string; x: number; y: number; width: number; height: number; seats: number; shape: 'rect' | 'circle'; rotation: number; }
interface Floor { id: string; name: string; tables: FloorTable[]; isActive: boolean; }

const SEED_FLOORS: Floor[] = [
    {
        id: 'f1', name: 'Main Dining', isActive: true, tables: [
            { id: 't1', name: 'T-1', x: 50, y: 50, width: 80, height: 80, seats: 4, shape: 'rect', rotation: 0 },
            { id: 't2', name: 'T-2', x: 160, y: 50, width: 80, height: 80, seats: 4, shape: 'rect', rotation: 0 },
            { id: 't3', name: 'T-3', x: 270, y: 50, width: 80, height: 80, seats: 4, shape: 'rect', rotation: 0 },
            { id: 't4', name: 'T-4', x: 50, y: 160, width: 120, height: 80, seats: 6, shape: 'rect', rotation: 0 },
            { id: 't5', name: 'T-5', x: 200, y: 160, width: 80, height: 80, seats: 4, shape: 'circle', rotation: 0 },
            { id: 't6', name: 'T-6', x: 310, y: 160, width: 80, height: 80, seats: 4, shape: 'circle', rotation: 0 },
            { id: 't7', name: 'T-7', x: 50, y: 280, width: 160, height: 80, seats: 8, shape: 'rect', rotation: 0 },
            { id: 't8', name: 'T-8', x: 240, y: 280, width: 100, height: 80, seats: 6, shape: 'rect', rotation: 0 },
        ]
    },
    {
        id: 'f2', name: 'Terrace', isActive: true, tables: [
            { id: 't9', name: 'P-1', x: 50, y: 50, width: 70, height: 70, seats: 2, shape: 'circle', rotation: 0 },
            { id: 't10', name: 'P-2', x: 150, y: 50, width: 70, height: 70, seats: 2, shape: 'circle', rotation: 0 },
            { id: 't11', name: 'P-3', x: 250, y: 50, width: 70, height: 70, seats: 2, shape: 'circle', rotation: 0 },
            { id: 't12', name: 'P-4', x: 100, y: 150, width: 100, height: 70, seats: 4, shape: 'rect', rotation: 0 },
            { id: 't13', name: 'P-5', x: 230, y: 150, width: 100, height: 70, seats: 4, shape: 'rect', rotation: 0 },
        ]
    },
    {
        id: 'f3', name: 'Bar Area', isActive: true, tables: [
            { id: 't14', name: 'B-1', x: 50, y: 50, width: 60, height: 60, seats: 2, shape: 'circle', rotation: 0 },
            { id: 't15', name: 'B-2', x: 130, y: 50, width: 60, height: 60, seats: 2, shape: 'circle', rotation: 0 },
            { id: 't16', name: 'B-3', x: 210, y: 50, width: 60, height: 60, seats: 2, shape: 'circle', rotation: 0 },
            { id: 't17', name: 'Bar Counter', x: 50, y: 140, width: 250, height: 50, seats: 8, shape: 'rect', rotation: 0 },
        ]
    },
];

const FloorPlanBO: React.FC = () => {
    const navigate = useNavigate();
    const [floors, setFloors] = useState(SEED_FLOORS);
    const [activeFloor, setActiveFloor] = useState(floors[0]?.id || '');
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [editingTable, setEditingTable] = useState<FloorTable | null>(null);

    const floor = floors.find(f => f.id === activeFloor);
    const totalTables = floors.reduce((a, f) => a + f.tables.length, 0);
    const totalSeats = floors.reduce((a, f) => a + f.tables.reduce((b, t) => b + t.seats, 0), 0);

    const addTable = () => {
        if (!floor) return;
        const newTable: FloorTable = { id: crypto.randomUUID(), name: `T-${totalTables + 1}`, x: 100, y: 100, width: 80, height: 80, seats: 4, shape: 'rect', rotation: 0 };
        setFloors(prev => prev.map(f => f.id === activeFloor ? { ...f, tables: [...f.tables, newTable] } : f));
        toast.success('Table added');
    };

    const deleteTable = (tid: string) => {
        setFloors(prev => prev.map(f => f.id === activeFloor ? { ...f, tables: f.tables.filter(t => t.id !== tid) } : f));
        setSelectedTable(null); toast.success('Table removed');
    };

    const saveTable = () => {
        if (!editingTable) return;
        setFloors(prev => prev.map(f => f.id === activeFloor ? { ...f, tables: f.tables.map(t => t.id === editingTable.id ? editingTable : t) } : f));
        setEditingTable(null); toast.success('Table updated');
    };

    const addFloor = () => {
        const f: Floor = { id: crypto.randomUUID(), name: `Floor ${floors.length + 1}`, tables: [], isActive: true };
        setFloors(prev => [...prev, f]); setActiveFloor(f.id); toast.success('Floor added');
    };

    return (
        <div className="pos-page"><div className="pos-container pos-container--1200">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn pos-btn--outline" style={{ marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Floor Plans</h1> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>{floors.length} floors · {totalTables} tables · {totalSeats} seats</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
                </div>
                <div style={{ display: 'flex', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <button className="pos-btn pos-btn--outline" onClick={addFloor}><Plus size={14} /> Add Floor</button>
                    <button className="pos-btn pos-btn--primary" onClick={addTable}><Plus size={16} /> Add Table</button>
                </div>
            </div>

            {/* Floor Tabs */}
            <div className="pos-tab-group" style={{ marginBottom: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                {floors.map(f => (
                    <button key={f.id} onClick={() => setActiveFloor(f.id)} className={`pos-tab-btn${activeFloor === f.id ? ' pos-tab-btn--active' : ''}`}>
                        {f.name} ({f.tables.length})
                    </button>
                ))}
            </div>

            {/* Canvas Area */}
            {floor && <div className="pos-card" style={{ padding: 0, overflow: 'hidden' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <div style={{ position: 'relative', width: '100%', height: 400, background: 'var(--bg-secondary,#09090b)', backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '20px 20px' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    {floor.tables.map(table => (
                        <div key={table.id} onClick={() => { setSelectedTable(table.id); setEditingTable({ ...table }); }}
                            style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                position: 'absolute', left: table.x, top: table.y, width: table.width, height: table.height, borderRadius: table.shape === 'circle' ? '50%' : 8,
                                background: selectedTable === table.id ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.12)',
                                border: selectedTable === table.id ? '2px solid #3B82F6' : '1px solid rgba(59,130,246,0.3)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s ease'
                            }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6' }}>{table.name}</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{table.seats} seats</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div>
                    ))}
                    {floor.tables.length === 0 && <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <LayoutGrid size={36} style={{ opacity: 0.3, marginBottom: 8 }} /><p style={{ fontSize: 14 }}>Click "Add Table" to start designing</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    </div>}
                </div>
            </div>}

            {/* Selected Table Panel */}
            {editingTable && <div className="pos-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Table: {editingTable.name}</h3> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <div style={{ display: 'flex', gap: 6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button className="pos-btn pos-btn--primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={saveTable}><Save size={12} /> Save</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button className="pos-btn pos-btn--outline" style={{ padding: '6px 14px', fontSize: 12, color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => deleteTable(editingTable.id)}><Trash2 size={12} /> Delete</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <input className="pos-input" value={editingTable.name} onChange={e => setEditingTable(p => p ? { ...p, name: e.target.value } : null)} /></div>
                    <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Seats</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <input type="number" min={1} className="pos-input" value={editingTable.seats} onChange={e => setEditingTable(p => p ? { ...p, seats: parseInt(e.target.value) || 1 } : null)} /></div>
                    <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Shape</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ display: 'flex', gap: 6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <button onClick={() => setEditingTable(p => p ? { ...p, shape: 'rect' } : null)} className={`pos-btn pos-btn--outline${editingTable.shape === 'rect' ? ' pos-radio-option--active' : ''}`} style={{ padding: '8px 14px', fontSize: 12 }}><Square size={14} /></button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <button onClick={() => setEditingTable(p => p ? { ...p, shape: 'circle' } : null)} className={`pos-btn pos-btn--outline${editingTable.shape === 'circle' ? ' pos-radio-option--active' : ''}`} style={{ padding: '8px 14px', fontSize: 12 }}><Circle size={14} /></button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div></div>
                    <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Size (W×H)</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ display: 'flex', gap: 4 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <input type="number" min={40} className="pos-input" style={{ width: '50%' }} value={editingTable.width} onChange={e => setEditingTable(p => p ? { ...p, width: parseInt(e.target.value) || 40 } : null)} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <input type="number" min={40} className="pos-input" style={{ width: '50%' }} value={editingTable.height} onChange={e => setEditingTable(p => p ? { ...p, height: parseInt(e.target.value) || 40 } : null)} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div></div>
                </div>
            </div>}
        </div></div>
    );
};

export default FloorPlanBO;
