/**
 * ItemTags.tsx — K-Series Item Tags & Labels
 * Categorize items with visual tags (vegan, gluten-free, spicy, etc.)
 * Lightspeed K-Series Back Office > Menu > Item Tags parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, Search, X, Tag, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';
import './pos-shared.css';

interface ItemTag { id: string; name: string; description: string; icon: string; color: string; showOnPOS: boolean; showOnReceipt: boolean; showOnKDS: boolean; showOnWeb: boolean; itemCount: number; }

const COLORS = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1', '#D946EF', '#84CC16'];
const ICONS = ['🌿', '🥬', '🌶️', '🔥', '⭐', '💎', '🆕', '❄️', '🐄', '🐷', '🍷', '🧀', '🥩', '🐟', '🍕', '🥗', '☕', '🍨'];

const SEED: ItemTag[] = [
    { id: '1', name: 'Vegan', description: 'Contains no animal products', icon: '🌿', color: '#10B981', showOnPOS: true, showOnReceipt: true, showOnKDS: false, showOnWeb: true, itemCount: 12 },
    { id: '2', name: 'Vegetarian', description: 'No meat or fish', icon: '🥬', color: '#84CC16', showOnPOS: true, showOnReceipt: true, showOnKDS: false, showOnWeb: true, itemCount: 18 },
    { id: '3', name: 'Gluten-Free', description: 'Free from gluten allergens', icon: '🌾', color: '#F59E0B', showOnPOS: true, showOnReceipt: true, showOnKDS: true, showOnWeb: true, itemCount: 8 },
    { id: '4', name: 'Spicy', description: 'Contains hot chili peppers', icon: '🌶️', color: '#EF4444', showOnPOS: true, showOnReceipt: false, showOnKDS: true, showOnWeb: true, itemCount: 6 },
    { id: '5', name: 'Chef\'s Pick', description: 'Recommended by our chef', icon: '⭐', color: '#F59E0B', showOnPOS: true, showOnReceipt: false, showOnKDS: false, showOnWeb: true, itemCount: 5 },
    { id: '6', name: 'Premium', description: 'Premium quality ingredient', icon: '💎', color: '#8B5CF6', showOnPOS: true, showOnReceipt: true, showOnKDS: false, showOnWeb: true, itemCount: 4 },
    { id: '7', name: 'New', description: 'Newly added to menu', icon: '🆕', color: '#3B82F6', showOnPOS: true, showOnReceipt: false, showOnKDS: false, showOnWeb: true, itemCount: 3 },
    { id: '8', name: 'Halal', description: 'Halal certified preparation', icon: '☪️', color: '#06B6D4', showOnPOS: true, showOnReceipt: true, showOnKDS: false, showOnWeb: true, itemCount: 14 },
];

const ItemTags: React.FC = () => {
    const navigate = useNavigate();
    const [tags, setTags] = useState(SEED);
    const [editing, setEditing] = useState<ItemTag | null>(null);
    const [search, setSearch] = useState('');
    const [isLive, setIsLive] = useState(false);

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiData } = useVenueConfig<ItemTag>({ venueId, configType: 'item-tags' });
    useEffect(() => {
        if (apiData && apiData.length > 0) {
            setTags(apiData.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (t: any) => ({ id: t.id || t._id || crypto.randomUUID(), name: t.name || '', description: t.description || '', color: t.color || '#3B82F6', icon: t.icon || '🏷️', showOnPOS: t.showOnPOS ?? t.show_on_pos ?? true, showOnReceipt: t.showOnReceipt ?? t.show_on_receipt ?? false, showOnKDS: t.showOnKDS ?? t.show_on_kds ?? false, showOnWeb: t.showOnWeb ?? t.show_on_web ?? true, itemCount: t.itemCount ?? t.item_count ?? 0 }))); setIsLive(true);
        }
    }, [apiData]);
    const filtered = tags.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

    const save = () => { if (!editing) return; const e = tags.find(t => t.id === editing.id); if (e) setTags(p => p.map(t => t.id === editing.id ? editing : t)); else setTags(p => [...p, editing]); setEditing(null); toast.success('Saved'); };

    return (
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Item Tags {isLive && <Wifi size={14} className="pos-live-icon" />}</h1>
                    <p className="pos-subtitle">Visual labels for dietary info, promotions, and categorization</p>
                </div>
                <button className="pos-btn-primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', description: '', icon: '🏷️', color: '#3B82F6', showOnPOS: true, showOnReceipt: false, showOnKDS: false, showOnWeb: true, itemCount: 0 })}><Plus size={16} /> Add Tag</button>
            </div>

            <div className="pos-search-wrapper pos-mb-16">
                <Search size={14} className="pos-search-icon" />
                <input className="pos-input pos-search-input" placeholder="Search tags..." value={search} onChange={e => setSearch(e.target.value)} aria-label="Search tags" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
                {filtered.map(tag => (
                    <div key={tag.id} className="pos-card" style={{ cursor: 'pointer', padding: 14 }} onClick={() => setEditing({ ...tag })}>
                        <div className="pos-flex pos-flex--center pos-gap-10 pos-mb-8">
                            <span style={{ fontSize: 24 }}>{tag.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 className="pos-modal-title" style={{ fontSize: 15, margin: 0 }}>{tag.name}</h3>
                                {tag.description && <div className="pos-cell-secondary" style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tag.description}</div>}
                                <span className="pos-cell-secondary">{tag.itemCount} items</span>
                            </div>
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: tag.color }} />
                        </div>
                        <div className="pos-flex pos-gap-4 pos-flex--wrap">
                            {tag.showOnPOS && <span className="pos-badge pos-badge--blue" style={{ fontSize: 9 }}>POS</span>}
                            {tag.showOnReceipt && <span className="pos-badge pos-badge--green" style={{ fontSize: 9 }}>Receipt</span>}
                            {tag.showOnKDS && <span className="pos-badge pos-badge--amber" style={{ fontSize: 9 }}>KDS</span>}
                            {tag.showOnWeb && <span className="pos-badge pos-badge--purple" style={{ fontSize: 9 }}>Web</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>

            {editing && <div className="pos-modal-overlay" onClick={() => setEditing(null)}>
                <div className="pos-card pos-modal pos-modal--sm" onClick={e => e.stopPropagation()}>
                    <div className="pos-modal-header">
                        <h3 className="pos-modal-title">{tags.find(t => t.id === editing.id) ? 'Edit' : 'New'} Tag</h3>
                        <button title="Close" className="pos-btn-icon" onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div className="pos-form-group"><label className="pos-form-label">Name *</label>
                        <input className="pos-input" value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Vegan" /></div>
                    <div className="pos-form-group"><label className="pos-form-label">Description</label>
                        <textarea className="pos-input pos-textarea" value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : null)} placeholder="Brief description of this tag" /></div>
                    <div className="pos-form-group"><label className="pos-form-label">Icon</label>
                        <div className="pos-flex pos-gap-6 pos-flex--wrap">{ICONS.map(i => <button key={i} title={`Select icon ${i}`} onClick={() => setEditing(p => p ? { ...p, icon: i } : null)} className="pos-btn-icon" style={{ width: 36, height: 36, borderRadius: 8, border: editing.icon === i ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.06)', background: 'var(--bg-secondary)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i}</button>)}</div></div>
                    <div className="pos-form-group"><label className="pos-form-label">Color</label>
                        <div className="pos-color-picker">{COLORS.map(c => <div key={c} onClick={() => setEditing(p => p ? { ...p, color: c } : null)} className={`pos-color-swatch ${editing.color === c ? 'pos-color-swatch--selected' : ''}`} style={{ background: c }} />)}</div></div>
                    <div className="pos-form-label pos-text-bold pos-mb-8" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Visibility</div>
                    <div className="pos-form-grid pos-mb-16">
                        {([['showOnPOS', 'Show on POS'], ['showOnReceipt', 'Show on Receipt'], ['showOnKDS', 'Show on KDS'], ['showOnWeb', 'Show on Website']] as const).map(([key, label]) =>
                            <label key={key} className="pos-toggle-label" style={{ padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                                <input type="checkbox" checked={editing[key]} onChange={() => setEditing(p => p ? { ...p, [key]: !p[key] } : null)} /> {label}</label>
                        )}
                    </div>
                    <div className="pos-modal-footer">
                        <button className="pos-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete tag" className="pos-btn-outline" style={{ color: '#EF4444' }} onClick={() => { setTags(p => p.filter(t => t.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button className="pos-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default ItemTags;
