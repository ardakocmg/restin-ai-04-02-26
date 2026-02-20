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

interface ServiceChargeRule {
    id: string; name: string; type: 'percentage' | 'fixed'; value: number; applyTo: 'all' | 'dine-in' | 'delivery' | 'takeaway';
    minGuests: number; autoApply: boolean; taxable: boolean; isActive: boolean; description: string;
}

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };
const sl: React.CSSProperties = { ...ip, cursor: 'pointer' };

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
                (r: any) => ({ id: r.id || r._id || crypto.randomUUID(), name: r.name || '', type: r.type || 'percentage', value: r.value ?? 0, applyTo: r.applyTo ?? r.apply_to ?? 'all', minGuests: r.minGuests ?? r.min_guests ?? 0, autoApply: r.autoApply ?? r.auto_apply ?? true, taxable: r.taxable ?? true, isActive: r.isActive ?? r.is_active ?? true, description: r.description || '' }))); setIsLive(true);
        }
    }, [apiData]);

    const save = () => { if (!editing) return; const e = rules.find(r => r.id === editing.id); if (e) setRules(p => p.map(r => r.id === editing.id ? editing : r)); else setRules(p => [...p, editing]); setEditing(null); toast.success('Saved'); };

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Service Charges {isLive && <Wifi size={14} style={{ color: '#10B981', verticalAlign: 'middle', marginLeft: 6 }} />}</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Configure automatic and manual service charge rules</p>
                </div>
                <button style={bp} onClick={() => setEditing({ id: crypto.randomUUID(), name: '', type: 'percentage', value: 10, applyTo: 'all', minGuests: 0, autoApply: true, taxable: true, isActive: true, description: '' })}><Plus size={16} /> Add Rule</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
                {rules.map(rule => (
                    <div key={rule.id} style={{ ...cd, cursor: 'pointer', opacity: rule.isActive ? 1 : 0.5 }} onClick={() => setEditing({ ...rule })}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                                    <Percent size={18} />
                                </div>
                                <div><h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{rule.name}</h3>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                        {rule.type === 'percentage' ? `${rule.value}%` : `€${rule.value.toFixed(2)}`} · {rule.applyTo}
                                    </span></div>
                            </div>
                            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: rule.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: rule.isActive ? '#10B981' : '#EF4444' }}>{rule.isActive ? 'Active' : 'Off'}</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.5 }}>{rule.description}</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {rule.autoApply && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>Auto-Apply</span>}
                            {rule.taxable && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>Taxable</span>}
                            {rule.minGuests > 0 && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>Min {rule.minGuests} guests</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>

            {editing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
                <div style={{ ...cd, width: 480 }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{rules.find(r => r.id === editing.id) ? 'Edit' : 'New'} Service Charge</h3>
                        <button title="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name *</label>
                        <input style={ip} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Standard Service" /></div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Description</label>
                        <input style={ip} value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : null)} placeholder="Optional description" /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Type</label>
                            <select style={sl} value={editing.type} onChange={e => setEditing(p => p ? { ...p, type: e.target.value as 'percentage' | 'fixed' } : null)} aria-label="Type"><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Value</label>
                            <input type="number" step="0.01" style={ip} value={editing.value} onChange={e => setEditing(p => p ? { ...p, value: parseFloat(e.target.value) || 0 } : null)} aria-label="Charge value" /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Apply To</label>
                            <select style={sl} value={editing.applyTo} onChange={e => setEditing(p => p ? { ...p, applyTo: e.target.value as ServiceChargeRule['applyTo'] } : null)} aria-label="Apply to"><option value="all">All Orders</option><option value="dine-in">Dine-In Only</option><option value="delivery">Delivery Only</option><option value="takeaway">Takeaway Only</option></select></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Min Guests (0=any)</label>
                            <input type="number" min={0} style={ip} value={editing.minGuests} onChange={e => setEditing(p => p ? { ...p, minGuests: parseInt(e.target.value) || 0 } : null)} aria-label="Minimum guests" /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                        {([['autoApply', 'Auto-apply'], ['taxable', 'Taxable'], ['isActive', 'Active']] as const).map(([key, label]) =>
                            <label key={key} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <input type="checkbox" checked={editing[key]} onChange={() => setEditing(p => p ? { ...p, [key]: !p[key] } : null)} /> {label}</label>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete rule" style={{ ...bo, color: '#EF4444' }} onClick={() => { setRules(p => p.filter(r => r.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button style={bo} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default ServiceCharge;
