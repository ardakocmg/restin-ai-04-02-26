/**
 * AccountingGroups.tsx — K-Series Accounting Groups
 * Categories for items + tax profile + production center assignments
 * Exact Lightspeed K-Series Back Office > Menu > Accounting Groups parity
 */

import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Plus, Save, Edit3, Trash2, Search, X, BookOpen, Wifi,
    Layers, ChevronRight, MoreVertical, GripVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';

/* ===== Types ===== */

interface AccountingGroup {
    id: string;
    name: string;
    code: string; // New field
    category: string; // New field
    description: string; // New field
    parentGroup: string; // New field
    color: string;
    taxProfile: string;
    productionCenter: string;
    course: number;
    itemCount: number;
    revenue: number;
    isActive: boolean;
    sortOrder: number;
    externalRef: string; // New field
}

/* ===== Styles ===== */

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary, #0a0a0a)', color: 'var(--text-primary, #fafafa)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card, #18181b)', border: '1px solid var(--border-primary, #27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, color: 'var(--text-primary, #fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary, #09090b)', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, color: 'var(--text-primary, #fafafa)', fontSize: 14 };
const sl: React.CSSProperties = { ...ip, cursor: 'pointer' };

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6', '#D946EF', '#84CC16'];
const TAX_PROFILES = ['Standard 18%', 'Reduced 5%', 'Reduced 7%', 'Zero Rate', 'Eco Tax 7%'];
const PROD_CENTERS = ['Kitchen', 'Bar', 'Pastry', 'Cold Kitchen', 'Grill Station'];

/* ===== Seed Data ===== */

const SEED: AccountingGroup[] = [
    { id: '1', name: 'Food - Starters', code: 'FST', category: 'revenue', description: 'Starters and appetizers', parentGroup: '', color: '#10B981', taxProfile: 'Standard 18%', productionCenter: 'Cold Kitchen', course: 1, itemCount: 12, revenue: 4520, isActive: true, sortOrder: 1, externalRef: '' },
    { id: '2', name: 'Food - Mains', code: 'FMN', category: 'revenue', description: 'Main courses', parentGroup: '', color: '#3B82F6', taxProfile: 'Standard 18%', productionCenter: 'Kitchen', course: 2, itemCount: 18, revenue: 12800, isActive: true, sortOrder: 2, externalRef: '' },
    { id: '3', name: 'Food - Desserts', code: 'FDS', category: 'revenue', description: 'Desserts and sweets', parentGroup: '', color: '#EC4899', taxProfile: 'Standard 18%', productionCenter: 'Pastry', course: 3, itemCount: 8, revenue: 3200, isActive: true, sortOrder: 3, externalRef: '' },
    { id: '4', name: 'Food - Sides', code: 'FSD', category: 'revenue', description: 'Side dishes', parentGroup: '', color: '#F97316', taxProfile: 'Standard 18%', productionCenter: 'Kitchen', course: 0, itemCount: 6, revenue: 1800, isActive: true, sortOrder: 4, externalRef: '' },
    { id: '5', name: 'Beverages - Alcoholic', code: 'BAL', category: 'revenue', description: 'Alcoholic drinks', parentGroup: '', color: '#F59E0B', taxProfile: 'Standard 18%', productionCenter: 'Bar', course: 0, itemCount: 24, revenue: 8600, isActive: true, sortOrder: 5, externalRef: '' },
    { id: '6', name: 'Beverages - Non-Alcoholic', code: 'BNA', category: 'revenue', description: 'Non-alcoholic drinks', parentGroup: '', color: '#06B6D4', taxProfile: 'Reduced 5%', productionCenter: 'Bar', course: 0, itemCount: 15, revenue: 2400, isActive: true, sortOrder: 6, externalRef: '' },
    { id: '7', name: 'Coffee & Tea', code: 'CFT', category: 'revenue', description: 'Coffee and tea selections', parentGroup: '', color: '#8B5CF6', taxProfile: 'Reduced 5%', productionCenter: 'Bar', course: 0, itemCount: 10, revenue: 1600, isActive: true, sortOrder: 7, externalRef: '' },
    { id: '8', name: 'Extras & Add-ons', code: 'EXT', category: 'revenue', description: 'Extra items and add-ons', parentGroup: '', color: '#84CC16', taxProfile: 'Standard 18%', productionCenter: 'Kitchen', course: 0, itemCount: 5, revenue: 420, isActive: true, sortOrder: 8, externalRef: '' },
    { id: '9', name: 'Specials (Archive)', code: 'SPC', category: 'revenue', description: 'Archived special items', parentGroup: '', color: '#D946EF', taxProfile: 'Standard 18%', productionCenter: 'Kitchen', course: 2, itemCount: 0, revenue: 0, isActive: false, sortOrder: 9, externalRef: '' },
];

