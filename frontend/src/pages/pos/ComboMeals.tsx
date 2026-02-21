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
                    <p className="pos-subtitle">Bundle items into combos and meal deals with flexible pricing{apiWired && <span className="pos-badge--green ml-2 text-[11px]">● Live</span>}</p>
                </div>
                <button className="pos-btn-primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', price: 0, pricingType: 'fixed', steps: [], isActive: true, soldCount: 0 })}><Plus size={16} /> Create Combo</button>
            </div>

            {apiLoading && <div className="pos-card pos-flex pos-flex--center justify-center gap-2 p-[30px]"><Loader2 size={18} className="animate-spin text-blue-500" /><span className="pos-text-secondary">{"Loading "}combos...</span></div>}
            {apiError && <div className="pos-card pos-flex pos-flex--between pos-flex--center border-red-500 p-3.5"><span className="text-red-400 text-[13px]">⚠ {apiError}</span><button className="pos-btn-outline pos-btn-back" onClick={() => refetch()}>Retry</button></div>}

            <div className="pos-search-wrapper pos-mb-16">
                <Search size={14} className="pos-search-icon" />
                <input aria-label="Search combos..." className="pos-input pos-search-input" placeholder="Search combos..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
                {filtered.map(combo => (
                    <div key={combo.id} className={`pos-card cursor-pointer${combo.isActive ? '' : ' opacity-50'}`} onClick={() => setEditing({ ...combo })}>
                        <div className="pos-flex pos-flex--between items-start mb-2.5">
                            <div className="pos-flex pos-flex--center pos-gap-10">
                                <div className="pos-stat-icon pos-stat-icon--blue w-10 h-10 rounded-[10px]"><Package size={18} /></div>
                                <div><h3 className="pos-modal-title text-base">{combo.name}</h3>
                                    <span className="pos-cell-secondary text-[11px]">
                                        {combo.pricingType === 'fixed' ? `€${combo.price.toFixed(2)}` : combo.pricingType === 'cheapest-free' ? 'Cheapest Free' : 'Sum of Items'}
                                    </span></div>
                            </div>
                            <span className="pos-cell-secondary">{combo.soldCount} sold</span>
                        </div>
                        <div className="pos-flex pos-flex--col pos-gap-4">
                            {combo.steps.map((step, i) => (
                                <div key={step.id} className="pos-flex pos-flex--center pos-gap-6 py-1.5 px-2.5 bg-[var(--bg-secondary,#09090b)] rounded-md text-xs">
                                    <span className="pos-badge pos-badge--blue w-[18px] h-[18px] rounded text-[10px] font-bold p-0 justify-center">{i + 1}</span>
                                    <span className="pos-text-secondary flex-1">{step.name}</span>
                                    <span className="pos-text-secondary text-[10px]">{step.options.length} options</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>

            {editing && <div className="pos-modal-overlay" onClick={() => setEditing(null)}>
                <div className="pos-card pos-modal max-h-[85vh] overflow-auto w-[520px]" onClick={e => e.stopPropagation()}>
                    <div className="pos-modal-header">
                        <h3 className="pos-modal-title">{combos.find(c => c.id === editing.id) ? 'Edit' : 'New'} Combo</h3>
                        <button className="pos-btn-icon" onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div className="pos-form-group"><label className="pos-form-label">Name *</label>
                        <input aria-label="Input field" className="pos-input" value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Lunch Special" /></div>
                    <div className="pos-form-grid">
                        <div><label className="pos-form-label">Pricing Type</label>
                            <select aria-label="Select option" className="pos-select" value={editing.pricingType} onChange={e => setEditing(p => p ? { ...p, pricingType: e.target.value as Combo['pricingType'] } : null)} aria-label="Pricing type">
                                <option value="fixed">Fixed Price</option><option value="sum">Sum of Items</option><option value="cheapest-free">Cheapest Free</option>
                            </select></div>
                        {editing.pricingType === 'fixed' && <div><label className="pos-form-label">Price (€)</label>
                            <input aria-label="Input field" type="number" step="0.01" className="pos-input" value={editing.price} onChange={e => setEditing(p => p ? { ...p, price: parseFloat(e.target.value) || 0 } : null)} aria-label="Price" /></div>}
                    </div>
                    <div className="pos-form-group">
                        <div className="pos-flex pos-flex--between pos-flex--center pos-mb-8">
                            <label className="pos-form-label font-bold uppercase tracking-wide mb-0">Steps ({editing.steps.length})</label>
                            <button className="pos-btn-outline py-1 px-3 text-[11px]" onClick={addStep}><Plus size={12} /> Add Step</button>
                        </div>
                        {editing.steps.map((step, i) => (
                            <div key={step.id} className="pos-card bg-[var(--bg-secondary,#09090b)] p-3 mb-2">
                                <div className="pos-flex pos-gap-8 pos-flex--center pos-mb-8">
                                    <span className="pos-badge pos-badge--blue w-[22px] h-[22px] rounded text-[11px] font-bold p-0 justify-center shrink-0">{i + 1}</span>
                                    <input aria-label="Input field" className="pos-input flex-1 py-1.5 px-2.5 text-xs" value={step.name} onChange={e => { const s = [...editing.steps]; s[i] = { ...s[i], name: e.target.value }; setEditing({ ...editing, steps: s }); }} placeholder="Step name" aria-label="Step name" />
                                    <label className="pos-toggle-label text-[10px] shrink-0">
                                        <input aria-label="Input field" type="checkbox" checked={step.required} onChange={() => { const s = [...editing.steps]; s[i] = { ...s[i], required: !s[i].required }; setEditing({ ...editing, steps: s }); }} /> Req
                                    </label>
                                    <button title="Remove step" className="pos-btn-icon pos-btn-icon--danger shrink-0" onClick={() => setEditing({ ...editing, steps: editing.steps.filter((_, j) => j !== i) })}><X size={14} /></button>
                                </div>
                                <textarea aria-label="Input field" className="pos-input pos-textarea h-[50px] text-[11px]" value={step.options.join('\n')} onChange={e => { const s = [...editing.steps]; s[i] = { ...s[i], options: e.target.value.split('\n').filter(Boolean) }; setEditing({ ...editing, steps: s }); }} placeholder="One option per line" aria-label="Step options" />
                            </div>
                        ))}
                    </div>
                    <div className="pos-mb-16"><label className="pos-toggle-label">
                        <input aria-label="Input field" type="checkbox" checked={editing.isActive} onChange={() => setEditing(p => p ? { ...p, isActive: !p.isActive } : null)} /> Active</label></div>
                    <div className="pos-modal-footer">
                        <button className="pos-btn-primary flex-1 justify-center" onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete combo" className="pos-btn-outline text-red-400" onClick={() => { setCombos(p => p.filter(c => c.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button className="pos-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default ComboMeals;
