/**
 * ProductionInstructions.tsx — K-Series Production Instructions / Modifiers
 * Manage instruction groups  and modifier options for menu items
 * Lightspeed K-Series Back Office > Configuration > Production Instructions parity
 */
import React, { useState } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, X, ChevronRight, GripVertical, Printer, LayoutGrid, ListChecks, ToggleRight, CheckSquare, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import './pos-shared.css';

interface Instruction { id: string; name: string; priceModifier: number; isDefault: boolean; }
interface InstructionGroup {
    id: string; name: string; type: 'single' | 'multi'; required: boolean; maxSelections: number;
    printOnKDS: boolean; printOnTicket: boolean; instructions: Instruction[];
}

const SEED: InstructionGroup[] = [
    {
        id: 'g1', name: 'Cooking Temperature', type: 'single', required: true, maxSelections: 1, printOnKDS: true, printOnTicket: true, instructions: [
            { id: 'i1', name: 'Rare', priceModifier: 0, isDefault: false }, { id: 'i2', name: 'Medium Rare', priceModifier: 0, isDefault: true },
            { id: 'i3', name: 'Medium', priceModifier: 0, isDefault: false }, { id: 'i4', name: 'Medium Well', priceModifier: 0, isDefault: false }, { id: 'i5', name: 'Well Done', priceModifier: 0, isDefault: false }
        ]
    },
    {
        id: 'g2', name: 'Extra Toppings', type: 'multi', required: false, maxSelections: 5, printOnKDS: true, printOnTicket: true, instructions: [
            { id: 'i6', name: 'Extra Cheese', priceModifier: 1.50, isDefault: false }, { id: 'i7', name: 'Bacon', priceModifier: 2.00, isDefault: false },
            { id: 'i8', name: 'Mushrooms', priceModifier: 1.00, isDefault: false }, { id: 'i9', name: 'Jalapeños', priceModifier: 0.75, isDefault: false }, { id: 'i10', name: 'Avocado', priceModifier: 2.50, isDefault: false }
        ]
    },
    {
        id: 'g3', name: 'Side Choice', type: 'single', required: true, maxSelections: 1, printOnKDS: true, printOnTicket: false, instructions: [
            { id: 'i11', name: 'Fries', priceModifier: 0, isDefault: true }, { id: 'i12', name: 'Salad', priceModifier: 0, isDefault: false },
            { id: 'i13', name: 'Rice', priceModifier: 0, isDefault: false }, { id: 'i14', name: 'Sweet Potato Fries', priceModifier: 1.50, isDefault: false }
        ]
    },
    {
        id: 'g4', name: 'Allergies / Notes', type: 'multi', required: false, maxSelections: 10, printOnKDS: true, printOnTicket: true, instructions: [
            { id: 'i15', name: 'No Gluten', priceModifier: 0, isDefault: false }, { id: 'i16', name: 'No Nuts', priceModifier: 0, isDefault: false },
            { id: 'i17', name: 'No Dairy', priceModifier: 0, isDefault: false }, { id: 'i18', name: 'Vegetarian Sub', priceModifier: 0, isDefault: false }
        ]
    },
    {
        id: 'g5', name: 'Sauce Selection', type: 'single', required: false, maxSelections: 1, printOnKDS: true, printOnTicket: false, instructions: [
            { id: 'i19', name: 'Ketchup', priceModifier: 0, isDefault: false }, { id: 'i20', name: 'BBQ', priceModifier: 0, isDefault: false },
            { id: 'i21', name: 'Garlic Aioli', priceModifier: 0.50, isDefault: false }, { id: 'i22', name: 'Truffle Mayo', priceModifier: 1.00, isDefault: false }
        ]
    },
];

