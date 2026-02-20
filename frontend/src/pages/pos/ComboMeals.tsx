/**
 * ComboMeals.tsx — K-Series Combo / Meal Deal Builder
 * Bundle items into combos with pricing rules
 * Lightspeed K-Series Back Office > Menu > Combos parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, Search, X, Package, DollarSign, Layers, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useRecipeService } from '../../hooks/shared/useRecipeService';
import authStore from '../../lib/AuthStore';

interface ComboStep { id: string; name: string; options: string[]; required: boolean; }
interface Combo { id: string; name: string; price: number; pricingType: 'fixed' | 'sum' | 'cheapest-free'; steps: ComboStep[]; isActive: boolean; soldCount: number; }

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };

const SEED: Combo[] = [
    {
        id: '1', name: 'Lunch Special', price: 14.95, pricingType: 'fixed', isActive: true, soldCount: 156, steps: [
            { id: 's1', name: 'Choose Starter', options: ['Caesar Salad', 'Soup of the Day', 'Bruschetta'], required: true },
            { id: 's2', name: 'Choose Main', options: ['Grilled Chicken', 'Pasta Carbonara', 'Fish & Chips', 'Veggie Burger'], required: true },
            { id: 's3', name: 'Choose Drink', options: ['Still Water', 'Sparkling Water', 'Soft Drink', 'House Wine'], required: true },
        ]
    },
    {
        id: '2', name: 'Family Feast', price: 49.95, pricingType: 'fixed', isActive: true, soldCount: 42, steps: [
            { id: 's4', name: 'Choose 2 Starters', options: ['Garlic Bread', 'Fried Calamari', 'Spring Rolls', 'Hummus Platter'], required: true },
            { id: 's5', name: 'Choose 2 Mains', options: ['Pizza Margherita', 'Grilled Lamb Chops', 'Seafood Risotto', 'BBQ Ribs'], required: true },
            { id: 's6', name: 'Choose Dessert', options: ['Tiramisu', 'Ice Cream', 'Fruit Platter'], required: false },
        ]
    },
    {
        id: '3', name: 'Happy Hour 2-for-1', price: 0, pricingType: 'cheapest-free', isActive: true, soldCount: 88, steps: [
            { id: 's7', name: 'Choose Cocktails', options: ['Mojito', 'Negroni', 'Spritz', 'Margarita', 'Old Fashioned'], required: true },
        ]
    },
    {
        id: '4', name: 'Burger Meal', price: 16.50, pricingType: 'fixed', isActive: true, soldCount: 210, steps: [
            { id: 's8', name: 'Choose Burger', options: ['Classic Beef', 'Chicken', 'Veggie', 'Fish'], required: true },
            { id: 's9', name: 'Choose Side', options: ['Fries', 'Sweet Potato Fries', 'Onion Rings', 'Coleslaw'], required: true },
            { id: 's10', name: 'Choose Drink', options: ['Soft Drink', 'Beer', 'Milkshake'], required: true },
        ]
    },
    {
        id: '5', name: 'Kids Menu', price: 8.95, pricingType: 'fixed', isActive: false, soldCount: 0, steps: [
            { id: 's11', name: 'Choose Main', options: ['Chicken Nuggets', 'Mini Pizza', 'Mac & Cheese'], required: true },
            { id: 's12', name: 'Choose Drink', options: ['Juice', 'Water', 'Chocolate Milk'], required: true },
        ]
    },
];

const ComboMeals: React.FC = () => {
    const navigate = useNavigate();
    const venueId = localStorage.getItem('restin_pos_venue') || authStore.getUser()?.venue_id || '';
    const { recipes: apiCombos, loading: apiLoading, error: apiError, refetch } = useRecipeService({ venueId, type: 'combo', enabled: !!venueId });
    const [combos, setCombos] = useState(SEED);
    const [apiWired, setApiWired] = useState(false);

    useEffect(() => {
        if (apiCombos.length > 0) {
            const mapped: Combo[] = apiCombos.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (ac: any) => ({
                    id: String(ac.id || ac._id || ''),
                    name: String(ac.name || ''),
                    price: Number(ac.price || ac.sell_price || 0),
                    pricingType: (ac.pricing_type || ac.pricingType || 'fixed') as Combo['pricingType'],
                    steps: Array.isArray(ac.steps) ? ac.steps : [],
                    isActive: ac.is_active !== false,
                    soldCount: Number(ac.sold_count || ac.soldCount || 0),
                }));
            setCombos(mapped);
            setApiWired(true);
        }
    }, [apiCombos]);

    const [editing, setEditing] = useState<Combo | null>(null);
    const [search, setSearch] = useState('');
    const filtered = combos.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

    const save = () => { if (!editing) return; const e = combos.find(c => c.id === editing.id); if (e) setCombos(p => p.map(c => c.id === editing.id ? editing : c)); else setCombos(p => [...p, editing]); setEditing(null); toast.success('Saved'); };
    const addStep = () => { if (!editing) return; setEditing({ ...editing, steps: [...editing.steps, { id: crypto.randomUUID(), name: '', options: [], required: true }] }); };

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Combo Meals</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Bundle items into combos and meal deals with flexible pricing{apiWired && <span style={{ marginLeft: 8, fontSize: 11, color: '#10B981' }}>● Live</span>}</p>
                </div>
                <button style={bp} onClick={() => setEditing({ id: crypto.randomUUID(), name: '', price: 0, pricingType: 'fixed', steps: [], isActive: true, soldCount: 0 })}><Plus size={16} /> Create Combo</button>
            </div>

            {apiLoading && <div style={{ ...cd, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 30 }}><Loader2 size={18} className="animate-spin" style={{ color: '#3B82F6' }} /><span style={{ color: 'var(--text-secondary)' }}>Loading combos...</span></div>}
            {apiError && <div style={{ ...cd, borderColor: '#EF4444', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#EF4444', fontSize: 13 }}>⚠ {apiError}</span><button style={{ ...bo, padding: '6px 14px', fontSize: 12 }} onClick={() => refetch()}>Retry</button></div>}

            <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-secondary)' }} />
                <input style={{ ...ip, paddingLeft: 36 }} placeholder="Search combos..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
                {filtered.map(combo => (
                    <div key={combo.id} style={{ ...cd, cursor: 'pointer', opacity: combo.isActive ? 1 : 0.5 }} onClick={() => setEditing({ ...combo })}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}><Package size={18} /></div>
                                <div><h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{combo.name}</h3>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                        {combo.pricingType === 'fixed' ? `€${combo.price.toFixed(2)}` : combo.pricingType === 'cheapest-free' ? 'Cheapest Free' : 'Sum of Items'}
                                    </span></div>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{combo.soldCount} sold</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {combo.steps.map((step, i) => (
                                <div key={step.id} style={{ padding: '6px 10px', background: 'var(--bg-secondary,#09090b)', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#3B82F6' }}>{i + 1}</span>
                                    <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{step.name}</span>
                                    <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{step.options.length} options</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>

            {editing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
                <div style={{ ...cd, width: 520, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{combos.find(c => c.id === editing.id) ? 'Edit' : 'New'} Combo</h3>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name *</label>
                        <input style={ip} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Lunch Special" /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Pricing Type</label>
                            <select style={{ ...ip, cursor: 'pointer' }} value={editing.pricingType} onChange={e => setEditing(p => p ? { ...p, pricingType: e.target.value as Combo['pricingType'] } : null)} aria-label="Pricing type">
                                <option value="fixed">Fixed Price</option><option value="sum">Sum of Items</option><option value="cheapest-free">Cheapest Free</option>
                            </select></div>
                        {editing.pricingType === 'fixed' && <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Price (€)</label>
                            <input type="number" step="0.01" style={ip} value={editing.price} onChange={e => setEditing(p => p ? { ...p, price: parseFloat(e.target.value) || 0 } : null)} aria-label="Price" /></div>}
                    </div>
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Steps ({editing.steps.length})</label>
                            <button style={{ ...bo, padding: '4px 12px', fontSize: 11 }} onClick={addStep}><Plus size={12} /> Add Step</button>
                        </div>
                        {editing.steps.map((step, i) => (
                            <div key={step.id} style={{ ...cd, background: 'var(--bg-secondary,#09090b)', padding: 12, marginBottom: 8 }}>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                    <span style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#3B82F6', flexShrink: 0 }}>{i + 1}</span>
                                    <input style={{ ...ip, flex: 1, padding: '6px 10px', fontSize: 12 }} value={step.name} onChange={e => { const s = [...editing.steps]; s[i] = { ...s[i], name: e.target.value }; setEditing({ ...editing, steps: s }); }} placeholder="Step name" aria-label="Step name" />
                                    <label style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', flexShrink: 0, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={step.required} onChange={() => { const s = [...editing.steps]; s[i] = { ...s[i], required: !s[i].required }; setEditing({ ...editing, steps: s }); }} /> Req
                                    </label>
                                    <button title="Remove step" style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2, flexShrink: 0 }} onClick={() => setEditing({ ...editing, steps: editing.steps.filter((_, j) => j !== i) })}><X size={14} /></button>
                                </div>
                                <textarea style={{ ...ip, height: 50, fontSize: 11, resize: 'vertical' }} value={step.options.join('\n')} onChange={e => { const s = [...editing.steps]; s[i] = { ...s[i], options: e.target.value.split('\n').filter(Boolean) }; setEditing({ ...editing, steps: s }); }} placeholder="One option per line" aria-label="Step options" />
                            </div>
                        ))}
                    </div>
                    <div style={{ marginBottom: 16 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={editing.isActive} onChange={() => setEditing(p => p ? { ...p, isActive: !p.isActive } : null)} /> Active</label></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete combo" style={{ ...bo, color: '#EF4444' }} onClick={() => { setCombos(p => p.filter(c => c.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button style={bo} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default ComboMeals;
