/**
 * ServiceCharge.tsx — K-Series Service Charge Config
 * Auto/manual service charges with rules
 * Lightspeed K-Series Back Office > Configuration > Service Charge parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, X, Percent, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';
import './pos-shared.css';

interface ServiceChargeRule {
    id: string; name: string; type: 'percentage' | 'fixed'; value: number; applyTo: 'all' | 'dine-in' | 'delivery' | 'takeaway';
    minGuests: number; autoApply: boolean; taxable: boolean; isActive: boolean; description: string;
}

const SEED: ServiceChargeRule[] = [
    { id: '1', name: 'Standard Service', type: 'percentage', value: 12.5, applyTo: 'dine-in', minGuests: 0, autoApply: true, taxable: true, isActive: true, description: 'Applied automatically to all dine-in orders' },
    { id: '2', name: 'Large Party Surcharge', type: 'percentage', value: 15, applyTo: 'dine-in', minGuests: 8, autoApply: true, taxable: true, isActive: true, description: 'Higher rate for parties of 8 or more' },
    { id: '3', name: 'Delivery Fee', type: 'fixed', value: 3.50, applyTo: 'delivery', minGuests: 0, autoApply: true, taxable: false, isActive: true, description: 'Flat delivery fee for all delivery orders' },
    { id: '4', name: 'Weekend Surcharge', type: 'percentage', value: 5, applyTo: 'all', minGuests: 0, autoApply: false, taxable: true, isActive: false, description: 'Optional weekend/holiday surcharge' },
];

const ServiceCharge: React.FC = () => {
    const navigate = useNavigate();
    const [rules, setRules] = useState(SEED);
    const [editing, setEditing] = useState<ServiceChargeRule | null>(null);
    const [isLive, setIsLive] = useState(false);

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiData } = useVenueConfig<ServiceChargeRule>({ venueId, configType: 'service-charges' });
    useEffect(() => {
        if (apiData && apiData.length > 0) {
            setRules(apiData.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (r: /**/any) => ({ id: r.id || r._id || crypto.randomUUID(), name: r.name || '', type: r.type || 'percentage', value: r.value ?? 0, applyTo: r.applyTo ?? r.apply_to ?? 'all', minGuests: r.minGuests ?? r.min_guests ?? 0, autoApply: r.autoApply ?? r.auto_apply ?? true, taxable: r.taxable ?? true, isActive: r.isActive ?? r.is_active ?? true, description: r.description || '' }))); setIsLive(true);
        }
    }, [apiData]);

    const save = () => { if (!editing) return; const e = rules.find(r => r.id === editing.id); if (e) setRules(p => p.map(r => r.id === editing.id ? editing : r)); else setRules(p => [...p, editing]); setEditing(null); toast.success('Saved'); };

    return (
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Service Charges {isLive && <Wifi size={14} className="pos-live-icon" />}</h1>
                    <p className="pos-subtitle">Configure automatic and manual service charge rules</p>
                </div>
                <button className="pos-btn-primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', type: 'percentage', value: 10, applyTo: 'all', minGuests: 0, autoApply: true, taxable: true, isActive: true, description: '' })}><Plus size={16} /> Add Rule</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
                {rules.map(rule => (
                    <div key={rule.id} className="pos-card" style={{ cursor: 'pointer', opacity: rule.isActive ? 1 : 0.5 }} onClick={() => setEditing({ ...rule })}>
                        <div className="pos-flex pos-flex--between" style={{ alignItems: 'flex-start', marginBottom: 10 }}>
                            <div className="pos-flex pos-flex--center pos-gap-10">
                                <div className="pos-stat-icon pos-stat-icon--blue" style={{ width: 40, height: 40, borderRadius: 10 }}>
                                    <Percent size={18} />
                                </div>
                                <div><h3 className="pos-modal-title" style={{ fontSize: 16 }}>{rule.name}</h3>
                                    <span className="pos-cell-secondary" style={{ fontSize: 11 }}>
                                        {rule.type === 'percentage' ? `${rule.value}%` : `€${rule.value.toFixed(2)}`} · {rule.applyTo}
                                    </span></div>
                            </div>
                            <span className={`pos-badge ${rule.isActive ? 'pos-badge--green' : 'pos-badge--red'}`} style={{ fontSize: 9 }}>{rule.isActive ? 'Active' : 'Off'}</span>
                        </div>
                        <p className="pos-cell-secondary pos-mb-8" style={{ lineHeight: 1.5 }}>{rule.description}</p>
                        <div className="pos-flex pos-gap-6 pos-flex--wrap">
                            {rule.autoApply && <span className="pos-badge pos-badge--blue" style={{ fontSize: 9 }}>Auto-Apply</span>}
                            {rule.taxable && <span className="pos-badge pos-badge--amber" style={{ fontSize: 9 }}>Taxable</span>}
                            {rule.minGuests > 0 && <span className="pos-badge pos-badge--purple" style={{ fontSize: 9 }}>Min {rule.minGuests} guests</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>

            {editing && <div className="pos-modal-overlay" onClick={() => setEditing(null)}>
                <div className="pos-card pos-modal pos-modal--sm" onClick={e => e.stopPropagation()}>
                    <div className="pos-modal-header">
                        <h3 className="pos-modal-title">{rules.find(r => r.id === editing.id) ? 'Edit' : 'New'} Service Charge</h3>
                        <button title="Close" className="pos-btn-icon" onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div className="pos-form-group"><label className="pos-form-label">Name *</label>
                        <input className="pos-input" value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Standard Service" /></div>
                    <div className="pos-form-group"><label className="pos-form-label">Description</label>
                        <input className="pos-input" value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : null)} placeholder="Optional description" /></div>
                    <div className="pos-form-grid">
                        <div><label className="pos-form-label">Type</label>
                            <select className="pos-select" value={editing.type} onChange={e => setEditing(p => p ? { ...p, type: e.target.value as 'percentage' | 'fixed' } : null)} aria-label="Type"><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></div>
                        <div><label className="pos-form-label">Value</label>
                            <input type="number" step="0.01" className="pos-input" value={editing.value} onChange={e => setEditing(p => p ? { ...p, value: parseFloat(e.target.value) || 0 } : null)} aria-label="Charge value" /></div>
                    </div>
                    <div className="pos-form-grid">
                        <div><label className="pos-form-label">Apply To</label>
                            <select className="pos-select" value={editing.applyTo} onChange={e => setEditing(p => p ? { ...p, applyTo: e.target.value as ServiceChargeRule['applyTo'] } : null)} aria-label="Apply to"><option value="all">All Orders</option><option value="dine-in">Dine-In Only</option><option value="delivery">Delivery Only</option><option value="takeaway">Takeaway Only</option></select></div>
                        <div><label className="pos-form-label">Min Guests (0=any)</label>
                            <input type="number" min={0} className="pos-input" value={editing.minGuests} onChange={e => setEditing(p => p ? { ...p, minGuests: parseInt(e.target.value) || 0 } : null)} aria-label="Minimum guests" /></div>
                    </div>
                    <div className="pos-flex pos-gap-16 pos-mb-16 pos-flex--wrap">
                        {([['autoApply', 'Auto-apply'], ['taxable', 'Taxable'], ['isActive', 'Active']] as const).map(([key, label]) =>
                            <label key={key} className="pos-toggle-label">
                                <input type="checkbox" checked={editing[key]} onChange={() => setEditing(p => p ? { ...p, [key]: !p[key] } : null)} /> {label}</label>
                        )}
                    </div>
                    <div className="pos-modal-footer">
                        <button className="pos-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete rule" className="pos-btn-outline" style={{ color: '#EF4444' }} onClick={() => { setRules(p => p.filter(r => r.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button className="pos-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default ServiceCharge;
