/**
 * Discounts.tsx — K-Series Discounts Management
 * Percentage/fixed discounts with rules and scheduling
 * Lightspeed K-Series Back Office > Configuration > Discounts parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, Search, X, Tag, Percent, DollarSign, Clock, Wifi, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';
import './pos-shared.css';

interface Discount { id: string; name: string; type: 'percentage' | 'fixed'; value: number; isCustom: boolean; group: string; excludedAccountingGroups: string[]; qrEnabled: boolean; requiresReason: boolean; requiresManager: boolean; applicableTo: 'all' | 'food' | 'beverage' | 'specific'; maxUsesPerDay: number; schedule: string; isActive: boolean; usesToday: number; sortOrder: number; }
const DISCOUNT_GROUPS = ['General', 'Staff', 'Promotion', 'Loyalty', 'VIP', 'Seasonal'];
const ACCOUNTING_GROUPS_LIST = ['Food', 'Beverages', 'Alcohol', 'Desserts', 'Non-Food', 'Merchandise'];
// keep-inline: gridTemplateColumns uses a runtime string variable
const discountTableCols = '1fr 80px 100px 90px 80px 80px 50px';

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setDiscounts(apiData.map((d: Record<string, unknown>) => ({ id: d.id || d._id || crypto.randomUUID(), name: d.name || '', type: d.type || 'percentage', value: d.value ?? 0, isCustom: d.isCustom ?? d.is_custom ?? false, group: d.group || '', excludedAccountingGroups: d.excludedAccountingGroups ?? d.excluded_accounting_groups ?? [], qrEnabled: d.qrEnabled ?? d.qr_enabled ?? false, requiresReason: d.requiresReason ?? d.requires_reason ?? false, requiresManager: d.requiresManager ?? d.requires_manager ?? false, applicableTo: d.applicableTo ?? d.applicable_to ?? 'all', maxUsesPerDay: d.maxUsesPerDay ?? d.max_uses_per_day ?? 0, schedule: d.schedule || 'Always', isActive: d.isActive ?? d.is_active ?? true, usesToday: d.usesToday ?? d.uses_today ?? 0, sortOrder: d.sortOrder ?? d.sort_order ?? 0 }) as Discount)); setIsLive(true);
        }
    }, [apiData]);
    const filtered = discounts.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()));

    const save = () => { if (!editing) return; const e = discounts.find(d => d.id === editing.id); if (e) setDiscounts(p => p.map(d => d.id === editing.id ? editing : d)); else setDiscounts(p => [...p, editing]); setEditing(null); toast.success('Saved'); };

    return (
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Discounts {isLive && <Wifi size={14} className="pos-live-icon" />}</h1>
                    <p className="pos-subtitle">Manage percentage and fixed discounts with rules and scheduling</p>
                </div>
                <button className="pos-btn-primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', type: 'percentage', value: 10, isCustom: false, group: '', excludedAccountingGroups: [], qrEnabled: false, requiresReason: false, requiresManager: false, applicableTo: 'all', maxUsesPerDay: 0, schedule: 'Always', isActive: true, usesToday: 0, sortOrder: discounts.length + 1 })}><Plus size={16} /> Add Discount</button>
            </div>

            <div className="pos-search-wrapper pos-mb-16">
                <Search size={14} className="pos-search-icon" />
                <input className="pos-input pos-search-input" placeholder="Search discounts..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="pos-card">
                {/* keep-inline: gridTemplateColumns uses runtime variable */}
                <div className="pos-table-header gap-2.5" style={{ gridTemplateColumns: discountTableCols }}>
                    <div>Discount</div><div>Value</div><div>Group</div><div>Applies To</div><div>Schedule</div><div>Uses</div><div></div>
                </div>
                {filtered.map(d => (
                    // keep-inline: gridTemplateColumns uses runtime variable
                    <div key={d.id} className={`pos-table-row gap-2.5${d.isActive ? '' : ' opacity-50'}`} style={{ gridTemplateColumns: discountTableCols }} onClick={() => setEditing({ ...d })}>
                        <div className="pos-flex pos-flex--center pos-gap-10">
                            <div className={`pos-stat-icon ${d.type === 'percentage' ? 'pos-stat-icon--blue' : 'pos-stat-icon--green'}`}>
                                {d.type === 'percentage' ? <Percent size={16} /> : <DollarSign size={16} />}
                            </div>
                            <div>
                                <div className="pos-cell-value">{d.name}</div>
                                <div className="pos-flex pos-gap-4 mt-0.5">
                                    {d.requiresManager && <span className="pos-badge pos-badge--red text-[9px]">Manager</span>}
                                    {d.requiresReason && <span className="pos-badge pos-badge--amber text-[9px]">Reason</span>}
                                    {d.isCustom && <span className="pos-badge pos-badge--purple text-[9px]">Custom</span>}
                                    {d.qrEnabled && <span className="pos-badge bg-cyan-500/10 text-cyan-500 text-[9px]">QR</span>}
                                </div>
                            </div>
                        </div>
                        <span className={`text-base font-bold ${d.type === 'percentage' ? 'text-blue-500' : 'text-emerald-500'}`}>{d.type === 'percentage' ? `${d.value}%` : `€${d.value}`}</span>
                        <span className="pos-cell-secondary">{d.group || '—'}</span>
                        <span className="pos-cell-secondary capitalize">{d.applicableTo}</span>
                        <span className="pos-cell-secondary text-[10px]">{d.schedule}</span>
                        <span className="pos-cell-value">{d.usesToday}{d.maxUsesPerDay > 0 && <span className="pos-text-secondary text-[11px]">/{d.maxUsesPerDay}</span>}</span>
                        <button className="pos-btn-icon" onClick={e => { e.stopPropagation(); setEditing({ ...d }); }}><Edit3 size={13} /></button>
                    </div>
                ))}
            </div>
        </div>

            {editing && <div className="pos-modal-overlay" onClick={() => setEditing(null)}>
                <div className="pos-card pos-modal pos-modal--sm" onClick={e => e.stopPropagation()}>
                    <div className="pos-modal-header">
                        <h3 className="pos-modal-title">{discounts.find(d => d.id === editing.id) ? 'Edit' : 'New'} Discount</h3>
                        <button title="Close" className="pos-btn-icon" onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div className="pos-form-group"><label className="pos-form-label">Name * <span className="pos-text-secondary text-[10px]">({editing.name.length}/25)</span></label>
                        <input className="pos-input" maxLength={25} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Staff Discount" aria-label="Discount name" /></div>
                    <div className="pos-form-grid">
                        <div><label className="pos-form-label">Type</label>
                            <select className="pos-select" value={editing.type} onChange={e => setEditing(p => p ? { ...p, type: e.target.value as 'percentage' | 'fixed' } : null)} aria-label="Discount type"><option value="percentage">Percentage (%)</option><option value="fixed">Fixed Amount (€)</option></select></div>
                        <div><label className="pos-form-label">Value</label>
                            <input type="number" step="0.01" className="pos-input" value={editing.value} onChange={e => setEditing(p => p ? { ...p, value: parseFloat(e.target.value) || 0 } : null)} aria-label="Discount value" /></div>
                    </div>
                    <div className="pos-form-grid">
                        <div><label className="pos-form-label">Applies To</label>
                            <select className="pos-select" value={editing.applicableTo} onChange={e => setEditing(p => p ? { ...p, applicableTo: e.target.value as Discount['applicableTo'] } : null)} aria-label="Applies to"><option value="all">All Items</option><option value="food">Food Only</option><option value="beverage">Beverages Only</option><option value="specific">Specific Items</option></select></div>
                        <div><label className="pos-form-label">Max Uses/Day (0=unlimited)</label>
                            <input type="number" min={0} className="pos-input" value={editing.maxUsesPerDay} onChange={e => setEditing(p => p ? { ...p, maxUsesPerDay: parseInt(e.target.value) || 0 } : null)} aria-label="Max uses per day" /></div>
                    </div>
                    <div className="pos-form-grid">
                        <div><label className="pos-form-label">Discount Group</label>
                            <select className="pos-select" value={editing.group} onChange={e => setEditing(p => p ? { ...p, group: e.target.value } : null)} aria-label="Discount group"><option value="">— None —</option>{DISCOUNT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                        <div><label className="pos-form-label">Schedule</label>
                            <input className="pos-input" value={editing.schedule} onChange={e => setEditing(p => p ? { ...p, schedule: e.target.value } : null)} placeholder="e.g. Always, Mon-Fri 16:00-18:00" aria-label="Schedule" /></div>
                    </div>
                    <div className="pos-form-group"><label className="pos-form-label">Sort Order</label>
                        <input type="number" min={0} className="pos-input w-[100px]" value={editing.sortOrder} onChange={e => setEditing(p => p ? { ...p, sortOrder: parseInt(e.target.value) || 0 } : null)} aria-label="Sort order" />
                    </div>
                    <div className="pos-form-group"><label className="pos-form-label">Exclude Accounting Groups</label>
                        <div className="pos-flex pos-gap-8 pos-flex--wrap">
                            {ACCOUNTING_GROUPS_LIST.map(ag => (<label key={ag} className={`pos-toggle-label text-[11px] py-1 px-2 rounded-md ${editing.excludedAccountingGroups.includes(ag) ? 'text-red-500 bg-red-500/[0.08] border border-red-500/20' : 'bg-white/[0.03] border border-white/[0.06]'}`}>
                                <input type="checkbox" checked={editing.excludedAccountingGroups.includes(ag)} onChange={() => setEditing(p => { if (!p) return null; const ex = p.excludedAccountingGroups.includes(ag) ? p.excludedAccountingGroups.filter(x => x !== ag) : [...p.excludedAccountingGroups, ag]; return { ...p, excludedAccountingGroups: ex }; })} /> {ag}</label>))}
                        </div>
                    </div>
                    <div className="pos-flex pos-gap-16 pos-mb-16 pos-flex--wrap">
                        {([['isCustom', 'Custom discount (POS user enters amount)'], ['qrEnabled', 'Enable QR code'], ['requiresReason', 'Requires reason'], ['requiresManager', 'Requires manager'], ['isActive', 'Active']] as const).map(([key, label]) =>
                            <label key={key} className="pos-toggle-label">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                <input type="checkbox" checked={editing[key] as boolean} onChange={() => setEditing(p => p ? { ...p, [key]: !(p as unknown as Record<string, boolean>)[key] } : null)} /> {label}</label>
                        )}
                    </div>
                    <div className="pos-modal-footer">
                        <button className="pos-btn-primary flex-1 justify-center" onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete discount" className="pos-btn-outline text-red-400" onClick={() => { setDiscounts(p => p.filter(d => d.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button className="pos-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default Discounts;
