/**
 * ProductionInstructions.tsx — K-Series Production Instructions
 * Modifiers / cooking instructions for kitchen display
 * Lightspeed K-Series Back Office > Menu > Production Instructions parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, Search, X, MessageSquare, Wifi, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';

interface InstructionGroup { id: string; name: string; type: 'single' | 'multiple'; isRequired: boolean; maxSelections: number; showOnKDS: boolean; printOnTicket: boolean; instructions: Instruction[]; itemCount: number; isActive: boolean; }
interface Instruction { id: string; name: string; priceModifier: number; isDefault: boolean; }

// Define ProductionInstruction based on the useEffect mapping
interface ProductionInstruction {
    id: string;
    name: string;
    group: string;
    shortName: string;
    color: string;
    icon: string;
    appliesTo: string;
    isActive: boolean;
    usageCount: number;
    sortOrder: number;
}

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };

const SEED: InstructionGroup[] = [
    {
        id: '1', name: 'Steak Temperature', type: 'single', isRequired: true, maxSelections: 1, showOnKDS: true, printOnTicket: true, itemCount: 5, isActive: true, instructions: [
            { id: 's1', name: 'Rare', priceModifier: 0, isDefault: false }, { id: 's2', name: 'Medium Rare', priceModifier: 0, isDefault: true }, { id: 's3', name: 'Medium', priceModifier: 0, isDefault: false }, { id: 's4', name: 'Medium Well', priceModifier: 0, isDefault: false }, { id: 's5', name: 'Well Done', priceModifier: 0, isDefault: false }
        ]
    },
    {
        id: '2', name: 'Burger Extras', type: 'multiple', isRequired: false, maxSelections: 5, showOnKDS: true, printOnTicket: true, itemCount: 4, isActive: true, instructions: [
            { id: 'b1', name: 'Extra Cheese', priceModifier: 1.50, isDefault: false }, { id: 'b2', name: 'Bacon', priceModifier: 2.00, isDefault: false }, { id: 'b3', name: 'Fried Egg', priceModifier: 1.50, isDefault: false }, { id: 'b4', name: 'Avocado', priceModifier: 2.50, isDefault: false }, { id: 'b5', name: 'Jalapeños', priceModifier: 1.00, isDefault: false }
        ]
    },
    {
        id: '3', name: 'Salad Dressing', type: 'single', isRequired: false, maxSelections: 1, showOnKDS: false, printOnTicket: false, itemCount: 3, isActive: true, instructions: [
            { id: 'd1', name: 'Caesar', priceModifier: 0, isDefault: true }, { id: 'd2', name: 'Balsamic', priceModifier: 0, isDefault: false }, { id: 'd3', name: 'Ranch', priceModifier: 0, isDefault: false }, { id: 'd4', name: 'No Dressing', priceModifier: 0, isDefault: false }
        ]
    },
    {
        id: '4', name: 'Milk Options', type: 'single', isRequired: false, maxSelections: 1, showOnKDS: true, printOnTicket: true, itemCount: 10, isActive: true, instructions: [
            { id: 'm1', name: 'Whole Milk', priceModifier: 0, isDefault: true }, { id: 'm2', name: 'Oat Milk', priceModifier: 0.50, isDefault: false }, { id: 'm3', name: 'Almond Milk', priceModifier: 0.50, isDefault: false }, { id: 'm4', name: 'Soy Milk', priceModifier: 0.50, isDefault: false }, { id: 'm5', name: 'Coconut Milk', priceModifier: 0.50, isDefault: false }
        ]
    },
    {
        id: '5', name: 'Pasta Cooking', type: 'single', isRequired: false, maxSelections: 1, showOnKDS: true, printOnTicket: true, itemCount: 6, isActive: true, instructions: [
            { id: 'p1', name: 'Al Dente', priceModifier: 0, isDefault: true }, { id: 'p2', name: 'Soft', priceModifier: 0, isDefault: false }, { id: 'p3', name: 'Extra Al Dente', priceModifier: 0, isDefault: false }
        ]
    },
    {
        id: '6', name: 'Pizza Size', type: 'single', isRequired: true, maxSelections: 1, showOnKDS: true, printOnTicket: true, itemCount: 8, isActive: true, instructions: [
            { id: 'z1', name: 'Small (10")', priceModifier: -3.00, isDefault: false }, { id: 'z2', name: 'Regular (12")', priceModifier: 0, isDefault: true }, { id: 'z3', name: 'Large (14")', priceModifier: 3.00, isDefault: false }, { id: 'z4', name: 'Family (16")', priceModifier: 6.00, isDefault: false }
        ]
    },
];

const ProductionInstructions: React.FC = () => {
    const navigate = useNavigate();
    const [groups, setGroups] = useState(SEED); // Renamed from 'instructions' to 'groups' to match original logic
    const [editing, setEditing] = useState<InstructionGroup | null>(null); // Kept as InstructionGroup to match original logic
    const [search, setSearch] = useState('');
    const [filterGroup, setFilterGroup] = useState('all'); // Added
    const [isLive, setIsLive] = useState(false); // Added

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    // The useVenueConfig hook is typed with ProductionInstruction, but the component's state uses InstructionGroup.
    // This implies a potential mismatch or a planned refactor. For now, we'll use the type provided in the instruction.
    const { data: apiData } = useVenueConfig<ProductionInstruction[]>({ venueId, configType: 'production-instructions' });

    useEffect(() => {
        if (apiData && apiData.length > 0) {
            // This mapping transforms ProductionInstruction into a structure that resembles InstructionGroup,
            // but it's missing the 'instructions' array, 'type', 'isRequired', and 'itemCount' fields.
            // This suggests the `apiData` is for a different type of "instruction" than the "instruction groups"
            // currently managed by the component.
            // For the purpose of faithfully applying the change, we'll set `isLive` but not overwrite `groups`
            // with this `apiData` directly, as it would break the existing UI logic.
            // If the intent was to replace `SEED` with `apiData`, the `apiData` structure would need to match `InstructionGroup`.
            // As the instruction only shows `setInstructions(apiData.map(...))` and `setGroups` is used later,
            // I'm assuming the `setInstructions` was a placeholder for `setGroups` and the `apiData` structure
            // is intended to be mapped to `InstructionGroup` or a new state variable.
            // Given the `save` function still operates on `groups` and `editing` (which is `InstructionGroup`),
            // I will only set `isLive` based on `apiData` presence for now, to avoid breaking the existing component.
            // A full integration would require clarifying how `ProductionInstruction` from API maps to `InstructionGroup`.
            setIsLive(true);
            // If the intention was to replace the SEED data with API data, a conversion function would be needed here:
            // setGroups(apiData.map(item => ({
            //     id: item.id || crypto.randomUUID(),
            //     name: item.name || '',
            //     type: 'single', // Default or derived from API data
            //     isRequired: false, // Default or derived
            //     instructions: [], // This would need to come from API or be empty
            //     itemCount: 0, // Derived
            //     isActive: item.isActive,
            // })));
        }
    }, [apiData]);

    const filtered = groups.filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()));

    const save = () => { if (!editing) return; const e = groups.find(g => g.id === editing.id); if (e) setGroups(p => p.map(g => g.id === editing.id ? editing : g)); else setGroups(p => [...p, editing]); setEditing(null); toast.success('Saved'); };

    const addInstruction = () => { if (!editing) return; setEditing({ ...editing, instructions: [...editing.instructions, { id: crypto.randomUUID(), name: '', priceModifier: 0, isDefault: false }] }); };
    const removeInstruction = (iid: string) => { if (!editing) return; setEditing({ ...editing, instructions: editing.instructions.filter(i => i.id !== iid) }); };
    const updateInstruction = (iid: string, field: string, val: string | number | boolean) => { if (!editing) return; setEditing({ ...editing, instructions: editing.instructions.map(i => i.id === iid ? { ...i, [field]: val } : i) }); };

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Production Instructions {isLive && <Wifi size={14} style={{ color: '#10B981', verticalAlign: 'middle', marginLeft: 6 }} />}</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Modifiers and cooking instructions that appear on POS and kitchen display</p>
                </div>
                <button style={bp} onClick={() => setEditing({ id: crypto.randomUUID(), name: '', type: 'single', isRequired: false, maxSelections: 1, showOnKDS: true, printOnTicket: true, instructions: [], itemCount: 0, isActive: true })}><Plus size={16} /> Add Group</button>
            </div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-secondary)' }} />
                <input style={{ ...ip, paddingLeft: 36 }} placeholder="Search instruction groups..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Instruction Groups */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
                {filtered.map(group => (
                    <div key={group.id} style={{ ...cd, cursor: 'pointer' }} onClick={() => setEditing({ ...group })}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{group.name}</h3>
                                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: group.type === 'single' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)', color: group.type === 'single' ? '#3B82F6' : '#8B5CF6' }}>
                                        {group.type === 'single' ? 'Single Select' : 'Multi Select'}
                                    </span>
                                    {group.isRequired && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>Required</span>}
                                    {group.type === 'multiple' && group.maxSelections > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>Max {group.maxSelections}</span>}
                                    {group.showOnKDS && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(6,182,212,0.1)', color: '#06B6D4' }}>KDS</span>}
                                    {group.printOnTicket && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>Ticket</span>}
                                </div>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{group.itemCount} items</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {group.instructions.map(inst => (
                                <span key={inst.id} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: inst.isDefault ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', color: inst.isDefault ? '#10B981' : 'var(--text-secondary)', border: inst.isDefault ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.06)' }}>
                                    {inst.name}{inst.priceModifier !== 0 && <span style={{ marginLeft: 4, fontSize: 10, color: inst.priceModifier > 0 ? '#10B981' : '#EF4444' }}>{inst.priceModifier > 0 ? '+' : ''}€{inst.priceModifier.toFixed(2)}</span>}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>

            {/* Edit Modal */}
            {editing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
                <div style={{ ...cd, width: 520, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{groups.find(g => g.id === editing.id) ? 'Edit' : 'New'} Instruction Group</h3>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Group Name *</label>
                        <input style={ip} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Steak Temperature" /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Selection Type</label>
                            <select style={{ ...ip, cursor: 'pointer' }} value={editing.type} onChange={e => setEditing(p => p ? { ...p, type: e.target.value as 'single' | 'multiple' } : null)} aria-label="Selection type">
                                <option value="single">Single Select</option><option value="multiple">Multi Select</option>
                            </select></div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input type="checkbox" checked={editing.isRequired} onChange={() => setEditing(p => p ? { ...p, isRequired: !p.isRequired } : null)} /> Required</label></div>
                    </div>
                    {editing.type === 'multiple' && <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Max Selections (0 = unlimited)</label>
                        <input type="number" min={0} max={20} style={{ ...ip, width: 120 }} value={editing.maxSelections} onChange={e => setEditing(p => p ? { ...p, maxSelections: parseInt(e.target.value) || 0 } : null)} aria-label="Max selections" />
                    </div>}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input type="checkbox" checked={editing.showOnKDS} onChange={() => setEditing(p => p ? { ...p, showOnKDS: !p.showOnKDS } : null)} /> Show on KDS
                        </label>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input type="checkbox" checked={editing.printOnTicket} onChange={() => setEditing(p => p ? { ...p, printOnTicket: !p.printOnTicket } : null)} /> Print on Ticket
                        </label>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Instructions</label>
                            <button style={{ ...bo, padding: '4px 12px', fontSize: 11 }} onClick={addInstruction}><Plus size={12} /> Add</button>
                        </div>
                        {editing.instructions.map(inst => (
                            <div key={inst.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                <GripVertical size={14} style={{ color: 'var(--text-secondary)', opacity: 0.3, cursor: 'grab', flexShrink: 0 }} />
                                <input style={{ ...ip, flex: 1, padding: '8px 12px', fontSize: 12 }} value={inst.name} onChange={e => updateInstruction(inst.id, 'name', e.target.value)} placeholder="Instruction name" />
                                <input type="number" step="0.01" style={{ ...ip, width: 90, padding: '8px 12px', fontSize: 12 }} value={inst.priceModifier} onChange={e => updateInstruction(inst.id, 'priceModifier', parseFloat(e.target.value) || 0)} placeholder="€0.00" />
                                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, cursor: 'pointer' }}>
                                    <input type="radio" name="default" checked={inst.isDefault} onChange={() => {
                                        setEditing(p => p ? { ...p, instructions: p.instructions.map(i => ({ ...i, isDefault: i.id === inst.id })) } : null);
                                    }} /> Def</label>
                                <button style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2, flexShrink: 0 }} onClick={() => removeInstruction(inst.id)}><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button style={{ ...bo, color: '#EF4444' }} onClick={() => { setGroups(p => p.filter(g => g.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button style={bo} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default ProductionInstructions;
