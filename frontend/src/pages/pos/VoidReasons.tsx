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
import './pos-shared.css';

interface VoidReason { id: string; name: string; requiresManager: boolean; requiresNote: boolean; isActive: boolean; usageCount: number; sortOrder: number; category: 'item' | 'order' | 'both'; }

const voidTableCols = '28px 1fr 100px 100px 100px 80px 50px';

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
    const { data: apiData } = useVenueConfig<VoidReason>({ venueId, configType: 'void-reasons' });
    useEffect(() => {
        if (apiData && apiData.length > 0) {
            setReasons(apiData.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (r: Record<string, unknown>) => ({ id: r.id || r._id || crypto.randomUUID(), name: r.name || '', requiresManager: r.requiresManager ?? r.requires_manager ?? false, requiresNote: r.requiresNote ?? r.requires_note ?? false, isActive: r.isActive ?? r.is_active ?? true, usageCount: r.usageCount ?? r.usage_count ?? 0, sortOrder: r.sortOrder ?? r.sort_order ?? 0, category: r.category || 'both' }))); setIsLive(true);
        }
    }, [apiData]);

    const save = () => { if (!editing) return; const e = reasons.find(r => r.id === editing.id); if (e) setReasons(p => p.map(r => r.id === editing.id ? editing : r)); else setReasons(p => [...p, editing]); setEditing(null); toast.success('Saved'); };

    const categoryBadge = (cat: string) => {
        const cls = cat === 'item' ? 'pos-badge--blue' : cat === 'order' ? 'pos-badge--red' : 'pos-badge--purple';
        return <span className={`pos-badge ${cls}`} style={{ textTransform: 'capitalize' }}>{cat}</span>; /* keep-inline */ /* keep-inline */
    };

    return (
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Void Reasons {isLive && <Wifi size={14} className="pos-live-icon" />}</h1>
                    <p className="pos-subtitle">Configure reasons required when voiding items or orders from the POS</p>
                </div>
                <button className="pos-btn-primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', requiresManager: false, requiresNote: false, isActive: true, usageCount: 0, sortOrder: reasons.length + 1, category: 'both' })}><Plus size={16} /> Add Reason</button>
            </div>

            <div className="pos-search-wrapper pos-mb-16">
                <Search size={14} className="pos-search-icon" />
                <input className="pos-input pos-search-input" placeholder="Search reasons..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="pos-card">
                <div className="pos-table-header" style={{ gridTemplateColumns: voidTableCols }}> /* keep-inline */ /* keep-inline */
                    <div></div><div>Reason</div><div>Category</div><div>Controls</div><div>Status</div><div>Uses</div><div></div>
                </div>
                {filtered.map(r => (
                    <div key={r.id} className="pos-table-row" style={{ gridTemplateColumns: voidTableCols, opacity: r.isActive ? 1 : 0.5 }} onClick={() => setEditing({ ...r })}> /* keep-inline */ /* keep-inline */
                        <GripVertical size={14} className="pos-icon-grab" />
                        <div className="pos-flex pos-flex--center pos-gap-8">
                            <AlertTriangle size={14} className="pos-cell-amber" />
                            <span className="pos-cell-value">{r.name}</span>
                        </div>
                        {categoryBadge(r.category)}
                        <div className="pos-flex pos-gap-4">
                            {r.requiresManager && <span className="pos-badge pos-badge--red" style={{ fontSize: 9 }}>Mgr</span>} /* keep-inline */ /* keep-inline */
                            {r.requiresNote && <span className="pos-badge pos-badge--amber" style={{ fontSize: 9 }}>Note</span>} /* keep-inline */ /* keep-inline */
                            {!r.requiresManager && !r.requiresNote && <span className="pos-text-secondary pos-text-xs">None</span>}
                        </div>
                        <span className={`pos-badge ${r.isActive ? 'pos-badge--green' : 'pos-badge--red'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
                        <span className="pos-cell-value">{r.usageCount}</span>
                        <button title="Edit reason" className="pos-btn-icon" onClick={e => { e.stopPropagation(); setEditing({ ...r }); }}><Edit3 size={13} /></button>
                    </div>
                ))}
            </div>
        </div>

            {editing && <div className="pos-modal-overlay" onClick={() => setEditing(null)}>
                <div className="pos-card pos-modal pos-modal--sm" onClick={e => e.stopPropagation()}>
                    <div className="pos-modal-header">
                        <h3 className="pos-modal-title">{reasons.find(r => r.id === editing.id) ? 'Edit' : 'New'} Void Reason</h3>
                        <button title="Close" className="pos-btn-icon" onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div className="pos-form-group"><label className="pos-form-label">Reason *</label>
                        <input className="pos-input" value={editing.name} onChange={e = aria-label="Input field"> setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Customer Changed Mind" /></div>
                    <div className="pos-form-group"><label className="pos-form-label">Category</label>
                        <select className="pos-select" value={editing.category} onChange={e = aria-label="Input field"> setEditing(p => p ? { ...p, category: e.target.value as VoidReason['category'] } : null)} aria-label="Category">
                            <option value="item">Item Level</option><option value="order">Order Level</option><option value="both">Both</option>
                        </select></div>
                    <div className="pos-flex pos-gap-16 pos-mb-16 pos-flex--wrap">
                        {([['requiresManager', 'Requires manager approval'], ['requiresNote', 'Requires note'], ['isActive', 'Active']] as const).map(([key, label]) =>
                            <label key={key} className="pos-toggle-label">
                                <input type="checkbox" checked={editing[key]} onChange={() = aria-label="Input field"> setEditing(p => p ? { ...p, [key]: !p[key] } : null)} /> {label}</label>
                        )}
                    </div>
                    <div className="pos-modal-footer">
                        <button className="pos-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button> /* keep-inline */ /* keep-inline */
                        <button title="Delete reason" className="pos-btn-outline" style={{ color: '#EF4444' }} onClick={() => { setReasons(p => p.filter(r => r.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button> /* keep-inline */ /* keep-inline */
                        <button className="pos-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default VoidReasons;
