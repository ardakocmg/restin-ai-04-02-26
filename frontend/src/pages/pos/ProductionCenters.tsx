/**
 * ProductionCenters.tsx — K-Series Production Centers
 * Kitchen stations / bar / pastry with printer assignments
 * Lightspeed K-Series Back Office > Hardware > Production Centers parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, Search, X, Factory, Printer, Clock, Users, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';
import authStore from '../../lib/AuthStore';
import './pos-shared.css';

interface ProductionCenter {
    id: string; name: string; color: string; type: 'kitchen' | 'bar' | 'pastry' | 'prep' | 'other';
    printer: string; backupPrinter: string; itemCount: number; avgPrepTime: number;
    isActive: boolean; staffCount: number; sortOrder: number;
}

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
    <div className={`pos-toggle-track ${value ? 'pos-toggle-track--on' : 'pos-toggle-track--off'}`} onClick={onChange}>
        <div className={`pos-toggle-thumb ${value ? 'pos-toggle-thumb--on' : 'pos-toggle-thumb--off'}`} />
    </div>
);

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6', '#D946EF', '#84CC16'];
const PRINTERS = ['Front Counter (Epson TM-T88)', 'Kitchen Printer (Star TSP143)', 'Bar Printer (Star TSP143)', 'Pastry Printer (Epson TM-U220)', 'Label Printer (Brother QL-820)', 'None'];
const TYPES: { v: ProductionCenter['type']; l: string }[] = [{ v: 'kitchen', l: 'Kitchen' }, { v: 'bar', l: 'Bar' }, { v: 'pastry', l: 'Pastry / Bakery' }, { v: 'prep', l: 'Prep Station' }, { v: 'other', l: 'Other' }];

const SEED: ProductionCenter[] = [
    { id: '1', name: 'Main Kitchen', color: '#EF4444', type: 'kitchen', printer: 'Kitchen Printer (Star TSP143)', backupPrinter: 'Front Counter (Epson TM-T88)', itemCount: 38, avgPrepTime: 12, isActive: true, staffCount: 4, sortOrder: 1 },
    { id: '2', name: 'Cold Kitchen', color: '#3B82F6', type: 'kitchen', printer: 'Kitchen Printer (Star TSP143)', backupPrinter: 'None', itemCount: 12, avgPrepTime: 8, isActive: true, staffCount: 2, sortOrder: 2 },
    { id: '3', name: 'Grill Station', color: '#F97316', type: 'kitchen', printer: 'Kitchen Printer (Star TSP143)', backupPrinter: 'None', itemCount: 10, avgPrepTime: 15, isActive: true, staffCount: 2, sortOrder: 3 },
    { id: '4', name: 'Bar', color: '#8B5CF6', type: 'bar', printer: 'Bar Printer (Star TSP143)', backupPrinter: 'Front Counter (Epson TM-T88)', itemCount: 24, avgPrepTime: 3, isActive: true, staffCount: 2, sortOrder: 4 },
    { id: '5', name: 'Pastry Section', color: '#EC4899', type: 'pastry', printer: 'Pastry Printer (Epson TM-U220)', backupPrinter: 'Kitchen Printer (Star TSP143)', itemCount: 8, avgPrepTime: 20, isActive: true, staffCount: 1, sortOrder: 5 },
    { id: '6', name: 'Prep Station', color: '#14B8A6', type: 'prep', printer: 'None', backupPrinter: 'None', itemCount: 0, avgPrepTime: 0, isActive: false, staffCount: 0, sortOrder: 6 },
];

const ProductionCenters: React.FC = () => {
    const navigate = useNavigate();
    const venueId = String(localStorage.getItem('restin_pos_venue') || authStore.getUser()?.venue_id || '');
    const { data: apiCenters, loading: apiLoading, error: apiError, refetch } = useVenueConfig({ venueId, configType: 'production-centers', enabled: !!venueId });
    const [centers, setCenters] = useState<ProductionCenter[]>(SEED);
    const [apiWired, setApiWired] = useState(false);

    useEffect(() => {
        if (apiCenters.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped: ProductionCenter[] = apiCenters.map((ac: Record<string, unknown>, idx: number) => ({
                id: String(ac.id || ac._id || ''), name: String(ac.name || ''), color: String(ac.color || COLORS[idx % COLORS.length]),
                type: String(ac.type || 'kitchen') as ProductionCenter['type'], printer: String(ac.printer || 'None'),
                backupPrinter: String(ac.backup_printer || ac.backupPrinter || 'None'), itemCount: Number(ac.item_count || ac.itemCount || 0),
                avgPrepTime: Number(ac.avg_prep_time || ac.avgPrepTime || 0), isActive: ac.is_active !== false,
                staffCount: Number(ac.staff_count || ac.staffCount || 0), sortOrder: Number(ac.sort_order || ac.sortOrder || idx + 1),
            }));
            setCenters(mapped); setApiWired(true);
        }
    }, [apiCenters]);

    const [editing, setEditing] = useState<ProductionCenter | null>(null);
    const [search, setSearch] = useState('');
    const filtered = centers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.sortOrder - b.sortOrder);
    const active = filtered.filter(c => c.isActive);
    const inactive = filtered.filter(c => !c.isActive);
    const totalStaff = centers.filter(c => c.isActive).reduce((a, c) => a + c.staffCount, 0);

    const save = () => {
        if (!editing) return;
        const exists = centers.find(c => c.id === editing.id);
        if (exists) setCenters(prev => prev.map(c => c.id === editing.id ? editing : c));
        else setCenters(prev => [...prev, editing]);
        setEditing(null); toast.success('Production center saved');
    };

    return (
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Production Centers</h1>
                    <p className="pos-subtitle">Configure kitchen stations, bars, and prep areas with printer assignments{apiWired && <span className="pos-live-dot">● Live</span>}</p>
                </div>
                <button className="pos-btn-primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', color: '#3B82F6', type: 'kitchen', printer: 'None', backupPrinter: 'None', itemCount: 0, avgPrepTime: 0, isActive: true, staffCount: 0, sortOrder: centers.length + 1 })}><Plus size={16} /> Add Center</button>
            </div>

            {apiLoading && <div className="pos-card pos-flex pos-flex--center" style={{ justifyContent: 'center', gap: 8, padding: 30 }}><Loader2 size={18} className="animate-spin" style={{ color: '#3B82F6' }} /><span className="pos-text-secondary">{"Loading "}production centers...</span></div>} /* keep-inline */ /* keep-inline */ /* keep-inline */
            {apiError && <div className="pos-card pos-flex pos-flex--between pos-flex--center" style={{ borderColor: '#EF4444', padding: 14 }}><span style={{ color: '#EF4444', fontSize: 13 }}>⚠ {apiError}</span><button className="pos-btn-outline" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => refetch()}>Retry</button></div>} /* keep-inline */ /* keep-inline */ /* keep-inline */

            {/* Stats */}
            <div className="pos-stats-grid pos-mb-20">
                {[
                    { icon: <Factory size={16} />, val: active.length, label: 'Active Centers', color: '#3B82F6' },
                    { icon: <Printer size={16} />, val: centers.filter(c => c.printer !== 'None').length, label: 'With Printers', color: '#10B981' },
                    { icon: <Clock size={16} />, val: `${Math.round(active.reduce((a, c) => a + c.avgPrepTime, 0) / Math.max(active.length, 1))}m`, label: 'Avg Prep Time', color: '#F59E0B' },
                    { icon: <Users size={16} />, val: totalStaff, label: 'Total Staff', color: '#8B5CF6' },
                ].map((s, i) => (
                    <div key={i} className="pos-stat-card">
                        <div className="pos-stat-icon" style={{ background: `${s.color}15`, color: s.color }}>{s.icon}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div><div className="pos-stat-value">{s.val}</div><div className="pos-stat-label">{s.label}</div></div>
                    </div>
                ))}
            </div>

            <div className="pos-search-wrapper pos-mb-16"><Search size={14} className="pos-search-icon" /><input aria-label="Search centers..." className="pos-input pos-search-input" placeholder="Search centers..." value={search} onChange={e => setSearch(e.target.value)} /></div>

            {/* Active Centers */}
            <div className="pos-text-sm pos-text-bold pos-text-secondary pos-mb-8" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Active Centers ({active.length})</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16, marginBottom: 24 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                {active.map(center => (
                    <div key={center.id} className="pos-card" style={{ cursor: 'pointer', borderLeft: `4px solid ${center.color}` }} onClick={() => setEditing({ ...center })}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div className="pos-flex pos-flex--between" style={{ alignItems: 'flex-start', marginBottom: 10 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div className="pos-flex pos-flex--center pos-gap-10">
                                <div className="pos-stat-icon" style={{ background: `${center.color}15`, color: center.color }}><Factory size={16} /></div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div><h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{center.name}</h3> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <span className="pos-cell-secondary" style={{ textTransform: 'capitalize' }}>{center.type}</span></div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            </div>
                            <button title="Edit center" className="pos-btn-icon" onClick={e => { e.stopPropagation(); setEditing({ ...center }); }}><Edit3 size={13} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ padding: '8px 12px', background: 'var(--bg-secondary,#09090b)', borderRadius: 6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ fontSize: 18, fontWeight: 700 }}>{center.itemCount}</div><div className="pos-cell-secondary">Items</div></div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ padding: '8px 12px', background: 'var(--bg-secondary,#09090b)', borderRadius: 6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ fontSize: 18, fontWeight: 700 }}>{center.avgPrepTime}m</div><div className="pos-cell-secondary">Avg Prep</div></div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div>
                        <div className="pos-cell-secondary pos-flex pos-flex--col pos-gap-4">
                            <div className="pos-flex pos-flex--center pos-gap-6"><Printer size={11} /> {center.printer}</div>
                            {center.backupPrinter !== 'None' && <div className="pos-flex pos-flex--center pos-gap-6" style={{ opacity: 0.6 }}><Printer size={11} /> Backup: {center.backupPrinter}</div>} /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div className="pos-flex pos-flex--center pos-gap-6"><Users size={11} /> {center.staffCount} staff</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Inactive */}
            {inactive.length > 0 && <>
                <div className="pos-text-sm pos-text-bold pos-text-secondary pos-mb-8" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Inactive ({inactive.length})</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <div className="pos-card" style={{ opacity: 0.5 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    {inactive.map(c => <div key={c.id} className="pos-flex pos-flex--center pos-gap-12" style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }} onClick={() => setEditing({ ...c })}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: c.color }} /> <span style={{ fontSize: 14, flex: 1 }}>{c.name}</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button className="pos-btn-outline" style={{ padding: '4px 10px', fontSize: 11 }} onClick={e => { e.stopPropagation(); setCenters(prev => prev.map(x => x.id === c.id ? { ...x, isActive: true } : x)); toast.success('Activated'); }}>Activate</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    </div>)}
                </div>
            </>}
        </div>

            {/* Edit Modal */}
            {editing && <div className="pos-modal-overlay" onClick={() => setEditing(null)}>
                <div className="pos-card pos-modal pos-modal--sm" onClick={e => e.stopPropagation()}>
                    <div className="pos-modal-header"><h3 className="pos-modal-title">{centers.find(c => c.id === editing.id) ? 'Edit' : 'New'} Production Center</h3><button title="Close" className="pos-btn-icon" onClick={() => setEditing(null)}><X size={20} /></button></div>
                    <div className="pos-form-group"><label className="pos-form-label">Name *</label><input className="pos-input" value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Main Kitchen" /></div>
                    <div className="pos-form-group"><label className="pos-form-label pos-mb-4">Color</label>
                        <div className="pos-flex pos-flex--wrap pos-gap-6">{COLORS.map(c => <div key={c} onClick={() => setEditing(p => p ? { ...p, color: c } : null)} style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer', border: editing.color === c ? '3px solid #fff' : '3px solid transparent' }} />)}</div></div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <div className="pos-form-grid">
                        <div><label className="pos-form-label">Type</label><select className="pos-select" value={editing.type} onChange={e => setEditing(p => p ? { ...p, type: e.target.value as ProductionCenter['type'] } : null)} aria-label="Type">{TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
                        <div><label className="pos-form-label">Avg Prep Time (min)</label><input type="number" min={0} className="pos-input" value={editing.avgPrepTime} onChange={e => setEditing(p => p ? { ...p, avgPrepTime: parseInt(e.target.value) || 0 } : null)} aria-label="Average prep time" /></div>
                    </div>
                    <div className="pos-form-grid">
                        <div><label className="pos-form-label">Primary Printer</label><select className="pos-select" value={editing.printer} onChange={e => setEditing(p => p ? { ...p, printer: e.target.value } : null)} aria-label="Printer">{PRINTERS.map(p => <option key={p}>{p}</option>)}</select></div>
                        <div><label className="pos-form-label">Backup Printer</label><select className="pos-select" value={editing.backupPrinter} onChange={e => setEditing(p => p ? { ...p, backupPrinter: e.target.value } : null)} aria-label="Backup printer">{PRINTERS.map(p => <option key={p}>{p}</option>)}</select></div>
                    </div>
                    <div className="pos-form-group"><label className="pos-form-label">Staff Count</label><input type="number" min={0} className="pos-input" value={editing.staffCount} onChange={e => setEditing(p => p ? { ...p, staffCount: parseInt(e.target.value) || 0 } : null)} aria-label="Staff count" /></div>
                    <div className="pos-flex pos-flex--center pos-flex--between pos-mb-16" style={{ padding: '12px 0' }}><span className="pos-cell-value">Active</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <Toggle value={editing.isActive} onChange={() => setEditing(p => p ? { ...p, isActive: !p.isActive } : null)} /></div>
                    <div className="pos-modal-footer">
                        <button className="pos-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button title="Delete center" className="pos-btn-outline" style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => { setCenters(prev => prev.filter(c => c.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button className="pos-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default ProductionCenters;
