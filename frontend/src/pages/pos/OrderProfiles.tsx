/**
 * OrderProfiles.tsx — K-Series Order Profiles
 * Dine-in, Takeaway, Delivery, etc order type configuration
 * Lightspeed K-Series Back Office > Configuration > Order Profiles parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, X, ShoppingBag, UtensilsCrossed, Truck, Coffee, Building, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';
import './pos-shared.css';

interface OrderProfile {
    id: string; name: string; code: string; icon: string; color: string; taxProfile: string; printProfile: string;
    continuous: boolean; orderModifier: boolean;
    takeawayMode: 'none' | 'pickup' | 'delivery';
    deliveryDelay: 'none' | 'custom' | 'no-time';
    serviceCharge: string; autoGratuity: number; applyToQuickPay: boolean;
    requiresTable: boolean; requiresCustomer: boolean; requiresAddress: boolean;
    autoOpenDrawer: boolean; autoCloseAfterPayment: boolean; isActive: boolean; sortOrder: number;
}

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
    <div className={`pos-toggle-track ${value ? 'pos-toggle-track--on' : 'pos-toggle-track--off'}`} onClick={onChange}>
        <div className={`pos-toggle-thumb ${value ? 'pos-toggle-thumb--on' : 'pos-toggle-thumb--off'}`} />
    </div>
);

const SERVICE_CHARGES = ['— None —', '10% Service', '12.5% Service', '15% Service', 'Cover Charge €2'];
const ICONS: Record<string, React.ReactNode> = {
    'dine-in': <UtensilsCrossed size={20} />, 'takeaway': <ShoppingBag size={20} />, 'delivery': <Truck size={20} />,
    'pickup': <Coffee size={20} />, 'room-service': <Building size={20} />,
};
const TAX_PROFILES = ['Standard 18%', 'Reduced 5%', 'Mixed (Dine-in/Takeaway)', 'Zero-Rated Export'];
const PRINT_PROFILES = ['Receipt (Front Counter)', 'Kitchen Tickets', 'Takeaway Receipt'];

const SEED: OrderProfile[] = [
    { id: '1', name: 'Dine-In', code: 'DINE', icon: 'dine-in', color: '#3B82F6', taxProfile: 'Standard 18%', printProfile: 'Receipt (Front Counter)', continuous: false, orderModifier: false, takeawayMode: 'none', deliveryDelay: 'none', serviceCharge: '10% Service', autoGratuity: 0, applyToQuickPay: false, requiresTable: true, requiresCustomer: false, requiresAddress: false, autoOpenDrawer: true, autoCloseAfterPayment: true, isActive: true, sortOrder: 1 },
    { id: '2', name: 'Takeaway', code: 'TAKE', icon: 'takeaway', color: '#10B981', taxProfile: 'Reduced 5%', printProfile: 'Takeaway Receipt', continuous: false, orderModifier: true, takeawayMode: 'pickup', deliveryDelay: 'none', serviceCharge: '— None —', autoGratuity: 0, applyToQuickPay: true, requiresTable: false, requiresCustomer: false, requiresAddress: false, autoOpenDrawer: true, autoCloseAfterPayment: true, isActive: true, sortOrder: 2 },
    { id: '3', name: 'Delivery', code: 'DLVR', icon: 'delivery', color: '#F59E0B', taxProfile: 'Reduced 5%', printProfile: 'Takeaway Receipt', continuous: false, orderModifier: true, takeawayMode: 'delivery', deliveryDelay: 'custom', serviceCharge: '— None —', autoGratuity: 0, applyToQuickPay: false, requiresTable: false, requiresCustomer: true, requiresAddress: true, autoOpenDrawer: false, autoCloseAfterPayment: true, isActive: true, sortOrder: 3 },
    { id: '4', name: 'Pickup', code: 'PICK', icon: 'pickup', color: '#8B5CF6', taxProfile: 'Reduced 5%', printProfile: 'Takeaway Receipt', continuous: false, orderModifier: false, takeawayMode: 'pickup', deliveryDelay: 'none', serviceCharge: '— None —', autoGratuity: 0, applyToQuickPay: true, requiresTable: false, requiresCustomer: true, requiresAddress: false, autoOpenDrawer: false, autoCloseAfterPayment: true, isActive: true, sortOrder: 4 },
    { id: '5', name: 'Room Service', code: 'ROOM', icon: 'room-service', color: '#EC4899', taxProfile: 'Standard 18%', printProfile: 'Kitchen Tickets', continuous: true, orderModifier: false, takeawayMode: 'none', deliveryDelay: 'no-time', serviceCharge: '15% Service', autoGratuity: 15, applyToQuickPay: true, requiresTable: false, requiresCustomer: true, requiresAddress: false, autoOpenDrawer: false, autoCloseAfterPayment: false, isActive: false, sortOrder: 5 },
];

const OrderProfiles: React.FC = () => {
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState(SEED);
    const [editing, setEditing] = useState<OrderProfile | null>(null);
    const [isLive, setIsLive] = useState(false);
    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiData } = useVenueConfig<OrderProfile>({ venueId, configType: 'order-profiles' });
    useEffect(() => {
        if (apiData && apiData.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setProfiles(apiData.map((p: /**/any) => ({ id: (p.id || p._id || crypto.randomUUID()) as string, name: (p.name || '') as string, code: (p.code || '') as string, icon: (p.icon || 'dine-in') as string, color: (p.color || '#3B82F6') as string, taxProfile: (p.taxProfile ?? p.tax_profile ?? 'Standard 18%') as string, printProfile: (p.printProfile ?? p.print_profile ?? 'Receipt (Front Counter)') as string, continuous: (p.continuous ?? false) as boolean, orderModifier: (p.orderModifier ?? p.order_modifier ?? false) as boolean, takeawayMode: (p.takeawayMode ?? p.takeaway_mode ?? 'none') as OrderProfile['takeawayMode'], deliveryDelay: (p.deliveryDelay ?? p.delivery_delay ?? 'none') as OrderProfile['deliveryDelay'], serviceCharge: (p.serviceCharge ?? p.service_charge ?? '— None —') as string, autoGratuity: (p.autoGratuity ?? p.auto_gratuity ?? 0) as number, applyToQuickPay: (p.applyToQuickPay ?? p.apply_to_quick_pay ?? false) as boolean, requiresTable: (p.requiresTable ?? p.requires_table ?? false) as boolean, requiresCustomer: (p.requiresCustomer ?? p.requires_customer ?? false) as boolean, requiresAddress: (p.requiresAddress ?? p.requires_address ?? false) as boolean, autoOpenDrawer: (p.autoOpenDrawer ?? p.auto_open_drawer ?? false) as boolean, autoCloseAfterPayment: (p.autoCloseAfterPayment ?? p.auto_close_after_payment ?? true) as boolean, isActive: (p.isActive ?? p.is_active ?? true) as boolean, sortOrder: (p.sortOrder ?? p.sort_order ?? 0) as number }))); setIsLive(true);
        }
    }, [apiData]);
    const filtered = profiles.sort((a, b) => a.sortOrder - b.sortOrder);
    const save = () => { if (!editing) return; const e = profiles.find(p => p.id === editing.id); if (e) setProfiles(prev => prev.map(p => p.id === editing.id ? editing : p)); else setProfiles(prev => [...prev, editing]); setEditing(null); toast.success('Saved'); };

    return (
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Order Profiles {isLive && <Wifi size={14} className="pos-live-icon" />}</h1>
                    <p className="pos-subtitle">Configure order types with specific tax profiles, printing, and required fields</p>
                </div>
                <button className="pos-btn-primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', code: '', icon: 'dine-in', color: '#3B82F6', taxProfile: TAX_PROFILES[0], printProfile: PRINT_PROFILES[0], continuous: false, orderModifier: false, takeawayMode: 'none', deliveryDelay: 'none', serviceCharge: '— None —', autoGratuity: 0, applyToQuickPay: false, requiresTable: false, requiresCustomer: false, requiresAddress: false, autoOpenDrawer: false, autoCloseAfterPayment: true, isActive: true, sortOrder: profiles.length + 1 })}><Plus size={16} /> Add Profile</button>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                {filtered.map(profile => (
                    // keep-inline: borderLeft uses dynamic profile.color from user-configurable data
                    <div key={profile.id} className={`pos-card cursor-pointer${profile.isActive ? '' : ' opacity-50'}`} style={{ borderLeft: `4px solid ${profile.color}`  /* keep-inline */ }} onClick={() => setEditing({ ...profile })}>
                        <div className="pos-flex pos-flex--between items-start mb-3">
                            <div className="pos-flex pos-flex--center pos-gap-10">
                                {/* keep-inline: dynamic background/color from user-configurable profile.color */}
                                <div className="w-11 h-11 rounded-[10px] flex items-center justify-center" style={{ background: `${profile.color}15`, color: profile.color  /* keep-inline */ }}>{ICONS[profile.icon] || <ShoppingBag size={20} />}</div>
                                <div><h3 className="text-[17px] font-semibold m-0">{profile.name} {profile.code && <span className="pos-cell-secondary text-[10px] font-normal">({profile.code})</span>}</h3>
                                    <span className="pos-cell-secondary">{profile.taxProfile}</span></div>
                            </div>
                            <span className={`pos-badge ${profile.isActive ? 'pos-badge--green' : 'pos-badge--red'} text-[9px]`}>{profile.isActive ? 'Active' : 'Off'}</span>
                        </div>
                        <div className="pos-flex pos-flex--wrap pos-gap-6">
                            {profile.requiresTable && <span className="pos-badge pos-badge--blue">Table Required</span>}
                            {profile.requiresCustomer && <span className="pos-badge pos-badge--purple">Customer Required</span>}
                            {profile.requiresAddress && <span className="pos-badge pos-badge--amber">Address Required</span>}
                            {profile.continuous && <span className="pos-badge pos-badge--cyan">Continuous</span>}
                            {profile.takeawayMode !== 'none' && <span className="pos-badge pos-badge--green capitalize">{profile.takeawayMode}</span>}
                            {profile.autoGratuity > 0 && <span className="pos-badge pos-badge--amber">Gratuity {profile.autoGratuity}%</span>}
                        </div>
                        <div className="pos-cell-secondary mt-2">Print: {profile.printProfile} {profile.serviceCharge !== '— None —' && ` · ${profile.serviceCharge}`}</div>
                    </div>
                ))}
            </div>
        </div>

            {editing && <div className="pos-modal-overlay" onClick={() => setEditing(null)}>
                <div className="pos-card pos-modal max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
                    <div className="pos-modal-header"><h3 className="pos-modal-title">{profiles.find(p => p.id === editing.id) ? 'Edit' : 'New'} Order Profile</h3><button title="Close" className="pos-btn-icon" onClick={() => setEditing(null)}><X size={20} /></button></div>
                    <div className="pos-form-grid grid-cols-[2fr_1fr]">
                        <div><label className="pos-form-label">Name *</label><input aria-label="Input field" className="pos-input" value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Dine-In" /></div>
                        <div><label className="pos-form-label">Code</label><input aria-label="Input field" className="pos-input" value={editing.code} onChange={e => setEditing(p => p ? { ...p, code: e.target.value.toUpperCase() } : null)} placeholder="e.g. DINE" maxLength={8} /></div>
                    </div>
                    <div className="pos-form-group"><label className="pos-form-label pos-mb-4">Icon</label>
                        <div className="pos-flex pos-flex--wrap pos-gap-6">{Object.keys(ICONS).map(key => (
                            <button key={key} onClick={() => setEditing(p => p ? { ...p, icon: key } : null)} className={`pos-btn-outline py-1.5 px-3.5 ${editing.icon === key ? 'pos-badge--blue border-blue-500 bg-blue-500/10' : ''}`} title={key}>{ICONS[key]} {key}</button>
                        ))}</div></div>
                    <div className="pos-form-grid grid-cols-[1fr_auto]">
                        <div><label className="pos-form-label pos-mb-4">Color</label><div className="pos-flex pos-gap-6">{['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1'].map(c => (
                            // keep-inline: dynamic background from color picker palette
                            <div key={c} onClick={() => setEditing(p => p ? { ...p, color: c } : null)} className="w-7 h-7 rounded-md cursor-pointer" style={{ background: c, border: editing.color === c ? '3px solid #fff' : '3px solid transparent'  /* keep-inline */ }} /* keep-inline */ />))}</div></div>
                        <div><label className="pos-form-label">Sort Order</label><input aria-label="Input field" type="number" min={0} className="pos-input w-20 text-center" value={editing.sortOrder} onChange={e => setEditing(p => p ? { ...p, sortOrder: parseInt(e.target.value) || 0 } : null)}  /></div>
                    </div>
                    <div className="pos-form-grid">
                        <div><label className="pos-form-label">Tax Profile</label><select aria-label="Select option" className="pos-select" value={editing.taxProfile} onChange={e => setEditing(p => p ? { ...p, taxProfile: e.target.value } : null)} >{TAX_PROFILES.map(t => <option key={t}>{t}</option>)}</select></div>
                        <div><label className="pos-form-label">Print Profile</label><select aria-label="Select option" className="pos-select" value={editing.printProfile} onChange={e => setEditing(p => p ? { ...p, printProfile: e.target.value } : null)} >{PRINT_PROFILES.map(p => <option key={p}>{p}</option>)}</select></div>
                    </div>
                    {/* Takeaway Section */}
                    <div className="pos-card pos-form-group bg-[var(--bg-secondary,#09090b)] p-3.5">
                        <div className="pos-text-xs pos-text-bold pos-text-secondary pos-mb-8 uppercase tracking-wide">Takeaway</div>
                        <div className="pos-form-grid">
                            <div><label className="pos-form-label">Mode</label><select aria-label="Select option" className="pos-select" value={editing.takeawayMode} onChange={e => setEditing(p => p ? { ...p, takeawayMode: e.target.value as OrderProfile['takeawayMode'] } : null)} ><option value="none">None (Dine-in)</option><option value="pickup">Pickup</option><option value="delivery">Delivery</option></select></div>
                            {editing.takeawayMode === 'delivery' && <div><label className="pos-form-label">Delivery Delay</label><select aria-label="Select option" className="pos-select" value={editing.deliveryDelay} onChange={e => setEditing(p => p ? { ...p, deliveryDelay: e.target.value as OrderProfile['deliveryDelay'] } : null)} ><option value="none">{"No "}delay</option><option value="custom">Custom delay</option><option value="no-time">{"No "}delivery time</option></select></div>}
                        </div>
                    </div>
                    {/* Service Charges Section */}
                    <div className="pos-card pos-form-group bg-[var(--bg-secondary,#09090b)] p-3.5">
                        <div className="pos-text-xs pos-text-bold pos-text-secondary pos-mb-8 uppercase tracking-wide">Service Charges & Gratuity</div>
                        <div className="pos-form-grid">
                            <div><label className="pos-form-label">Service Charge</label><select aria-label="Select option" className="pos-select" value={editing.serviceCharge} onChange={e => setEditing(p => p ? { ...p, serviceCharge: e.target.value } : null)} >{SERVICE_CHARGES.map(s => <option key={s}>{s}</option>)}</select></div>
                            <div><label className="pos-form-label">Automatic Gratuity %</label><input aria-label="Input field" type="number" min={0} max={100} step={0.5} className="pos-input" value={editing.autoGratuity} onChange={e => setEditing(p => p ? { ...p, autoGratuity: parseFloat(e.target.value) || 0 } : null)}  /></div>
                        </div>
                        {editing.autoGratuity > 0 && <div className="pos-flex pos-flex--center pos-flex--between py-2.5 border-b border-white/[0.04]"><span className="pos-cell-value">Apply to quick payment buttons</span><Toggle value={editing.applyToQuickPay} onChange={() => setEditing(p => p ? { ...p, applyToQuickPay: !p.applyToQuickPay } : null)} /></div>}
                    </div>
                    {/* Requirements & Behavior */}
                    <div className="pos-card pos-form-group bg-[var(--bg-secondary,#09090b)] p-3.5">
                        <div className="pos-text-xs pos-text-bold pos-text-secondary pos-mb-8 uppercase tracking-wide">Requirements & Behavior</div>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {([['continuous', 'Continuous (stays active for subsequent orders)'], ['orderModifier', 'Order modifier (affects tax on posted items)'], ['requiresTable', 'Requires table selection'], ['requiresCustomer', 'Requires customer info'], ['requiresAddress', 'Requires delivery address'], ['autoOpenDrawer', 'Auto-open cash drawer'], ['autoCloseAfterPayment', 'Auto-close after payment'], ['isActive', 'Active']] as const).map(([key, label]) =>
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            <div key={key} className="pos-flex pos-flex--center pos-flex--between py-2.5 border-b border-white/[0.04]"><span className="pos-cell-value">{label}</span><Toggle value={editing[key] as boolean} onChange={() => setEditing(p => p ? { ...p, [key]: !(p as/**/any as /**/any)[key] } : null)} /></div>
                        )}
                    </div>
                    <div className="pos-modal-footer">
                        <button className="pos-btn-primary flex-1 justify-center" onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete profile" className="pos-btn-outline text-red-400 border-red-500/30" onClick={() => { setProfiles(prev => prev.filter(p => p.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button className="pos-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default OrderProfiles;
