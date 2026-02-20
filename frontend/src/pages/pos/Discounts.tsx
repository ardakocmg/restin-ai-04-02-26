/**
 * Discounts.tsx — K-Series Discounts Management
 * Percentage/fixed discounts with rules and scheduling
 * Lightspeed K-Series Back Office > Configuration > Discounts parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, Search, X, Tag, Percent, DollarSign, Clock, Wifi, QrCode, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';

interface Discount { id: string; name: string; type: 'percentage' | 'fixed'; value: number; isCustom: boolean; group: string; excludedAccountingGroups: string[]; qrEnabled: boolean; requiresReason: boolean; requiresManager: boolean; applicableTo: 'all' | 'food' | 'beverage' | 'specific'; maxUsesPerDay: number; schedule: string; isActive: boolean; usesToday: number; sortOrder: number; }
const DISCOUNT_GROUPS = ['General', 'Staff', 'Promotion', 'Loyalty', 'VIP', 'Seasonal'];
const ACCOUNTING_GROUPS_LIST = ['Food', 'Beverages', 'Alcohol', 'Desserts', 'Non-Food', 'Merchandise'];

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };
const sl: React.CSSProperties = { ...ip, cursor: 'pointer' };

const SEED: Discount[] = [
    { id: '1', name: 'Staff Discount', type: 'percentage', value: 25, isCustom: false, group: 'Staff', excludedAccountingGroups: [], qrEnabled: false, requiresReason: false, requiresManager: false, applicableTo: 'all', maxUsesPerDay: 0, schedule: 'Always', isActive: true, usesToday: 3, sortOrder: 1 },
    { id: '2', name: 'Happy Hour', type: 'percentage', value: 20, isCustom: false, group: 'Promotion', excludedAccountingGroups: ['Non-Food'], qrEnabled: true, requiresReason: false, requiresManager: false, applicableTo: 'beverage', maxUsesPerDay: 0, schedule: 'Mon-Fri 16:00-18:00', isActive: true, usesToday: 12, sortOrder: 2 },
    { id: '3', name: 'Comp Item', type: 'percentage', value: 100, isCustom: false, group: 'General', excludedAccountingGroups: [], qrEnabled: false, requiresReason: true, requiresManager: true, applicableTo: 'all', maxUsesPerDay: 5, schedule: 'Always', isActive: true, usesToday: 1, sortOrder: 3 },
    { id: '4', name: '10% Off', type: 'percentage', value: 10, isCustom: true, group: 'General', excludedAccountingGroups: [], qrEnabled: true, requiresReason: false, requiresManager: false, applicableTo: 'all', maxUsesPerDay: 0, schedule: 'Always', isActive: true, usesToday: 5, sortOrder: 4 },
    { id: '5', name: '€5 Off', type: 'fixed', value: 5, isCustom: false, group: 'Promotion', excludedAccountingGroups: ['Alcohol'], qrEnabled: false, requiresReason: false, requiresManager: false, applicableTo: 'food', maxUsesPerDay: 20, schedule: 'Always', isActive: true, usesToday: 2, sortOrder: 5 },
    { id: '6', name: 'VIP Discount', type: 'percentage', value: 15, isCustom: false, group: 'VIP', excludedAccountingGroups: [], qrEnabled: true, requiresReason: false, requiresManager: false, applicableTo: 'all', maxUsesPerDay: 0, schedule: 'Always', isActive: true, usesToday: 0, sortOrder: 6 },
    { id: '7', name: 'Opening Special', type: 'percentage', value: 30, isCustom: false, group: 'Seasonal', excludedAccountingGroups: [], qrEnabled: false, requiresReason: false, requiresManager: true, applicableTo: 'all', maxUsesPerDay: 50, schedule: 'Weekends Only', isActive: false, usesToday: 0, sortOrder: 7 },
];

const Discounts: React.FC = () => {
    const navigate = useNavigate();
    const [discounts, setDiscounts] = useState(SEED);
    const [editing, setEditing] = useState<Discount | null>(null);
    const [search, setSearch] = useState('');
    const [isLive, setIsLive] = useState(false);

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiData } = useVenueConfig<Discount>({ venueId, configType: 'discounts' });
    useEffect(() => {
        if (apiData && apiData.length > 0) {
            setDiscounts(apiData.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (d: any) => ({ id: d.id || d._id || crypto.randomUUID(), name: d.name || '', type: d.type || 'percentage', value: d.value ?? 0, isCustom: d.isCustom ?? d.is_custom ?? false, group: d.group || '', excludedAccountingGroups: d.excludedAccountingGroups ?? d.excluded_accounting_groups ?? [], qrEnabled: d.qrEnabled ?? d.qr_enabled ?? false, requiresReason: d.requiresReason ?? d.requires_reason ?? false, requiresManager: d.requiresManager ?? d.requires_manager ?? false, applicableTo: d.applicableTo ?? d.applicable_to ?? 'all', maxUsesPerDay: d.maxUsesPerDay ?? d.max_uses_per_day ?? 0, schedule: d.schedule || 'Always', isActive: d.isActive ?? d.is_active ?? true, usesToday: d.usesToday ?? d.uses_today ?? 0, sortOrder: d.sortOrder ?? d.sort_order ?? 0 }))); setIsLive(true);
        }
    }, [apiData]);
    const filtered = discounts.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()));

    const save = () => { if (!editing) return; const e = discounts.find(d => d.id === editing.id); if (e) setDiscounts(p => p.map(d => d.id === editing.id ? editing : d)); else setDiscounts(p => [...p, editing]); setEditing(null); toast.success('Saved'); };

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Discounts {isLive && <Wifi size={14} style={{ color: '#10B981', verticalAlign: 'middle', marginLeft: 6 }} />}</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Manage percentage and fixed discounts with rules and scheduling</p>
                </div>
                <button style={bp} onClick={() => setEditing({ id: crypto.randomUUID(), name: '', type: 'percentage', value: 10, isCustom: false, group: '', excludedAccountingGroups: [], qrEnabled: false, requiresReason: false, requiresManager: false, applicableTo: 'all', maxUsesPerDay: 0, schedule: 'Always', isActive: true, usesToday: 0, sortOrder: discounts.length + 1 })}><Plus size={16} /> Add Discount</button>
            </div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-secondary)' }} />
                <input style={{ ...ip, paddingLeft: 36 }} placeholder="Search discounts..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div style={cd}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 90px 80px 80px 50px', gap: 10, padding: '8px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>Discount</div><div>Value</div><div>Group</div><div>Applies To</div><div>Schedule</div><div>Uses</div><div></div>
                </div>
                {filtered.map(d => (
                    <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 90px 80px 80px 50px', gap: 10, padding: '14px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', opacity: d.isActive ? 1 : 0.5 }} onClick={() => setEditing({ ...d })}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: d.type === 'percentage' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: d.type === 'percentage' ? '#3B82F6' : '#10B981' }}>
                                {d.type === 'percentage' ? <Percent size={16} /> : <DollarSign size={16} />}
                            </div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{d.name}</div>
                                <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                                    {d.requiresManager && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>Manager</span>}
                                    {d.requiresReason && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>Reason</span>}
                                    {d.isCustom && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>Custom</span>}
                                    {d.qrEnabled && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(6,182,212,0.1)', color: '#06B6D4' }}>QR</span>}
                                </div>
                            </div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 700, color: d.type === 'percentage' ? '#3B82F6' : '#10B981' }}>{d.type === 'percentage' ? `${d.value}%` : `€${d.value}`}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{d.group || '—'}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{d.applicableTo}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{d.schedule}</span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{d.usesToday}{d.maxUsesPerDay > 0 && <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>/{d.maxUsesPerDay}</span>}</span>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setEditing({ ...d }); }}><Edit3 size={13} /></button>
                    </div>
                ))}
            </div>
        </div>

            {editing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
                <div style={{ ...cd, width: 480 }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{discounts.find(d => d.id === editing.id) ? 'Edit' : 'New'} Discount</h3>
                        <button title="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name * <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>({editing.name.length}/25)</span></label>
                        <input style={ip} maxLength={25} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Staff Discount" /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Type</label>
                            <select style={sl} value={editing.type} onChange={e => setEditing(p => p ? { ...p, type: e.target.value as 'percentage' | 'fixed' } : null)} aria-label="Discount type"><option value="percentage">Percentage (%)</option><option value="fixed">Fixed Amount (€)</option></select></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Value</label>
                            <input type="number" step="0.01" style={ip} value={editing.value} onChange={e => setEditing(p => p ? { ...p, value: parseFloat(e.target.value) || 0 } : null)} aria-label="Discount value" /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Applies To</label>
                            <select style={sl} value={editing.applicableTo} onChange={e => setEditing(p => p ? { ...p, applicableTo: e.target.value as Discount['applicableTo'] } : null)} aria-label="Applies to"><option value="all">All Items</option><option value="food">Food Only</option><option value="beverage">Beverages Only</option><option value="specific">Specific Items</option></select></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Max Uses/Day (0=unlimited)</label>
                            <input type="number" min={0} style={ip} value={editing.maxUsesPerDay} onChange={e => setEditing(p => p ? { ...p, maxUsesPerDay: parseInt(e.target.value) || 0 } : null)} aria-label="Max uses per day" /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Discount Group</label>
                            <select style={sl} value={editing.group} onChange={e => setEditing(p => p ? { ...p, group: e.target.value } : null)} aria-label="Discount group"><option value="">— None —</option>{DISCOUNT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Schedule</label>
                            <input style={ip} value={editing.schedule} onChange={e => setEditing(p => p ? { ...p, schedule: e.target.value } : null)} placeholder="e.g. Always, Mon-Fri 16:00-18:00" /></div>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Sort Order</label>
                        <input type="number" min={0} style={{ ...ip, width: 100 }} value={editing.sortOrder} onChange={e => setEditing(p => p ? { ...p, sortOrder: parseInt(e.target.value) || 0 } : null)} aria-label="Sort order" />
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Exclude Accounting Groups</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {ACCOUNTING_GROUPS_LIST.map(ag => (<label key={ag} style={{ fontSize: 11, color: editing.excludedAccountingGroups.includes(ag) ? '#EF4444' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, background: editing.excludedAccountingGroups.includes(ag) ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (editing.excludedAccountingGroups.includes(ag) ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)') }}>
                                <input type="checkbox" checked={editing.excludedAccountingGroups.includes(ag)} onChange={() => setEditing(p => { if (!p) return null; const ex = p.excludedAccountingGroups.includes(ag) ? p.excludedAccountingGroups.filter(x => x !== ag) : [...p.excludedAccountingGroups, ag]; return { ...p, excludedAccountingGroups: ex }; })} /> {ag}</label>))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                        {([['isCustom', 'Custom discount (POS user enters amount)'], ['qrEnabled', 'Enable QR code'], ['requiresReason', 'Requires reason'], ['requiresManager', 'Requires manager'], ['isActive', 'Active']] as const).map(([key, label]) =>
                            <label key={key} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <input type="checkbox" checked={editing[key] as boolean} onChange={() => setEditing(p => p ? { ...p, [key]: !(p as any)[key] } : null)} /> {label}</label>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete discount" style={{ ...bo, color: '#EF4444' }} onClick={() => { setDiscounts(p => p.filter(d => d.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button style={bo} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default Discounts;
