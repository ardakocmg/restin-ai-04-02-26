/**
 * VoidReasons.tsx — K-Series Void Reasons
 * Configurable reasons for voiding items/orders with audit controls
 * Lightspeed K-Series Back Office > Configuration > Void Reasons parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, Search, X, AlertTriangle, GripVertical, Loader2, RefreshCw, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';

interface VoidReason { id: string; name: string; requiresManager: boolean; requiresNote: boolean; isActive: boolean; usageCount: number; sortOrder: number; category: 'item' | 'order' | 'both'; }

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };

const SEED: VoidReason[] = [
    { id: '1', name: 'Customer Changed Mind', requiresManager: false, requiresNote: false, isActive: true, usageCount: 45, sortOrder: 1, category: 'item' },
    { id: '2', name: 'Wrong Item Entered', requiresManager: false, requiresNote: false, isActive: true, usageCount: 32, sortOrder: 2, category: 'item' },
    { id: '3', name: 'Kitchen Error', requiresManager: false, requiresNote: true, isActive: true, usageCount: 18, sortOrder: 3, category: 'item' },
    { id: '4', name: 'Quality Issue', requiresManager: true, requiresNote: true, isActive: true, usageCount: 8, sortOrder: 4, category: 'item' },
    { id: '5', name: 'Spilled / Dropped', requiresManager: false, requiresNote: false, isActive: true, usageCount: 12, sortOrder: 5, category: 'item' },
    { id: '6', name: 'Walkout', requiresManager: true, requiresNote: true, isActive: true, usageCount: 2, sortOrder: 6, category: 'order' },
    { id: '7', name: 'Duplicate Order', requiresManager: false, requiresNote: false, isActive: true, usageCount: 6, sortOrder: 7, category: 'order' },
    { id: '8', name: 'Training / Test', requiresManager: true, requiresNote: false, isActive: true, usageCount: 15, sortOrder: 8, category: 'both' },
    { id: '9', name: 'Promotional Comp', requiresManager: true, requiresNote: true, isActive: false, usageCount: 0, sortOrder: 9, category: 'both' },
];

const VoidReasons: React.FC = () => {
    const navigate = useNavigate();
    const [reasons, setReasons] = useState(SEED);
    const [editing, setEditing] = useState<VoidReason | null>(null);
    const [search, setSearch] = useState('');
    const [isLive, setIsLive] = useState(false);
    const filtered = reasons.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.sortOrder - b.sortOrder);

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiData, loading: apiLoading, error: apiError, refetch } = useVenueConfig<VoidReason>({ venueId, configType: 'void-reasons' });
    useEffect(() => {
        if (apiData && apiData.length > 0) {
            setReasons(apiData.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (r: any) => ({ id: r.id || r._id || crypto.randomUUID(), name: r.name || '', requiresManager: r.requiresManager ?? r.requires_manager ?? false, requiresNote: r.requiresNote ?? r.requires_note ?? false, isActive: r.isActive ?? r.is_active ?? true, usageCount: r.usageCount ?? r.usage_count ?? 0, sortOrder: r.sortOrder ?? r.sort_order ?? 0, category: r.category || 'both' }))); setIsLive(true);
        }
    }, [apiData]);

    const save = () => { if (!editing) return; const e = reasons.find(r => r.id === editing.id); if (e) setReasons(p => p.map(r => r.id === editing.id ? editing : r)); else setReasons(p => [...p, editing]); setEditing(null); toast.success('Saved'); };

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Void Reasons {isLive && <Wifi size={14} style={{ color: '#10B981', verticalAlign: 'middle', marginLeft: 6 }} />}</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Configure reasons required when voiding items or orders from the POS</p>
                </div>
                <button style={bp} onClick={() => setEditing({ id: crypto.randomUUID(), name: '', requiresManager: false, requiresNote: false, isActive: true, usageCount: 0, sortOrder: reasons.length + 1, category: 'both' })}><Plus size={16} /> Add Reason</button>
            </div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-secondary)' }} />
                <input style={{ ...ip, paddingLeft: 36 }} placeholder="Search reasons..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div style={cd}>
                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 100px 100px 100px 80px 50px', gap: 12, padding: '8px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div></div><div>Reason</div><div>Category</div><div>Controls</div><div>Status</div><div>Uses</div><div></div>
                </div>
                {filtered.map(r => (
                    <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 100px 100px 100px 80px 50px', gap: 12, padding: '14px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', opacity: r.isActive ? 1 : 0.5 }} onClick={() => setEditing({ ...r })}>
                        <GripVertical size={14} style={{ color: 'var(--text-secondary)', opacity: 0.3, cursor: 'grab' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
                            <span style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</span>
                        </div>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: r.category === 'item' ? 'rgba(59,130,246,0.1)' : r.category === 'order' ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)', color: r.category === 'item' ? '#3B82F6' : r.category === 'order' ? '#EF4444' : '#8B5CF6', textTransform: 'capitalize' }}>{r.category}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {r.requiresManager && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>Mgr</span>}
                            {r.requiresNote && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>Note</span>}
                            {!r.requiresManager && !r.requiresNote && <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>None</span>}
                        </div>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: r.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: r.isActive ? '#10B981' : '#EF4444' }}>{r.isActive ? 'Active' : 'Inactive'}</span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{r.usageCount}</span>
                        <button title="Edit reason" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setEditing({ ...r }); }}><Edit3 size={13} /></button>
                    </div>
                ))}
            </div>
        </div>

            {editing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
                <div style={{ ...cd, width: 480 }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{reasons.find(r => r.id === editing.id) ? 'Edit' : 'New'} Void Reason</h3>
                        <button title="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Reason *</label>
                        <input style={ip} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Customer Changed Mind" /></div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Category</label>
                        <select style={{ ...ip, cursor: 'pointer' }} value={editing.category} onChange={e => setEditing(p => p ? { ...p, category: e.target.value as VoidReason['category'] } : null)} aria-label="Category">
                            <option value="item">Item Level</option><option value="order">Order Level</option><option value="both">Both</option>
                        </select></div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                        {([['requiresManager', 'Requires manager approval'], ['requiresNote', 'Requires note'], ['isActive', 'Active']] as const).map(([key, label]) =>
                            <label key={key} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <input type="checkbox" checked={editing[key]} onChange={() => setEditing(p => p ? { ...p, [key]: !p[key] } : null)} /> {label}</label>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete reason" style={{ ...bo, color: '#EF4444' }} onClick={() => { setReasons(p => p.filter(r => r.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button style={bo} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default VoidReasons;
