/**
 * FloorPlanBO.tsx — K-Series Floor Plan (Back Office)
 * Visual floor plan editor for table layout management
 * Lightspeed K-Series Back Office > Configuration > Floor Plans parity
 */
import React, { useState } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, X, Square, Circle, Armchair, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface FloorTable { id: string; name: string; x: number; y: number; width: number; height: number; seats: number; shape: 'rect' | 'circle'; rotation: number; }
interface Floor { id: string; name: string; tables: FloorTable[]; isActive: boolean; }

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };

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
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Floor Plans</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>{floors.length} floors · {totalTables} tables · {totalSeats} seats</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button style={bo} onClick={addFloor}><Plus size={14} /> Add Floor</button>
                    <button style={bp} onClick={addTable}><Plus size={16} /> Add Table</button>
                </div>
            </div>

            {/* Floor Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-card,#18181b)', borderRadius: 10, padding: 4, border: '1px solid var(--border-primary,#27272a)', width: 'fit-content' }}>
                {floors.map(f => (
                    <button key={f.id} onClick={() => setActiveFloor(f.id)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: activeFloor === f.id ? 600 : 400, cursor: 'pointer', background: activeFloor === f.id ? 'rgba(59,130,246,0.1)' : 'transparent', color: activeFloor === f.id ? '#3B82F6' : 'var(--text-secondary)' }}>
                        {f.name} ({f.tables.length})
                    </button>
                ))}
            </div>

            {/* Canvas Area */}
            {floor && <div style={{ ...cd, padding: 0, overflow: 'hidden' }}>
                <div style={{ position: 'relative', width: '100%', height: 400, background: 'var(--bg-secondary,#09090b)', backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    {floor.tables.map(table => (
                        <div key={table.id} onClick={() => { setSelectedTable(table.id); setEditingTable({ ...table }); }}
                            style={{
                                position: 'absolute', left: table.x, top: table.y, width: table.width, height: table.height, borderRadius: table.shape === 'circle' ? '50%' : 8,
                                background: selectedTable === table.id ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.12)',
                                border: selectedTable === table.id ? '2px solid #3B82F6' : '1px solid rgba(59,130,246,0.3)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s ease'
                            }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6' }}>{table.name}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{table.seats} seats</span>
                        </div>
                    ))}
                    {floor.tables.length === 0 && <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        <LayoutGrid size={36} style={{ opacity: 0.3, marginBottom: 8 }} /><p style={{ fontSize: 14 }}>Click "Add Table" to start designing</p>
                    </div>}
                </div>
            </div>}

            {/* Selected Table Panel */}
            {editingTable && <div style={cd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Table: {editingTable.name}</h3>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button style={{ ...bp, padding: '6px 14px', fontSize: 12 }} onClick={saveTable}><Save size={12} /> Save</button>
                        <button style={{ ...bo, padding: '6px 14px', fontSize: 12, color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => deleteTable(editingTable.id)}><Trash2 size={12} /> Delete</button>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
                    <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name</label>
                        <input style={ip} value={editingTable.name} onChange={e => setEditingTable(p => p ? { ...p, name: e.target.value } : null)} /></div>
                    <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Seats</label>
                        <input type="number" min={1} style={ip} value={editingTable.seats} onChange={e => setEditingTable(p => p ? { ...p, seats: parseInt(e.target.value) || 1 } : null)} /></div>
                    <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Shape</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setEditingTable(p => p ? { ...p, shape: 'rect' } : null)} style={{ ...bo, padding: '8px 14px', fontSize: 12, background: editingTable.shape === 'rect' ? 'rgba(59,130,246,0.1)' : 'transparent', color: editingTable.shape === 'rect' ? '#3B82F6' : 'var(--text-secondary)' }}><Square size={14} /></button>
                            <button onClick={() => setEditingTable(p => p ? { ...p, shape: 'circle' } : null)} style={{ ...bo, padding: '8px 14px', fontSize: 12, background: editingTable.shape === 'circle' ? 'rgba(59,130,246,0.1)' : 'transparent', color: editingTable.shape === 'circle' ? '#3B82F6' : 'var(--text-secondary)' }}><Circle size={14} /></button>
                        </div></div>
                    <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Size (W×H)</label>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <input type="number" min={40} style={{ ...ip, width: '50%' }} value={editingTable.width} onChange={e => setEditingTable(p => p ? { ...p, width: parseInt(e.target.value) || 40 } : null)} />
                            <input type="number" min={40} style={{ ...ip, width: '50%' }} value={editingTable.height} onChange={e => setEditingTable(p => p ? { ...p, height: parseInt(e.target.value) || 40 } : null)} />
                        </div></div>
                </div>
            </div>}
        </div></div>
    );
};

export default FloorPlanBO;
