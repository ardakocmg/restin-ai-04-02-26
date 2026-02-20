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

interface ItemTag { id: string; name: string; description: string; icon: string; color: string; showOnPOS: boolean; showOnReceipt: boolean; showOnKDS: boolean; showOnWeb: boolean; itemCount: number; }

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };
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
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Item Tags {isLive && <Wifi size={14} style={{ color: '#10B981', verticalAlign: 'middle', marginLeft: 6 }} />}</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Visual labels for dietary info, promotions, and categorization</p>
                </div>
                <button style={bp} onClick={() => setEditing({ id: crypto.randomUUID(), name: '', description: '', icon: '🏷️', color: '#3B82F6', showOnPOS: true, showOnReceipt: false, showOnKDS: false, showOnWeb: true, itemCount: 0 })}><Plus size={16} /> Add Tag</button>
            </div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-secondary)' }} />
                <input style={{ ...ip, paddingLeft: 36 }} placeholder="Search tags..." value={search} onChange={e => setSearch(e.target.value)} aria-label="Search tags" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
                {filtered.map(tag => (
                    <div key={tag.id} style={{ ...cd, cursor: 'pointer', padding: 14 }} onClick={() => setEditing({ ...tag })}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: 24 }}>{tag.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{tag.name}</h3>
                                {tag.description && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tag.description}</div>}
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{tag.itemCount} items</span>
                            </div>
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: tag.color }} />
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {tag.showOnPOS && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>POS</span>}
                            {tag.showOnReceipt && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>Receipt</span>}
                            {tag.showOnKDS && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>KDS</span>}
                            {tag.showOnWeb && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>Web</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>

            {editing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
                <div style={{ ...cd, width: 480 }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{tags.find(t => t.id === editing.id) ? 'Edit' : 'New'} Tag</h3>
                        <button title="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name *</label>
                        <input style={ip} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Vegan" /></div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Description</label>
                        <textarea style={{ ...ip, resize: 'vertical', minHeight: 60 }} value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : null)} placeholder="Brief description of this tag" /></div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Icon</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{ICONS.map(i => <button key={i} title={`Select icon ${i}`} onClick={() => setEditing(p => p ? { ...p, icon: i } : null)} style={{ width: 36, height: 36, borderRadius: 8, border: editing.icon === i ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.06)', background: 'var(--bg-secondary)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i}</button>)}</div></div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Color</label>
                        <div style={{ display: 'flex', gap: 6 }}>{COLORS.map(c => <div key={c} onClick={() => setEditing(p => p ? { ...p, color: c } : null)} style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer', border: editing.color === c ? '3px solid #fff' : '3px solid transparent' }} />)}</div></div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Visibility</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                        {([['showOnPOS', 'Show on POS'], ['showOnReceipt', 'Show on Receipt'], ['showOnKDS', 'Show on KDS'], ['showOnWeb', 'Show on Website']] as const).map(([key, label]) =>
                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                                <input type="checkbox" checked={editing[key]} onChange={() => setEditing(p => p ? { ...p, [key]: !p[key] } : null)} /> {label}</label>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete tag" style={{ ...bo, color: '#EF4444' }} onClick={() => { setTags(p => p.filter(t => t.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button style={bo} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default ItemTags;