const ProductionInstructions: React.FC = () => {
    const navigate = useNavigate();
    const [groups, setGroups] = useState(SEED);
    const [selected, setSelected] = useState<string | null>(groups[0]?.id || null);
    const [editingGroup, setEditingGroup] = useState<InstructionGroup | null>(null);
    const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null);

    const activeGroup = groups.find(g => g.id === selected);

    const addGroup = () => {
        const g: InstructionGroup = { id: crypto.randomUUID(), name: 'New Group', type: 'single', required: false, maxSelections: 1, printOnKDS: true, printOnTicket: true, instructions: [] };
        setGroups(p => [...p, g]); setSelected(g.id); setEditingGroup(g); toast.success('Group created');
    };

    const saveGroup = () => { if (!editingGroup) return; setGroups(p => p.map(g => g.id === editingGroup.id ? editingGroup : g)); setEditingGroup(null); toast.success('Group updated'); };

    const deleteGroup = (gid: string) => { setGroups(p => p.filter(g => g.id !== gid)); if (selected === gid) setSelected(groups[0]?.id || null); toast.success('Group deleted'); };

    const addInstruction = () => {
        if (!selected) return;
        const inst: Instruction = { id: crypto.randomUUID(), name: 'New Option', priceModifier: 0, isDefault: false };
        setGroups(p => p.map(g => g.id === selected ? { ...g, instructions: [...g.instructions, inst] } : g));
        setEditingInstruction(inst); toast.success('Option added');
    };

    const saveInstruction = () => {
        if (!editingInstruction || !selected) return;
        setGroups(p => p.map(g => g.id === selected ? { ...g, instructions: g.instructions.map(i => i.id === editingInstruction.id ? editingInstruction : i) } : g));
        setEditingInstruction(null); toast.success('Option saved');
    };

    const deleteInstruction = (iid: string) => {
        if (!selected) return;
        setGroups(p => p.map(g => g.id === selected ? { ...g, instructions: g.instructions.filter(i => i.id !== iid) } : g));
        toast.success('Option removed');
    };

    return (
        <div className="pos-page"><div className="pos-container pos-container--sidebar">
            {/* Sidebar */}
            <div className="pos-sidebar">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <button onClick={() => navigate(-1)} className="pos-btn pos-btn--outline" style={{ padding: '6px 10px', fontSize: 12 }}><ArrowLeft size={14} /></button>
                    <button className="pos-btn pos-btn--primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={addGroup}><Plus size={14} /> Add</button>
                </div>
                <h2 className="pos-section-title">Instruction Groups</h2>
                {groups.map(group => (
                    <button key={group.id} onClick={() => setSelected(group.id)} className={`pos-sidebar-btn${selected === group.id ? ' pos-sidebar-btn--active' : ''}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {group.type === 'single' ? <Circle size={14} /> : <CheckSquare size={14} />}
                            <div style={{ textAlign: 'left' }}><div style={{ fontSize: 13, fontWeight: 500 }}>{group.name}</div>
                                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>{group.instructions.length} options · {group.type}</div></div>
                        </div>
                        <ChevronRight size={14} style={{ opacity: 0.4 }} />
                    </button>
                ))}
            </div>

            {/* Main Content */}
            <div className="pos-main">
                {activeGroup ? <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{activeGroup.name}</h1>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>{activeGroup.type === 'single' ? 'Single' : 'Multi'} select · {activeGroup.instructions.length} options{activeGroup.required ? ' · Required' : ''}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="pos-btn pos-btn--outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setEditingGroup({ ...activeGroup })}><Edit3 size={12} /> Edit</button>
                            <button className="pos-btn pos-btn--outline" style={{ padding: '6px 12px', fontSize: 12, color: '#EF4444' }} onClick={() => deleteGroup(activeGroup.id)}><Trash2 size={12} /></button>
                        </div>
                    </div>

                    {/* Group Settings Card */}
                    <div className="pos-card" style={{ marginBottom: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                <ToggleRight size={14} style={{ color: activeGroup.required ? '#10B981' : 'var(--text-secondary)' }} />
                                <span>{activeGroup.required ? 'Required' : 'Optional'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                <Printer size={14} style={{ color: activeGroup.printOnKDS ? '#3B82F6' : 'var(--text-secondary)' }} />
                                <span>KDS: {activeGroup.printOnKDS ? 'Yes' : 'No'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                <Printer size={14} style={{ color: activeGroup.printOnTicket ? '#3B82F6' : 'var(--text-secondary)' }} />
                                <span>Ticket: {activeGroup.printOnTicket ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Instructions List */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 className="pos-section-title" style={{ margin: 0 }}>Options</h3>
                        <button className="pos-btn pos-btn--primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={addInstruction}><Plus size={12} /> Add Option</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {activeGroup.instructions.map(inst => (
                            <div key={inst.id} className="pos-card" style={{ cursor: 'pointer', padding: '12px 14px' }} onClick={() => setEditingInstruction({ ...inst })}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <GripVertical size={14} style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{inst.name}</div>
                                            {inst.isDefault && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>Default</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {inst.priceModifier !== 0 && <span style={{ fontSize: 12, fontWeight: 600, color: inst.priceModifier > 0 ? '#10B981' : '#EF4444' }}>{inst.priceModifier > 0 ? '+' : ''}€{inst.priceModifier.toFixed(2)}</span>}
                                        <button className="pos-btn pos-btn--outline" style={{ padding: '4px 8px' }} onClick={e => { e.stopPropagation(); deleteInstruction(inst.id); }}><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {activeGroup.instructions.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}><ListChecks size={32} style={{ opacity: 0.3, marginBottom: 8 }} /><p>{"No "}options yet</p></div>}
                    </div>
                </> : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
                    <LayoutGrid size={48} style={{ opacity: 0.2, marginBottom: 12 }} /><p>Select a group or create one</p>
                </div>}
            </div>
        </div>

            {/* Edit Group Modal */}
            {editingGroup && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditingGroup(null)}>
                <div className="pos-card" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Edit Group</h3>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditingGroup(null)}><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name</label>
                        <input className="pos-input" value={editingGroup.name} onChange={e => setEditingGroup(p => p ? { ...p, name: e.target.value } : null)} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Type</label>
                            <div style={{ display: 'flex', gap: 6 }}>{(['single', 'multi'] as const).map(t => (
                                <button key={t} onClick={() => setEditingGroup(p => p ? { ...p, type: t } : null)} className={`pos-radio-option${editingGroup.type === t ? ' pos-radio-option--active' : ''}`} style={{ flex: 1, textAlign: 'center' }}>{t === 'single' ? '○ Single' : '☑ Multi'}</button>
                            ))}</div></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Max Selections</label>
                            <input type="number" min={1} className="pos-input" value={editingGroup.maxSelections} onChange={e => setEditingGroup(p => p ? { ...p, maxSelections: parseInt(e.target.value) || 1 } : null)} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                        {['required', 'printOnKDS', 'printOnTicket'].map(k => (
                            <label key={k} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                <input type="checkbox" checked={(editingGroup as any)[k] as boolean} onChange={() => setEditingGroup(p => p ? { ...p, [k]: !(p as any)[k] } : null)} />
                                {k === 'printOnKDS' ? 'Print KDS' : k === 'printOnTicket' ? 'Print Ticket' : 'Required'}
                            </label>
                        ))}
                    </div>
                    <button className="pos-btn pos-btn--primary" style={{ width: '100%', justifyContent: 'center' }} onClick={saveGroup}><Save size={14} /> Save</button>
                </div>
            </div>}

            {/* Edit Instruction Modal */}
            {editingInstruction && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }} onClick={() => setEditingInstruction(null)}>
                <div className="pos-card" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Edit Option</h3>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditingInstruction(null)}><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name</label>
                        <input className="pos-input" value={editingInstruction.name} onChange={e => setEditingInstruction(p => p ? { ...p, name: e.target.value } : null)} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Price Modifier (€)</label>
                            <input type="number" step="0.01" className="pos-input" value={editingInstruction.priceModifier} onChange={e => setEditingInstruction(p => p ? { ...p, priceModifier: parseFloat(e.target.value) || 0 } : null)} /></div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <input type="checkbox" checked={editingInstruction.isDefault} onChange={() => setEditingInstruction(p => p ? { ...p, isDefault: !p.isDefault } : null)} /> Default
                            </label></div>
                    </div>
                    <button className="pos-btn pos-btn--primary" style={{ width: '100%', justifyContent: 'center' }} onClick={saveInstruction}><Save size={14} /> Save</button>
                </div>
            </div>}
        </div>
    );
};

export default ProductionInstructions;
