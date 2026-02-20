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

interface OrderProfile {
    id: string; name: string; code: string; icon: string; color: string; taxProfile: string; printProfile: string;
    continuous: boolean; orderModifier: boolean;
    takeawayMode: 'none' | 'pickup' | 'delivery';
    deliveryDelay: 'none' | 'custom' | 'no-time';
    serviceCharge: string; autoGratuity: number; applyToQuickPay: boolean;
    requiresTable: boolean; requiresCustomer: boolean; requiresAddress: boolean;
    autoOpenDrawer: boolean; autoCloseAfterPayment: boolean; isActive: boolean; sortOrder: number;
}
const SERVICE_CHARGES = ['— None —', '10% Service', '12.5% Service', '15% Service', 'Cover Charge €2'];

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };
const sl: React.CSSProperties = { ...ip, cursor: 'pointer' };
const rw: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' };

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
    <div style={{ width: 44, height: 24, borderRadius: 12, background: value ? '#3B82F6' : '#3f3f46', cursor: 'pointer', position: 'relative' }} onClick={onChange}>
        <div style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
);

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
            setProfiles(apiData.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (p: any) => ({ id: p.id || p._id || crypto.randomUUID(), name: p.name || '', code: p.code || '', icon: p.icon || 'dine-in', color: p.color || '#3B82F6', taxProfile: p.taxProfile ?? p.tax_profile ?? 'Standard 18%', printProfile: p.printProfile ?? p.print_profile ?? 'Receipt (Front Counter)', continuous: p.continuous ?? false, orderModifier: p.orderModifier ?? p.order_modifier ?? false, takeawayMode: p.takeawayMode ?? p.takeaway_mode ?? 'none', deliveryDelay: p.deliveryDelay ?? p.delivery_delay ?? 'none', serviceCharge: p.serviceCharge ?? p.service_charge ?? '— None —', autoGratuity: p.autoGratuity ?? p.auto_gratuity ?? 0, applyToQuickPay: p.applyToQuickPay ?? p.apply_to_quick_pay ?? false, requiresTable: p.requiresTable ?? p.requires_table ?? false, requiresCustomer: p.requiresCustomer ?? p.requires_customer ?? false, requiresAddress: p.requiresAddress ?? p.requires_address ?? false, autoOpenDrawer: p.autoOpenDrawer ?? p.auto_open_drawer ?? false, autoCloseAfterPayment: p.autoCloseAfterPayment ?? p.auto_close_after_payment ?? true, isActive: p.isActive ?? p.is_active ?? true, sortOrder: p.sortOrder ?? p.sort_order ?? 0 }))); setIsLive(true);
        }
    }, [apiData]);
    const filtered = profiles.sort((a, b) => a.sortOrder - b.sortOrder);

    const save = () => { if (!editing) return; const e = profiles.find(p => p.id === editing.id); if (e) setProfiles(prev => prev.map(p => p.id === editing.id ? editing : p)); else setProfiles(prev => [...prev, editing]); setEditing(null); toast.success('Saved'); };

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Order Profiles {isLive && <Wifi size={14} style={{ color: '#10B981', verticalAlign: 'middle', marginLeft: 6 }} />}</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Configure order types with specific tax profiles, printing, and required fields</p>
                </div>
                <button style={bp} onClick={() => setEditing({ id: crypto.randomUUID(), name: '', code: '', icon: 'dine-in', color: '#3B82F6', taxProfile: TAX_PROFILES[0], printProfile: PRINT_PROFILES[0], continuous: false, orderModifier: false, takeawayMode: 'none', deliveryDelay: 'none', serviceCharge: '— None —', autoGratuity: 0, applyToQuickPay: false, requiresTable: false, requiresCustomer: false, requiresAddress: false, autoOpenDrawer: false, autoCloseAfterPayment: true, isActive: true, sortOrder: profiles.length + 1 })}><Plus size={16} /> Add Profile</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
                {filtered.map(profile => (
                    <div key={profile.id} style={{ ...cd, cursor: 'pointer', borderLeft: `4px solid ${profile.color}`, opacity: profile.isActive ? 1 : 0.5 }} onClick={() => setEditing({ ...profile })}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${profile.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: profile.color }}>
                                    {ICONS[profile.icon] || <ShoppingBag size={20} />}
                                </div>
                                <div><h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{profile.name} {profile.code && <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 400 }}>({profile.code})</span>}</h3>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{profile.taxProfile}</span></div>
                            </div>
                            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: profile.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: profile.isActive ? '#10B981' : '#EF4444' }}>{profile.isActive ? 'Active' : 'Off'}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {profile.requiresTable && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>Table Required</span>}
                            {profile.requiresCustomer && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>Customer Required</span>}
                            {profile.requiresAddress && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>Address Required</span>}
                            {profile.continuous && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(6,182,212,0.1)', color: '#06B6D4' }}>Continuous</span>}
                            {profile.takeawayMode !== 'none' && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(16,185,129,0.1)', color: '#10B981', textTransform: 'capitalize' }}>{profile.takeawayMode}</span>}
                            {profile.autoGratuity > 0 && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>Gratuity {profile.autoGratuity}%</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>Print: {profile.printProfile} {profile.serviceCharge !== '— None —' && ` · ${profile.serviceCharge}`}</div>
                    </div>
                ))}
            </div>
        </div>

            {editing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
                <div style={{ ...cd, width: 480, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{profiles.find(p => p.id === editing.id) ? 'Edit' : 'New'} Order Profile</h3>
                        <button title="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name *</label>
                            <input style={ip} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Dine-In" /></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Code</label>
                            <input style={ip} value={editing.code} onChange={e => setEditing(p => p ? { ...p, code: e.target.value.toUpperCase() } : null)} placeholder="e.g. DINE" maxLength={8} /></div>
                    </div>
                    {/* Icon, Color & Sort Order */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Icon</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {Object.keys(ICONS).map(key => (
                                <button key={key} onClick={() => setEditing(p => p ? { ...p, icon: key } : null)} style={{ padding: '6px 14px', borderRadius: 8, border: editing.icon === key ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.06)', background: editing.icon === key ? 'rgba(59,130,246,0.1)' : 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} title={key}>{ICONS[key]} {key}</button>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, marginBottom: 14 }}>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Color</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1'].map(c => (
                                    <div key={c} onClick={() => setEditing(p => p ? { ...p, color: c } : null)} style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer', border: editing.color === c ? '3px solid #fff' : '3px solid transparent' }} />
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Sort Order</label>
                            <input type="number" min={0} style={{ ...ip, width: 80, textAlign: 'center' }} value={editing.sortOrder} onChange={e => setEditing(p => p ? { ...p, sortOrder: parseInt(e.target.value) || 0 } : null)} aria-label="Sort order" />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Tax Profile</label>
                            <select style={sl} value={editing.taxProfile} onChange={e => setEditing(p => p ? { ...p, taxProfile: e.target.value } : null)} aria-label="Tax profile">{TAX_PROFILES.map(t => <option key={t}>{t}</option>)}</select></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Print Profile</label>
                            <select style={sl} value={editing.printProfile} onChange={e => setEditing(p => p ? { ...p, printProfile: e.target.value } : null)} aria-label="Print profile">{PRINT_PROFILES.map(p => <option key={p}>{p}</option>)}</select></div>
                    </div>
                    {/* Takeaway Section */}
                    <div style={{ ...cd, background: 'var(--bg-secondary,#09090b)', padding: 14, marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: 0.5 }}>Takeaway</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
                            <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Mode</label>
                                <select style={sl} value={editing.takeawayMode} onChange={e => setEditing(p => p ? { ...p, takeawayMode: e.target.value as OrderProfile['takeawayMode'] } : null)} aria-label="Takeaway mode"><option value="none">None (Dine-in)</option><option value="pickup">Pickup</option><option value="delivery">Delivery</option></select></div>
                            {editing.takeawayMode === 'delivery' && <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Delivery Delay</label>
                                <select style={sl} value={editing.deliveryDelay} onChange={e => setEditing(p => p ? { ...p, deliveryDelay: e.target.value as OrderProfile['deliveryDelay'] } : null)} aria-label="Delivery delay"><option value="none">No delay</option><option value="custom">Custom delay</option><option value="no-time">No delivery time</option></select></div>}
                        </div>
                    </div>
                    {/* Service Charges Section */}
                    <div style={{ ...cd, background: 'var(--bg-secondary,#09090b)', padding: 14, marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: 0.5 }}>Service Charges & Gratuity</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
                            <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Service Charge</label>
                                <select style={sl} value={editing.serviceCharge} onChange={e => setEditing(p => p ? { ...p, serviceCharge: e.target.value } : null)} aria-label="Service charge">{SERVICE_CHARGES.map(s => <option key={s}>{s}</option>)}</select></div>
                            <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Automatic Gratuity %</label>
                                <input type="number" min={0} max={100} step={0.5} style={ip} value={editing.autoGratuity} onChange={e => setEditing(p => p ? { ...p, autoGratuity: parseFloat(e.target.value) || 0 } : null)} aria-label="Automatic gratuity percentage" /></div>
                        </div>
                        {editing.autoGratuity > 0 && <div style={rw}><span style={{ fontSize: 13 }}>Apply to quick payment buttons</span><Toggle value={editing.applyToQuickPay} onChange={() => setEditing(p => p ? { ...p, applyToQuickPay: !p.applyToQuickPay } : null)} /></div>}
                    </div>
                    {/* Requirements & Behavior */}
                    <div style={{ ...cd, background: 'var(--bg-secondary,#09090b)', padding: 14, marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: 0.5 }}>Requirements & Behavior</div>
                        {([['continuous', 'Continuous (stays active for subsequent orders)'], ['orderModifier', 'Order modifier (affects tax on posted items)'], ['requiresTable', 'Requires table selection'], ['requiresCustomer', 'Requires customer info'], ['requiresAddress', 'Requires delivery address'], ['autoOpenDrawer', 'Auto-open cash drawer'], ['autoCloseAfterPayment', 'Auto-close after payment'], ['isActive', 'Active']] as const).map(([key, label]) =>
                            <div key={key} style={rw}><span style={{ fontSize: 13 }}>{label}</span><Toggle value={editing[key] as boolean} onChange={() => setEditing(p => p ? { ...p, [key]: !(p as any)[key] } : null)} /></div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete profile" style={{ ...bo, color: '#EF4444' }} onClick={() => { setProfiles(prev => prev.filter(p => p.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button style={bo} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default OrderProfiles;
