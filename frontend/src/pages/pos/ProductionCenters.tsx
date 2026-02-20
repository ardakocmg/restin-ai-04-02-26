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

interface ProductionCenter {
    id: string; name: string; color: string; type: 'kitchen' | 'bar' | 'pastry' | 'prep' | 'other';
    printer: string; backupPrinter: string; itemCount: number; avgPrepTime: number;
    isActive: boolean; staffCount: number; sortOrder: number;
}

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };
const sl: React.CSSProperties = { ...ip, cursor: 'pointer' };

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
    const venueId = localStorage.getItem('restin_pos_venue') || authStore.getUser()?.venue_id || '';
    const { data: apiCenters, loading: apiLoading, error: apiError, refetch } = useVenueConfig({ venueId, configType: 'production-centers', enabled: !!venueId });
    const [centers, setCenters] = useState<ProductionCenter[]>(SEED);
    const [apiWired, setApiWired] = useState(false);

    useEffect(() => {
        if (apiCenters.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped: ProductionCenter[] = apiCenters.map((ac: any, idx: number) => ({
                id: String(ac.id || ac._id || ''),
                name: String(ac.name || ''),
                color: String(ac.color || COLORS[idx % COLORS.length]),
                type: (ac.type || 'kitchen') as ProductionCenter['type'],
                printer: String(ac.printer || 'None'),
                backupPrinter: String(ac.backup_printer || ac.backupPrinter || 'None'),
                itemCount: Number(ac.item_count || ac.itemCount || 0),
                avgPrepTime: Number(ac.avg_prep_time || ac.avgPrepTime || 0),
                isActive: ac.is_active !== false,
                staffCount: Number(ac.staff_count || ac.staffCount || 0),
                sortOrder: Number(ac.sort_order || ac.sortOrder || idx + 1),
            }));
            setCenters(mapped);
            setApiWired(true);
        }
    }, [apiCenters]);

    const [editing, setEditing] = useState<ProductionCenter | null>(null);
    const [search, setSearch] = useState('');
    const filtered = centers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.sortOrder - b.sortOrder);
    const active = filtered.filter(c => c.isActive);
    const inactive = filtered.filter(c => !c.isActive);
    const totalItems = centers.filter(c => c.isActive).reduce((a, c) => a + c.itemCount, 0);
    const totalStaff = centers.filter(c => c.isActive).reduce((a, c) => a + c.staffCount, 0);

    const save = () => {
        if (!editing) return;
        const exists = centers.find(c => c.id === editing.id);
        if (exists) setCenters(prev => prev.map(c => c.id === editing.id ? editing : c));
        else setCenters(prev => [...prev, editing]);
        setEditing(null); toast.success('Production center saved');
    };

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Production Centers</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Configure kitchen stations, bars, and prep areas with printer assignments{apiWired && <span style={{ marginLeft: 8, fontSize: 11, color: '#10B981' }}>● Live</span>}</p>
                </div>
                <button style={bp} onClick={() => setEditing({ id: crypto.randomUUID(), name: '', color: '#3B82F6', type: 'kitchen', printer: 'None', backupPrinter: 'None', itemCount: 0, avgPrepTime: 0, isActive: true, staffCount: 0, sortOrder: centers.length + 1 })}><Plus size={16} /> Add Center</button>
            </div>

            {/* Loading / Error */}
            {apiLoading && <div style={{ ...cd, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 30 }}><Loader2 size={18} className="animate-spin" style={{ color: '#3B82F6' }} /><span style={{ color: 'var(--text-secondary)' }}>Loading production centers...</span></div>}
            {apiError && <div style={{ ...cd, borderColor: '#EF4444', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#EF4444', fontSize: 13 }}>⚠ {apiError}</span><button style={{ ...bo, padding: '6px 14px', fontSize: 12 }} onClick={() => refetch()}>Retry</button></div>}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { icon: <Factory size={16} />, val: active.length, label: 'Active Centers', color: '#3B82F6' },
                    { icon: <Printer size={16} />, val: centers.filter(c => c.printer !== 'None').length, label: 'With Printers', color: '#10B981' },
                    { icon: <Clock size={16} />, val: `${Math.round(active.reduce((a, c) => a + c.avgPrepTime, 0) / Math.max(active.length, 1))}m`, label: 'Avg Prep Time', color: '#F59E0B' },
                    { icon: <Users size={16} />, val: totalStaff, label: 'Total Staff', color: '#8B5CF6' },
                ].map((s, i) => (
                    <div key={i} style={{ ...cd, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
                        <div><div style={{ fontSize: 20, fontWeight: 700 }}>{s.val}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</div></div>
                    </div>
                ))}
            </div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-secondary)' }} />
                <input style={{ ...ip, paddingLeft: 36 }} placeholder="Search centers..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Active Centers */}
            <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: 0.5 }}>Active Centers ({active.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16, marginBottom: 24 }}>
                {active.map(center => (
                    <div key={center.id} style={{ ...cd, cursor: 'pointer', borderLeft: `4px solid ${center.color}` }} onClick={() => setEditing({ ...center })}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${center.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: center.color }}><Factory size={16} /></div>
                                <div><h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{center.name}</h3>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{center.type}</span></div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }} onClick={e => { e.stopPropagation(); setEditing({ ...center }); }}><Edit3 size={13} /></button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                            <div style={{ padding: '8px 12px', background: 'var(--bg-secondary,#09090b)', borderRadius: 6 }}>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>{center.itemCount}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Items</div>
                            </div>
                            <div style={{ padding: '8px 12px', background: 'var(--bg-secondary,#09090b)', borderRadius: 6 }}>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>{center.avgPrepTime}m</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Avg Prep</div>
                            </div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Printer size={11} /> {center.printer}</div>
                            {center.backupPrinter !== 'None' && <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6 }}><Printer size={11} /> Backup: {center.backupPrinter}</div>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={11} /> {center.staffCount} staff</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Inactive */}
            {inactive.length > 0 && <>
                <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: 0.5 }}>Inactive ({inactive.length})</div>
                <div style={{ ...cd, opacity: 0.5 }}>
                    {inactive.map(c => <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }} onClick={() => setEditing({ ...c })}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: c.color }} /> <span style={{ fontSize: 14, flex: 1 }}>{c.name}</span>
                        <button style={{ ...bo, padding: '4px 10px', fontSize: 11 }} onClick={e => { e.stopPropagation(); setCenters(prev => prev.map(x => x.id === c.id ? { ...x, isActive: true } : x)); toast.success('Activated'); }}>Activate</button>
                    </div>)}
                </div>
            </>}
        </div>

            {/* Edit Modal */}
            {editing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
                <div style={{ ...cd, width: 480 }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{centers.find(c => c.id === editing.id) ? 'Edit' : 'New'} Production Center</h3>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name *</label>
                        <input style={ip} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Main Kitchen" /></div>

                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Color</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {COLORS.map(c => <div key={c} onClick={() => setEditing(p => p ? { ...p, color: c } : null)} style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer', border: editing.color === c ? '3px solid #fff' : '3px solid transparent' }} />)}
                        </div></div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Type</label>
                            <select style={sl} value={editing.type} onChange={e => setEditing(p => p ? { ...p, type: e.target.value as ProductionCenter['type'] } : null)} aria-label="Type">{TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Avg Prep Time (min)</label>
                            <input type="number" min={0} style={ip} value={editing.avgPrepTime} onChange={e => setEditing(p => p ? { ...p, avgPrepTime: parseInt(e.target.value) || 0 } : null)} /></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Primary Printer</label>
                            <select style={sl} value={editing.printer} onChange={e => setEditing(p => p ? { ...p, printer: e.target.value } : null)} aria-label="Printer">{PRINTERS.map(p => <option key={p}>{p}</option>)}</select></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Backup Printer</label>
                            <select style={sl} value={editing.backupPrinter} onChange={e => setEditing(p => p ? { ...p, backupPrinter: e.target.value } : null)} aria-label="Backup printer">{PRINTERS.map(p => <option key={p}>{p}</option>)}</select></div>
                    </div>

                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Staff Count</label>
                        <input type="number" min={0} style={ip} value={editing.staffCount} onChange={e => setEditing(p => p ? { ...p, staffCount: parseInt(e.target.value) || 0 } : null)} /></div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <div onClick={() => setEditing(p => p ? { ...p, isActive: !p.isActive } : null)} style={{ width: 44, height: 24, borderRadius: 12, background: editing.isActive ? '#3B82F6' : '#3f3f46', cursor: 'pointer', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: 2, left: editing.isActive ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                            </div> Active
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button style={{ ...bo, color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => { setCenters(prev => prev.filter(c => c.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button style={bo} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default ProductionCenters;
