/**
 * AccountingGroups.tsx — K-Series Accounting Groups
 * Categories for items + tax profile + production center assignments
 * Exact Lightspeed K-Series Back Office > Menu > Accounting Groups parity
 */

import {
ArrowLeft,
Edit3,
GripVertical,
Layers,
Plus,Save,
Search,
Trash2,
Wifi,
X
} from 'lucide-react';
import React,{ useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';
import './AccountingGroups.css';

/* ===== Types ===== */

interface AccountingGroup {
    id: string;
    name: string;
    code: string;
    category: string;
    description: string;
    parentGroup: string;
    color: string;
    taxProfile: string;
    productionCenter: string;
    course: number;
    itemCount: number;
    revenue: number;
    isActive: boolean;
    sortOrder: number;
    externalRef: string;
}

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
    const [isLive, setIsLive] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiData } = useVenueConfig<AccountingGroup[]>({ venueId, configType: 'accounting-groups' });

    useEffect(() => {
        if (apiData && apiData.length > 0) {
            setGroups(apiData.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (g: /**/any) => ({
                    id: g.id || g._id || crypto.randomUUID(),
                    name: g.name || '',
                    code: g.code || '',
                    category: g.category || 'revenue',
                    description: g.description || '',
                    parentGroup: g.parentGroup ?? g.parent_group ?? '',
                    color: g.color || '#3B82F6',
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

    const newGroup = (): AccountingGroup => ({
        id: crypto.randomUUID(), name: '', code: '', category: 'revenue', description: '',
        parentGroup: '', color: '#3B82F6', taxProfile: 'Standard 18%', productionCenter: 'Kitchen',
        course: 0, itemCount: 0, revenue: 0, isActive: true, sortOrder: groups.length + 1, externalRef: ''
    });

    return (
        <div className="ag-page">
            <div className="ag-container">
                {/* Header */}
                <div className="ag-header">
                    <div>
                        <button onClick={() => navigate(-1)} className="ag-btn-outline ag-btn-back"><ArrowLeft size={14} /> Back</button>
                        <h1 className="ag-title">Accounting Groups {isLive && <Wifi size={14} className="ag-live-icon" />}</h1>
                        <p className="ag-subtitle">Organize items into groups for reporting, tax profiles, and production routing</p>
                    </div>
                    <button className="ag-btn-primary" onClick={() => setEditing(newGroup())}>
                        <Plus size={16} /> Add Group
                    </button>
                </div>

                {/* Stats */}
                <div className="ag-stats-grid">
                    <div className="ag-card ag-stat-card">
                        <div className="ag-stat-icon ag-stat-icon--blue"><Layers size={16} /></div>
                        <div><div className="ag-stat-value">{groups.filter(g => g.isActive).length}</div><div className="ag-stat-label">Active Groups</div></div>
                    </div>
                    <div className="ag-card ag-stat-card">
                        <div className="ag-stat-icon ag-stat-icon--green"><Layers size={16} /></div>
                        <div><div className="ag-stat-value">{totalItems}</div><div className="ag-stat-label">Total Items</div></div>
                    </div>
                    <div className="ag-card ag-stat-card">
                        <div className="ag-stat-icon ag-stat-icon--amber"><Layers size={16} /></div>
                        <div><div className="ag-stat-value">€{totalRevenue.toLocaleString()}</div><div className="ag-stat-label">Total Revenue</div></div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="ag-card ag-toolbar">
                    <div className="ag-search-wrapper">
                        <Search size={14} className="ag-search-icon" />
                        <input aria-label="Search groups..." className="ag-input ag-search-input" placeholder="Search groups..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="ag-toggle-group">
                        <button onClick={() => setShowInactive(false)} className={`ag-toggle-btn ${!showInactive ? 'ag-toggle-btn--active' : 'ag-toggle-btn--inactive'}`}>Active ({groups.filter(g => g.isActive).length})</button>
                        <button onClick={() => setShowInactive(true)} className={`ag-toggle-btn ${showInactive ? 'ag-toggle-btn--active' : 'ag-toggle-btn--inactive'}`}>Inactive ({groups.filter(g => !g.isActive).length})</button>
                    </div>
                </div>

                {/* Groups Table */}
                <div className="ag-card">
                    <div className="ag-table-header">
                        <div></div><div>Group Name</div><div>Tax Profile</div><div>Production Center</div><div>Course</div><div>Items</div><div>Revenue</div><div>Actions</div>
                    </div>

                    {filtered.map(group => (
                        <div key={group.id} className="ag-table-row" onClick={() => setEditing({ ...group })}>
                            <GripVertical size={14} className="ag-grip-icon" />
                            <div className="ag-name-cell">
                                <div className="ag-color-dot" style={{ background: group.color  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                                <span className="ag-name-text">{group.name}</span>
                            </div>
                            <span className="ag-cell-secondary">{group.taxProfile}</span>
                            <span className="ag-cell-secondary">{group.productionCenter}</span>
                            <span className="ag-cell-secondary">{group.course === 0 ? '—' : `Course ${group.course}`}</span>
                            <span className="ag-cell-value">{group.itemCount}</span>
                            <span className="ag-cell-revenue">€{group.revenue.toLocaleString()}</span>
                            <div className="ag-actions">
                                <button title="Edit group" className="ag-btn-icon ag-btn-icon--secondary" onClick={e => { e.stopPropagation(); setEditing({ ...group }); }}><Edit3 size={13} /></button>
                                <button title="Delete group" className="ag-btn-icon ag-btn-icon--danger" onClick={e => { e.stopPropagation(); setGroups(prev => prev.filter(g => g.id !== group.id)); toast.success('Group deleted'); }}><Trash2 size={13} /></button>
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="ag-empty">
                            <Layers size={36} className="ag-empty-icon" />
                            <p className="ag-empty-text">{"No "}groups found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editing && (
                <div className="ag-modal-overlay" onClick={() => setEditing(null)}>
                    <div className="ag-card ag-modal" onClick={e => e.stopPropagation()}>
                        <div className="ag-modal-header">
                            <h3 className="ag-modal-title">{groups.find(g => g.id === editing.id) ? 'Edit' : 'New'} Accounting Group</h3>
                            <button title="Close" className="ag-btn-icon ag-btn-icon--secondary" onClick={() => setEditing(null)}><X size={20} /></button>
                        </div>

                        <div className="ag-form-group">
                            <label className="ag-form-label">Group Name *</label>
                            <input className="ag-input" value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Food - Starters" />
                        </div>

                        <div className="ag-form-grid">
                            <div>
                                <label className="ag-form-label">Code</label>
                                <input className="ag-input" value={editing.code} onChange={e => setEditing(p => p ? { ...p, code: e.target.value } : null)} placeholder="e.g. FST" maxLength={10} />
                            </div>
                            <div>
                                <label className="ag-form-label">Category</label>
                                <select className="ag-select" value={editing.category} onChange={e => setEditing(p => p ? { ...p, category: e.target.value } : null)} aria-label="Category">
                                    <option value="revenue">Revenue</option>
                                    <option value="cost">Cost</option>
                                    <option value="discount">Discount</option>
                                    <option value="tax">Tax</option>
                                </select>
                            </div>
                        </div>

                        <div className="ag-form-group">
                            <label className="ag-form-label">Description</label>
                            <textarea className="ag-input ag-textarea" value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : null)} placeholder="Brief description of this group" />
                        </div>

                        <div className="ag-form-grid">
                            <div>
                                <label className="ag-form-label">Parent Group</label>
                                <select className="ag-select" value={editing.parentGroup} onChange={e => setEditing(p => p ? { ...p, parentGroup: e.target.value } : null)} aria-label="Parent group">
                                    <option value="">— None (Top Level) —</option>
                                    {groups.filter(g => g.id !== editing.id).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="ag-form-label">External Ref</label>
                                <input className="ag-input" value={editing.externalRef} onChange={e => setEditing(p => p ? { ...p, externalRef: e.target.value } : null)} placeholder="e.g. ERP code" />
                            </div>
                        </div>

                        <div className="ag-form-group">
                            <label className="ag-form-label ag-form-label--color">Color</label>
                            <div className="ag-color-picker">
                                {COLORS.map(c => (
                                    <div key={c} onClick={() => setEditing(p => p ? { ...p, color: c } : null)}
                                        className={`ag-color-swatch ${editing.color === c ? 'ag-color-swatch--selected' : ''}`}
                                        style={{ background: c  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                                ))}
                            </div>
                        </div>

                        <div className="ag-form-grid">
                            <div>
                                <label className="ag-form-label">Tax Profile</label>
                                <select className="ag-select" value={editing.taxProfile} onChange={e => setEditing(p => p ? { ...p, taxProfile: e.target.value } : null)} aria-label="Tax profile">{TAX_PROFILES.map(t => <option key={t}>{t}</option>)}</select>
                            </div>
                            <div>
                                <label className="ag-form-label">Production Center</label>
                                <select className="ag-select" value={editing.productionCenter} onChange={e => setEditing(p => p ? { ...p, productionCenter: e.target.value } : null)} aria-label="Production center">{PROD_CENTERS.map(c => <option key={c}>{c}</option>)}</select>
                            </div>
                        </div>

                        <div className="ag-form-group">
                            <label className="ag-form-label">Default Course</label>
                            <select className="ag-select" value={editing.course} onChange={e => setEditing(p => p ? { ...p, course: parseInt(e.target.value) } : null)} aria-label="Course">
                                <option value={0}>{"No "}Default Course</option>
                                <option value={1}>Course 1 - Starters</option>
                                <option value={2}>Course 2 - Mains</option>
                                <option value={3}>Course 3 - Desserts</option>
                                <option value={4}>Course 4 - After Dinner</option>
                            </select>
                        </div>

                        <div className="ag-toggle-wrapper">
                            <label className="ag-toggle-label">
                                <div onClick={() => setEditing(p => p ? { ...p, isActive: !p.isActive } : null)}
                                    className={`ag-toggle-track ${editing.isActive ? 'ag-toggle-track--on' : 'ag-toggle-track--off'}`}>
                                    <div className={`ag-toggle-thumb ${editing.isActive ? 'ag-toggle-thumb--on' : 'ag-toggle-thumb--off'}`} />
                                </div>
                                Active
                            </label>
                        </div>

                        <div className="ag-modal-footer">
                            <button className="ag-btn-primary ag-btn-save" onClick={saveGroup}><Save size={14} /> Save</button>
                            <button className="ag-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountingGroups;
