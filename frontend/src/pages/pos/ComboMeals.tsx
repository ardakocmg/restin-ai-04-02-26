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
import './pos-shared.css';

interface ComboStep { id: string; name: string; options: string[]; required: boolean; }
interface Combo { id: string; name: string; price: number; pricingType: 'fixed' | 'sum' | 'cheapest-free'; steps: ComboStep[]; isActive: boolean; soldCount: number; }

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
    const venueId = String(localStorage.getItem('restin_pos_venue') || authStore.getUser()?.venue_id || '');
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
                    pricingType: String(ac.pricing_type || ac.pricingType || 'fixed') as Combo['pricingType'],
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
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Combo Meals</h1>
                    <p className="pos-subtitle">Bundle items into combos and meal deals with flexible pricing{apiWired && <span className="pos-badge--green" style={{ marginLeft: 8, fontSize: 11 }}>● Live</span>}</p>
                </div>
                <button className="pos-btn-primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', price: 0, pricingType: 'fixed', steps: [], isActive: true, soldCount: 0 })}><Plus size={16} /> Create Combo</button>
            </div>

            {apiLoading && <div className="pos-card pos-flex pos-flex--center" style={{ justifyContent: 'center', gap: 8, padding: 30 }}><Loader2 size={18} className="animate-spin" style={{ color: '#3B82F6' }} /><span className="pos-text-secondary">Loading combos...</span></div>}
            {apiError && <div className="pos-card pos-flex pos-flex--between pos-flex--center" style={{ borderColor: '#EF4444', padding: 14 }}><span style={{ color: '#EF4444', fontSize: 13 }}>⚠ {apiError}</span><button className="pos-btn-outline pos-btn-back" onClick={() => refetch()}>Retry</button></div>}

            <div className="pos-search-wrapper pos-mb-16">
                <Search size={14} className="pos-search-icon" />
                <input className="pos-input pos-search-input" placeholder="Search combos..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
                {filtered.map(combo => (
                    <div key={combo.id} className="pos-card" style={{ cursor: 'pointer', opacity: combo.isActive ? 1 : 0.5 }} onClick={() => setEditing({ ...combo })}>
                        <div className="pos-flex pos-flex--between" style={{ alignItems: 'flex-start', marginBottom: 10 }}>
                            <div className="pos-flex pos-flex--center pos-gap-10">
                                <div className="pos-stat-icon pos-stat-icon--blue" style={{ width: 40, height: 40, borderRadius: 10 }}><Package size={18} /></div>
                                <div><h3 className="pos-modal-title" style={{ fontSize: 16 }}>{combo.name}</h3>
                                    <span className="pos-cell-secondary" style={{ fontSize: 11 }}>
                                        {combo.pricingType === 'fixed' ? `€${combo.price.toFixed(2)}` : combo.pricingType === 'cheapest-free' ? 'Cheapest Free' : 'Sum of Items'}
                                    </span></div>
                            </div>
                            <span className="pos-cell-secondary">{combo.soldCount} sold</span>
                        </div>
                        <div className="pos-flex pos-flex--col pos-gap-4">
                            {combo.steps.map((step, i) => (
                                <div key={step.id} className="pos-flex pos-flex--center pos-gap-6" style={{ padding: '6px 10px', background: 'var(--bg-secondary,#09090b)', borderRadius: 6, fontSize: 12 }}>
                                    <span className="pos-badge pos-badge--blue" style={{ width: 18, height: 18, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: 0, justifyContent: 'center' }}>{i + 1}</span>
                                    <span className="pos-text-secondary" style={{ flex: 1 }}>{step.name}</span>
                                    <span className="pos-text-secondary" style={{ fontSize: 10 }}>{step.options.length} options</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>

            {editing && <div className="pos-modal-overlay" onClick={() => setEditing(null)}>
                <div className="pos-card pos-modal" style={{ maxHeight: '85vh', overflow: 'auto', width: 520 }} onClick={e => e.stopPropagation()}>
                    <div className="pos-modal-header">
                        <h3 className="pos-modal-title">{combos.find(c => c.id === editing.id) ? 'Edit' : 'New'} Combo</h3>
                        <button className="pos-btn-icon" onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div className="pos-form-group"><label className="pos-form-label">Name *</label>
                        <input className="pos-input" value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Lunch Special" /></div>
                    <div className="pos-form-grid">
                        <div><label className="pos-form-label">Pricing Type</label>
                            <select className="pos-select" value={editing.pricingType} onChange={e => setEditing(p => p ? { ...p, pricingType: e.target.value as Combo['pricingType'] } : null)} aria-label="Pricing type">
                                <option value="fixed">Fixed Price</option><option value="sum">Sum of Items</option><option value="cheapest-free">Cheapest Free</option>
                            </select></div>
                        {editing.pricingType === 'fixed' && <div><label className="pos-form-label">Price (€)</label>
                            <input type="number" step="0.01" className="pos-input" value={editing.price} onChange={e => setEditing(p => p ? { ...p, price: parseFloat(e.target.value) || 0 } : null)} aria-label="Price" /></div>}
                    </div>
                    <div className="pos-form-group">
                        <div className="pos-flex pos-flex--between pos-flex--center pos-mb-8">
                            <label className="pos-form-label pos-text-bold" style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 0 }}>Steps ({editing.steps.length})</label>
                            <button className="pos-btn-outline" style={{ padding: '4px 12px', fontSize: 11 }} onClick={addStep}><Plus size={12} /> Add Step</button>
                        </div>
                        {editing.steps.map((step, i) => (
                            <div key={step.id} className="pos-card" style={{ background: 'var(--bg-secondary,#09090b)', padding: 12, marginBottom: 8 }}>
                                <div className="pos-flex pos-gap-8 pos-flex--center pos-mb-8">
                                    <span className="pos-badge pos-badge--blue" style={{ width: 22, height: 22, borderRadius: 4, fontSize: 11, fontWeight: 700, padding: 0, justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                                    <input className="pos-input" style={{ flex: 1, padding: '6px 10px', fontSize: 12 }} value={step.name} onChange={e => { const s = [...editing.steps]; s[i] = { ...s[i], name: e.target.value }; setEditing({ ...editing, steps: s }); }} placeholder="Step name" aria-label="Step name" />
                                    <label className="pos-toggle-label" style={{ fontSize: 10, flexShrink: 0 }}>
                                        <input type="checkbox" checked={step.required} onChange={() => { const s = [...editing.steps]; s[i] = { ...s[i], required: !s[i].required }; setEditing({ ...editing, steps: s }); }} /> Req
                                    </label>
                                    <button title="Remove step" className="pos-btn-icon pos-btn-icon--danger" style={{ flexShrink: 0 }} onClick={() => setEditing({ ...editing, steps: editing.steps.filter((_, j) => j !== i) })}><X size={14} /></button>
                                </div>
                                <textarea className="pos-input pos-textarea" style={{ height: 50, fontSize: 11 }} value={step.options.join('\n')} onChange={e => { const s = [...editing.steps]; s[i] = { ...s[i], options: e.target.value.split('\n').filter(Boolean) }; setEditing({ ...editing, steps: s }); }} placeholder="One option per line" aria-label="Step options" />
                            </div>
                        ))}
                    </div>
                    <div className="pos-mb-16"><label className="pos-toggle-label">
                        <input type="checkbox" checked={editing.isActive} onChange={() => setEditing(p => p ? { ...p, isActive: !p.isActive } : null)} /> Active</label></div>
                    <div className="pos-modal-footer">
                        <button className="pos-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete combo" className="pos-btn-outline" style={{ color: '#EF4444' }} onClick={() => { setCombos(p => p.filter(c => c.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button className="pos-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default ComboMeals;