/* ===== Component ===== */

const AccountingGroups: React.FC = () => {
    const navigate = useNavigate();
    const [groups, setGroups] = useState<AccountingGroup[]>(SEED);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<AccountingGroup | null>(null);
    const [filterCategory, setFilterCategory] = useState('all'); // New state
    const [isLive, setIsLive] = useState(false); // New state
    const [showInactive, setShowInactive] = useState(false);

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiData } = useVenueConfig<AccountingGroup[]>({ venueId, configType: 'accounting-groups' });

    useEffect(() => {
        if (apiData && apiData.length > 0) {
            setGroups(apiData.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (g: any) => ({
                    id: g.id || g._id || crypto.randomUUID(),
                    name: g.name || '',
                    code: g.code || '',
                    category: g.category || 'revenue',
                    description: g.description || '',
                    parentGroup: g.parentGroup ?? g.parent_group ?? '',
                    color: g.color || '#3B82F6', // Default color if not provided by API
                    taxProfile: g.taxProfile ?? g.tax_profile ?? 'Standard 18%',
                    productionCenter: g.productionCenter ?? g.production_center ?? 'Kitchen',
                    course: g.course ?? 0,
                    itemCount: g.itemCount ?? g.item_count ?? 0,
                    revenue: g.revenue ?? 0,
                    isActive: g.isActive ?? g.is_active ?? true,
                    sortOrder: g.sortOrder ?? g.sort_order ?? 0,
                    externalRef: g.externalRef ?? g.external_ref ?? ''
                })));
            setIsLive(true);
        }
    }, [apiData]);

    const filtered = groups
        .filter(g => showInactive ? !g.isActive : g.isActive)
        .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.sortOrder - b.sortOrder);

    const totalRevenue = groups.filter(g => g.isActive).reduce((a, g) => a + g.revenue, 0);
    const totalItems = groups.filter(g => g.isActive).reduce((a, g) => a + g.itemCount, 0);

    const saveGroup = () => {
        if (!editing) return;
        const exists = groups.find(g => g.id === editing.id);
        if (exists) setGroups(prev => prev.map(g => g.id === editing.id ? editing : g));
        else setGroups(prev => [...prev, editing]);
        setEditing(null);
        toast.success('Accounting group saved');
    };

    return (
        <div style={pg}>
            <div style={ct}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                        <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Accounting Groups {isLive && <Wifi size={14} style={{ color: '#10B981', verticalAlign: 'middle', marginLeft: 6 }} />}</h1>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)', margin: '4px 0 0' }}>Organize items into groups for reporting, tax profiles, and production routing</p>
                    </div>
                    <button style={bp} onClick={() => setEditing({ id: crypto.randomUUID(), name: '', code: '', category: 'revenue', description: '', parentGroup: '', color: '#3B82F6', taxProfile: 'Standard 18%', productionCenter: 'Kitchen', course: 0, itemCount: 0, revenue: 0, isActive: true, sortOrder: groups.length + 1, externalRef: '' })}>
                        <Plus size={16} /> Add Group
                    </button>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                    <div style={{ ...cd, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}><Layers size={16} /></div>
                        <div><div style={{ fontSize: 20, fontWeight: 700 }}>{groups.filter(g => g.isActive).length}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Active Groups</div></div>
                    </div>
                    <div style={{ ...cd, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}><Layers size={16} /></div>
                        <div><div style={{ fontSize: 20, fontWeight: 700 }}>{totalItems}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Items</div></div>
                    </div>
                    <div style={{ ...cd, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}><Layers size={16} /></div>
                        <div><div style={{ fontSize: 20, fontWeight: 700 }}>€{totalRevenue.toLocaleString()}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Revenue</div></div>
                    </div>
                </div>

                {/* Toolbar */}
                <div style={{ ...cd, padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-secondary)' }} />
                        <input style={{ ...ip, paddingLeft: 34, padding: '8px 12px 8px 34px', fontSize: 13 }} placeholder="Search groups..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, overflow: 'hidden' }}>
                        <button onClick={() => setShowInactive(false)} style={{ padding: '7px 14px', fontSize: 12, background: !showInactive ? 'rgba(59,130,246,0.1)' : 'transparent', border: 'none', color: !showInactive ? '#3B82F6' : 'var(--text-secondary)', cursor: 'pointer' }}>Active ({groups.filter(g => g.isActive).length})</button>
                        <button onClick={() => setShowInactive(true)} style={{ padding: '7px 14px', fontSize: 12, background: showInactive ? 'rgba(59,130,246,0.1)' : 'transparent', border: 'none', color: showInactive ? '#3B82F6' : 'var(--text-secondary)', cursor: 'pointer' }}>Inactive ({groups.filter(g => !g.isActive).length})</button>
                    </div>
                </div>

                {/* Groups Table */}
                <div style={cd}>
                    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 140px 130px 80px 100px 80px 70px', gap: 12, padding: '8px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary, #a1a1aa)', letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div></div><div>Group Name</div><div>Tax Profile</div><div>Production Center</div><div>Course</div><div>Items</div><div>Revenue</div><div>Actions</div>
                    </div>

                    {filtered.map(group => (
                        <div key={group.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 140px 130px 80px 100px 80px 70px', gap: 12, padding: '14px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
                            onClick={() => setEditing({ ...group })}>
                            <GripVertical size={14} style={{ color: 'var(--text-secondary)', opacity: 0.3, cursor: 'grab' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 14, height: 14, borderRadius: 4, background: group.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 14, fontWeight: 500 }}>{group.name}</span>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{group.taxProfile}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{group.productionCenter}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{group.course === 0 ? '—' : `Course ${group.course}`}</span>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{group.itemCount}</span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#10B981' }}>€{group.revenue.toLocaleString()}</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button title="Edit group" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }} onClick={e => { e.stopPropagation(); setEditing({ ...group }); }}><Edit3 size={13} /></button>
                                <button title="Delete group" style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4, opacity: 0.6 }} onClick={e => { e.stopPropagation(); setGroups(prev => prev.filter(g => g.id !== group.id)); toast.success('Group deleted'); }}><Trash2 size={13} /></button>
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                            <Layers size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                            <p style={{ fontSize: 14, fontWeight: 500 }}>No groups found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editing && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
                    <div style={{ ...cd, width: 560 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{groups.find(g => g.id === editing.id) ? 'Edit' : 'New'} Accounting Group</h3>
                            <button title="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditing(null)}><X size={20} /></button>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Group Name *</label>
                            <input style={ip} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Food - Starters" />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Code</label>
                                <input style={ip} value={editing.code} onChange={e => setEditing(p => p ? { ...p, code: e.target.value } : null)} placeholder="e.g. FST" maxLength={10} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Category</label>
                                <select style={sl} value={editing.category} onChange={e => setEditing(p => p ? { ...p, category: e.target.value } : null)} aria-label="Category">
                                    <option value="revenue">Revenue</option>
                                    <option value="cost">Cost</option>
                                    <option value="discount">Discount</option>
                                    <option value="tax">Tax</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Description</label>
                            <textarea style={{ ...ip, resize: 'vertical', minHeight: 50 }} value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : null)} placeholder="Brief description of this group" />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Parent Group</label>
                                <select style={sl} value={editing.parentGroup} onChange={e => setEditing(p => p ? { ...p, parentGroup: e.target.value } : null)} aria-label="Parent group">
                                    <option value="">— None (Top Level) —</option>
                                    {groups.filter(g => g.id !== editing.id).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>External Ref</label>
                                <input style={ip} value={editing.externalRef} onChange={e => setEditing(p => p ? { ...p, externalRef: e.target.value } : null)} placeholder="e.g. ERP code" />
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Color</label>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {COLORS.map(c => (
                                    <div key={c} onClick={() => setEditing(p => p ? { ...p, color: c } : null)}
                                        style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer', border: editing.color === c ? '3px solid #fff' : '3px solid transparent' }} />
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Tax Profile</label>
                                <select style={sl} value={editing.taxProfile} onChange={e => setEditing(p => p ? { ...p, taxProfile: e.target.value } : null)} aria-label="Tax profile">{TAX_PROFILES.map(t => <option key={t}>{t}</option>)}</select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Production Center</label>
                                <select style={sl} value={editing.productionCenter} onChange={e => setEditing(p => p ? { ...p, productionCenter: e.target.value } : null)} aria-label="Production center">{PROD_CENTERS.map(c => <option key={c}>{c}</option>)}</select>
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Default Course</label>
                            <select style={sl} value={editing.course} onChange={e => setEditing(p => p ? { ...p, course: parseInt(e.target.value) } : null)} aria-label="Course">
                                <option value={0}>No Default Course</option>
                                <option value={1}>Course 1 - Starters</option>
                                <option value={2}>Course 2 - Mains</option>
                                <option value={3}>Course 3 - Desserts</option>
                                <option value={4}>Course 4 - After Dinner</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <div onClick={() => setEditing(p => p ? { ...p, isActive: !p.isActive } : null)}
                                    style={{ width: 44, height: 24, borderRadius: 12, background: editing.isActive ? '#3B82F6' : '#3f3f46', cursor: 'pointer', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: 2, left: editing.isActive ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                </div>
                                Active
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={saveGroup}><Save size={14} /> Save</button>
                            <button style={bo} onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountingGroups;
