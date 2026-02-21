/**
 * ItemLibrary.tsx — K-Series Item Library
 * Full item management: list, search, filter, bulk actions, create items
 * Exact Lightspeed K-Series Back Office > Menu > Items parity
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
    ArrowLeft, Plus, Search, Filter, Edit3, Trash2, Archive, Tag,
    MoreVertical, Download, Upload, ChevronDown, X, Save, Copy,
    Package, DollarSign, Grid3X3, List, Check, Image, Loader2, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useItemService } from '../../hooks/shared/useItemService';
import authStore from '../../lib/AuthStore';

/* ===== Types ===== */

interface Item {
    id: string;
    name: string;
    type: 'single' | 'combo' | 'item-group';
    price: number;
    costPrice: number;
    accountingGroup: string;
    productionCenter: string;
    taxProfile: string;
    sku: string;
    barcode: string;
    color: string;
    isArchived: boolean;
    hasImage: boolean;
    allergens: string[];
    productionInstructions: string[];
    course: number;
    createdAt: string;
}

/* ===== Styles ===== */

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary, #0a0a0a)', color: 'var(--text-primary, #fafafa)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card, #18181b)', border: '1px solid var(--border-primary, #27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, color: 'var(--text-primary, #fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary, #09090b)', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, color: 'var(--text-primary, #fafafa)', fontSize: 14 };
const sl: React.CSSProperties = { ...ip, cursor: 'pointer' };

/* ===== Seed Data ===== */

const GROUPS = ['Food - Starters', 'Food - Mains', 'Food - Desserts', 'Beverages - Alcoholic', 'Beverages - Non-Alcoholic', 'Extras'];
const CENTERS = ['Kitchen', 'Bar', 'Pastry', 'Cold Kitchen'];
const ALLERGENS = ['Gluten', 'Dairy', 'Nuts', 'Shellfish', 'Eggs', 'Soy', 'Fish', 'Celery'];

const SEED_ITEMS: Item[] = [
    { id: '1', name: 'Bruschetta', type: 'single', price: 8.50, costPrice: 2.10, accountingGroup: 'Food - Starters', productionCenter: 'Cold Kitchen', taxProfile: 'Standard 18%', sku: 'STR-001', barcode: '', color: '#10B981', isArchived: false, hasImage: true, allergens: ['Gluten'], productionInstructions: [], course: 1, createdAt: '2026-01-15' },
    { id: '2', name: 'Caesar Salad', type: 'single', price: 9.50, costPrice: 2.80, accountingGroup: 'Food - Starters', productionCenter: 'Cold Kitchen', taxProfile: 'Standard 18%', sku: 'STR-002', barcode: '', color: '#10B981', isArchived: false, hasImage: true, allergens: ['Dairy', 'Eggs', 'Fish'], productionInstructions: ['No croutons', 'Dressing on side'], course: 1, createdAt: '2026-01-15' },
    { id: '3', name: 'Grilled Salmon', type: 'single', price: 22.00, costPrice: 8.50, accountingGroup: 'Food - Mains', productionCenter: 'Kitchen', taxProfile: 'Standard 18%', sku: 'MN-001', barcode: '', color: '#3B82F6', isArchived: false, hasImage: true, allergens: ['Fish'], productionInstructions: ['Rare', 'Medium', 'Well done'], course: 2, createdAt: '2026-01-16' },
    { id: '4', name: 'Ribeye Steak', type: 'single', price: 28.50, costPrice: 12.00, accountingGroup: 'Food - Mains', productionCenter: 'Kitchen', taxProfile: 'Standard 18%', sku: 'MN-002', barcode: '', color: '#3B82F6', isArchived: false, hasImage: true, allergens: [], productionInstructions: ['Rare', 'Medium-Rare', 'Medium', 'Well done'], course: 2, createdAt: '2026-01-16' },
    { id: '5', name: 'Chicken Parmigiana', type: 'single', price: 18.00, costPrice: 5.50, accountingGroup: 'Food - Mains', productionCenter: 'Kitchen', taxProfile: 'Standard 18%', sku: 'MN-003', barcode: '', color: '#3B82F6', isArchived: false, hasImage: false, allergens: ['Gluten', 'Dairy', 'Eggs'], productionInstructions: [], course: 2, createdAt: '2026-01-17' },
    { id: '6', name: 'Fish & Chips', type: 'single', price: 16.50, costPrice: 4.80, accountingGroup: 'Food - Mains', productionCenter: 'Kitchen', taxProfile: 'Standard 18%', sku: 'MN-004', barcode: '', color: '#3B82F6', isArchived: false, hasImage: true, allergens: ['Gluten', 'Fish'], productionInstructions: [], course: 2, createdAt: '2026-01-17' },
    { id: '7', name: 'Tiramisu', type: 'single', price: 8.00, costPrice: 2.20, accountingGroup: 'Food - Desserts', productionCenter: 'Pastry', taxProfile: 'Standard 18%', sku: 'DS-001', barcode: '', color: '#EC4899', isArchived: false, hasImage: true, allergens: ['Dairy', 'Eggs', 'Gluten'], productionInstructions: [], course: 3, createdAt: '2026-01-18' },
    { id: '8', name: 'House Red Wine', type: 'single', price: 6.50, costPrice: 1.80, accountingGroup: 'Beverages - Alcoholic', productionCenter: 'Bar', taxProfile: 'Standard 18%', sku: 'BV-001', barcode: '', color: '#F59E0B', isArchived: false, hasImage: false, allergens: [], productionInstructions: [], course: 0, createdAt: '2026-01-19' },
    { id: '9', name: 'Espresso', type: 'single', price: 2.50, costPrice: 0.30, accountingGroup: 'Beverages - Non-Alcoholic', productionCenter: 'Bar', taxProfile: 'Reduced 5%', sku: 'BV-010', barcode: '', color: '#06B6D4', isArchived: false, hasImage: false, allergens: [], productionInstructions: ['Decaf', 'Extra shot'], course: 0, createdAt: '2026-01-20' },
    { id: '10', name: 'Coca-Cola', type: 'single', price: 3.00, costPrice: 0.50, accountingGroup: 'Beverages - Non-Alcoholic', productionCenter: 'Bar', taxProfile: 'Reduced 5%', sku: 'BV-011', barcode: '5449000000996', color: '#06B6D4', isArchived: false, hasImage: true, allergens: [], productionInstructions: [], course: 0, createdAt: '2026-01-20' },
    { id: '11', name: 'Set Lunch A', type: 'combo', price: 12.50, costPrice: 4.00, accountingGroup: 'Food - Mains', productionCenter: 'Kitchen', taxProfile: 'Standard 18%', sku: 'CMB-001', barcode: '', color: '#8B5CF6', isArchived: false, hasImage: false, allergens: [], productionInstructions: [], course: 0, createdAt: '2026-02-01' },
    { id: '12', name: 'Soup of the Day', type: 'single', price: 7.00, costPrice: 1.50, accountingGroup: 'Food - Starters', productionCenter: 'Kitchen', taxProfile: 'Standard 18%', sku: 'STR-003', barcode: '', color: '#10B981', isArchived: true, hasImage: false, allergens: ['Celery'], productionInstructions: [], course: 1, createdAt: '2026-01-15' },
];

/* ===== Component ===== */

const ItemLibrary: React.FC = () => {
    const navigate = useNavigate();
    const venueId = String(localStorage.getItem('restin_pos_venue') || authStore.getUser()?.venue_id || '');
    const { items: apiItems, loading: apiLoading, error: apiError, refetch } = useItemService({ venueId, enabled: !!venueId });
    const [items, setItems] = useState<Item[]>(SEED_ITEMS);
    const [apiWired, setApiWired] = useState(false);

    // Sync API data → local state (map API shape to local Item type)
    useEffect(() => {
        if (apiItems.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped: Item[] = apiItems.map((ai: Record<string, unknown>) => ({
                id: String(ai.id || ai._id || ''),
                name: String(ai.name || ''),
                type: String(ai.type || 'single') as Item['type'],
                price: Number(ai.price || ai.sell_price || 0),
                costPrice: Number(ai.cost_price || ai.costPrice || 0),
                accountingGroup: String(ai.accounting_group || ai.accountingGroup || ai.category || GROUPS[0]),
                productionCenter: String(ai.production_center || ai.productionCenter || CENTERS[0]),
                taxProfile: String(ai.tax_profile || ai.taxProfile || 'Standard 18%'),
                sku: String(ai.sku || ''),
                barcode: String(ai.barcode || ''),
                color: String(ai.color || '#3B82F6'),
                isArchived: Boolean(ai.is_archived || ai.isArchived || ai.deleted_at),
                hasImage: Boolean(ai.image || ai.hasImage),
                allergens: Array.isArray(ai.allergens) ? ai.allergens as string[] : [],
                productionInstructions: Array.isArray(ai.production_instructions || ai.productionInstructions) ? (ai.production_instructions || ai.productionInstructions) as string[] : [],
                course: Number(ai.course || 0),
                createdAt: String(ai.created_at || ai.createdAt || new Date().toISOString().split('T')[0]),
            }));
            setItems(mapped);
            setApiWired(true);
        }
    }, [apiItems]);
    const [search, setSearch] = useState('');
    const [filterGroup, setFilterGroup] = useState('all');
    const [filterType, setFilterType] = useState<'all' | 'single' | 'combo' | 'item-group'>('all');
    const [filterCenter, setFilterCenter] = useState('all');
    const [showArchived, setShowArchived] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [showBulkMenu, setShowBulkMenu] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const filtered = useMemo(() => {
        return items.filter(item => {
            if (!showArchived && item.isArchived) return false;
            if (showArchived && !item.isArchived) return false;
            if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.sku.toLowerCase().includes(search.toLowerCase())) return false;
            if (filterGroup !== 'all' && item.accountingGroup !== filterGroup) return false;
            if (filterType !== 'all' && item.type !== filterType) return false;
            if (filterCenter !== 'all' && item.productionCenter !== filterCenter) return false;
            return true;
        });
    }, [items, search, filterGroup, filterType, filterCenter, showArchived]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === filtered.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filtered.map(i => i.id)));
    };

    const bulkArchive = () => {
        setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, isArchived: !i.isArchived } : i));
        toast.success(`${selectedIds.size} items ${showArchived ? 'unarchived' : 'archived'}`);
        setSelectedIds(new Set());
        setShowBulkMenu(false);
    };

    const bulkAssignGroup = (group: string) => {
        setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, accountingGroup: group } : i));
        toast.success(`${selectedIds.size} items assigned to "${group}"`);
        setSelectedIds(new Set());
        setShowBulkMenu(false);
    };

    const bulkDelete = () => {
        setItems(prev => prev.filter(i => !selectedIds.has(i.id)));
        toast.success(`${selectedIds.size} items deleted`);
        setSelectedIds(new Set());
        setShowBulkMenu(false);
    };

    const saveItem = () => {
        if (!editingItem) return;
        const exists = items.find(i => i.id === editingItem.id);
        if (exists) setItems(prev => prev.map(i => i.id === editingItem.id ? editingItem : i));
        else setItems(prev => [...prev, editingItem]);
        setEditingItem(null);
        toast.success('Item saved');
    };

    const stats = useMemo(() => ({
        total: items.filter(i => !i.isArchived).length,
        archived: items.filter(i => i.isArchived).length,
        combos: items.filter(i => i.type === 'combo' && !i.isArchived).length,
        avgPrice: items.filter(i => !i.isArchived && i.price > 0).reduce((a, i) => a + i.price, 0) / Math.max(1, items.filter(i => !i.isArchived && i.price > 0).length),
    }), [items]);

    return (
        <div style={pg}>
            <div style={ct}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <div>
                        <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Item Library</h1> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <p style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)', margin: '4px 0 0' }}>Manage all POS items, combos, and item groups{apiWired && <span style={{ marginLeft: 8, fontSize: 11, color: '#10B981' }}>● Live</span>}</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button style={{ ...bo, fontSize: 12, padding: '8px 14px' }}><Upload size={14} /> Import</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button style={{ ...bo, fontSize: 12, padding: '8px 14px' }}><Download size={14} /> Export</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button style={bp} onClick={() => setEditingItem({ id: crypto.randomUUID(), name: '', type: 'single', price: 0, costPrice: 0, accountingGroup: GROUPS[0], productionCenter: CENTERS[0], taxProfile: 'Standard 18%', sku: '', barcode: '', color: '#3B82F6', isArchived: false, hasImage: false, allergens: [], productionInstructions: [], course: 0, createdAt: new Date().toISOString().split('T')[0] })}>
                            <Plus size={16} /> Create Item
                        </button>
                    </div>
                </div>

                {/* Loading / Error */}
                {apiLoading && <div style={{ ...cd, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 30 }}><Loader2 size={18} className="animate-spin" style={{ color: '#3B82F6' }} /><span style={{ color: 'var(--text-secondary)' }}>{"Loading "}items from API...</span></div>} /* keep-inline */ /* keep-inline */ /* keep-inline */
                {apiError && <div style={{ ...cd, borderColor: '#EF4444', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#EF4444', fontSize: 13 }}>⚠ {apiError}</span><button style={{ ...bo, padding: '6px 14px', fontSize: 12 }} onClick={() => refetch()}>Retry</button></div>} /* keep-inline */ /* keep-inline */ /* keep-inline */

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    {[
                        { label: 'Active Items', value: stats.total, color: '#3B82F6', icon: <Package size={16} /> },
                        { label: 'Archived', value: stats.archived, color: '#F59E0B', icon: <Archive size={16} /> },
                        { label: 'Combos', value: stats.combos, color: '#8B5CF6', icon: <Grid3X3 size={16} /> },
                        { label: 'Avg. Price', value: `€${stats.avgPrice.toFixed(2)}`, color: '#10B981', icon: <DollarSign size={16} /> },
                    ].map((s, i) => (
                        <div key={i} style={{ ...cd, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ fontSize: 12, color: 'var(--text-secondary, #a1a1aa)' }}>{s.label}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            </div>
                        </div>
                    ))}
                </div>

                {/* Toolbar */}
                <div style={{ ...cd, padding: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <Search size={14} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-secondary)' }} />
                        <input aria-label="Search items by name or SKU..." style={{ ...ip, paddingLeft: 34, fontSize: 13, padding: '8px 12px 8px 34px' }} placeholder="Search items by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} aria-label="Search items" /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    </div>

                    <button style={{ ...bo, padding: '8px 12px', fontSize: 12, ...(showFilters ? { background: 'rgba(59,130,246,0.1)', borderColor: '#3B82F6', color: '#3B82F6' } : {}) }} onClick={() => setShowFilters(!showFilters)}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <Filter size={14} /> Filters {showFilters ? '▴' : '▾'}
                    </button>

                    <div style={{ display: 'flex', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, overflow: 'hidden' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button title="List view" onClick={() => setViewMode('list')} style={{ padding: '7px 10px', background: viewMode === 'list' ? 'rgba(59,130,246,0.1)' : 'transparent', border: 'none', color: viewMode === 'list' ? '#3B82F6' : 'var(--text-secondary)', cursor: 'pointer' }}><List size={14} /></button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button title="Grid view" onClick={() => setViewMode('grid')} style={{ padding: '7px 10px', background: viewMode === 'grid' ? 'rgba(59,130,246,0.1)' : 'transparent', border: 'none', color: viewMode === 'grid' ? '#3B82F6' : 'var(--text-secondary)', cursor: 'pointer' }}><Grid3X3 size={14} /></button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    </div>

                    <div style={{ display: 'flex', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, overflow: 'hidden' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button onClick={() => setShowArchived(false)} style={{ padding: '7px 14px', fontSize: 12, background: !showArchived ? 'rgba(59,130,246,0.1)' : 'transparent', border: 'none', color: !showArchived ? '#3B82F6' : 'var(--text-secondary)', cursor: 'pointer' }}>Active</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button onClick={() => setShowArchived(true)} style={{ padding: '7px 14px', fontSize: 12, background: showArchived ? 'rgba(59,130,246,0.1)' : 'transparent', border: 'none', color: showArchived ? '#3B82F6' : 'var(--text-secondary)', cursor: 'pointer' }}>Archived</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    </div>
                </div>

                {/* Filters Row */}
                {showFilters && (
                    <div style={{ ...cd, padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <select style={{ ...sl, width: 200, fontSize: 12, padding: '8px 12px' }} value={filterGroup} onChange={e => setFilterGroup(e.target.value)} aria-label="Filter by group"> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <option value="all">All Accounting Groups</option>
                            {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <select style={{ ...sl, width: 160, fontSize: 12, padding: '8px 12px' }} value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)} aria-label="Filter by type"> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <option value="all">All Types</option>
                            <option value="single">Single Items</option>
                            <option value="combo">Combos</option>
                            <option value="item-group">Item Groups</option>
                        </select>
                        <select style={{ ...sl, width: 160, fontSize: 12, padding: '8px 12px' }} value={filterCenter} onChange={e => setFilterCenter(e.target.value)} aria-label="Filter by production center"> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <option value="all">All Centers</option>
                            {CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button style={{ ...bo, padding: '8px 12px', fontSize: 12, marginLeft: 'auto' }} onClick={() => { setFilterGroup('all'); setFilterType('all'); setFilterCenter('all'); }}><X size={12} /> Clear</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    </div>
                )}

                {/* Bulk Actions */}
                {selectedIds.size > 0 && (
                    <div style={{ ...cd, padding: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.2)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <Check size={16} color="#3B82F6" />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedIds.size} selected</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <button style={{ ...bo, padding: '6px 12px', fontSize: 12 }} onClick={bulkArchive}><Archive size={12} /> {showArchived ? 'Unarchive' : 'Archive'}</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ position: 'relative' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <button style={{ ...bo, padding: '6px 12px', fontSize: 12 }} onClick={() => setShowBulkMenu(!showBulkMenu)}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <Tag size={12} /> Assign Group <ChevronDown size={12} />
                                </button>
                                {showBulkMenu && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--bg-card, #18181b)', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, padding: 4, zIndex: 100, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                                        {GROUPS.map(g => (
                                            <button key={g} onClick={() => bulkAssignGroup(g)} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 12, textAlign: 'left', cursor: 'pointer', borderRadius: 4 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button style={{ ...bo, padding: '6px 12px', fontSize: 12, color: '#EF4444', borderColor: 'rgba(239,68,68,0.2)' }} onClick={bulkDelete}><Trash2 size={12} /> Delete</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <button style={{ ...bo, padding: '6px 12px', fontSize: 12 }} onClick={() => setSelectedIds(new Set())}><X size={12} /> Clear</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div>
                    </div>
                )}

                {/* Item List */}
                {viewMode === 'list' ? (
                    <div style={cd}>
                        {/* Header Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 130px 100px 130px 100px 80px', gap: 12, padding: '8px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary, #a1a1aa)', letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ cursor: 'pointer' }} onClick={selectAll}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ width: 16, height: 16, borderRadius: 4, border: selectedIds.size === filtered.length && filtered.length > 0 ? '2px solid #3B82F6' : '2px solid var(--border-primary, #27272a)', background: selectedIds.size === filtered.length && filtered.length > 0 ? '#3B82F6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    {selectedIds.size === filtered.length && filtered.length > 0 && <Check size={10} color="#fff" />}
                                </div>
                            </div>
                            <div>Item</div>
                            <div>Accounting Group</div>
                            <div>Type</div>
                            <div>Production Center</div>
                            <div>Price</div>
                            <div>Actions</div>
                        </div>

                        {/* Items */}
                        {filtered.map(item => (
                            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 130px 100px 130px 100px 80px', gap: 12, padding: '12px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                                onClick={() => setEditingItem({ ...item })}>
                                <div onClick={e => { e.stopPropagation(); toggleSelect(item.id); }} style={{ cursor: 'pointer' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <div style={{ width: 16, height: 16, borderRadius: 4, border: selectedIds.has(item.id) ? '2px solid #3B82F6' : '2px solid var(--border-primary, #27272a)', background: selectedIds.has(item.id) ? '#3B82F6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        {selectedIds.has(item.id) && <Check size={10} color="#fff" />}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <div style={{ width: 32, height: 32, borderRadius: 6, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        {item.hasImage ? <Image size={14} /> : <Package size={14} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                            {item.sku && <span>{item.sku}</span>}
                                            {item.allergens.length > 0 && <span>⚠ {item.allergens.length} allergens</span>}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.accountingGroup.split(' - ')[1] || item.accountingGroup}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div>
                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: item.type === 'combo' ? 'rgba(139,92,246,0.1)' : 'rgba(59,130,246,0.1)', color: item.type === 'combo' ? '#8B5CF6' : '#3B82F6' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        {item.type === 'single' ? 'Single' : item.type === 'combo' ? 'Combo' : 'Group'}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.productionCenter}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ fontSize: 13, fontWeight: 600 }}>€{item.price.toFixed(2)}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ display: 'flex', gap: 4 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <button title="Edit item" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }} onClick={e => { e.stopPropagation(); setEditingItem({ ...item }); }}><Edit3 size={13} /></button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <button title="Duplicate item" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }} onClick={e => { e.stopPropagation(); setItems(prev => [...prev, { ...item, id: crypto.randomUUID(), name: `${item.name} (Copy)` }]); toast.success('Item duplicated'); }}><Copy size={13} /></button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                </div>
                            </div>
                        ))}

                        {filtered.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <Package size={36} style={{ opacity: 0.3, marginBottom: 8 }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <p style={{ fontSize: 14, fontWeight: 500 }}>{"No "}items found</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <p style={{ fontSize: 12 }}>{search ? 'Try a different search term' : 'Create your first item to get started'}</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            </div>
                        )}
                    </div>
                ) : (
                    /* Grid View */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        {filtered.map(item => (
                            <div key={item.id} style={{ ...cd, padding: 14, cursor: 'pointer' }} onClick={() => setEditingItem({ ...item })}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <div style={{ width: 40, height: 40, borderRadius: 8, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        <Package size={18} />
                                    </div>
                                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: item.type === 'combo' ? 'rgba(139,92,246,0.1)' : 'rgba(59,130,246,0.1)', color: item.type === 'combo' ? '#8B5CF6' : '#3B82F6' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        {item.type}
                                    </span>
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.name}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{item.accountingGroup}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#10B981' }}>€{item.price.toFixed(2)}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    Showing {filtered.length} of {items.length} items
                </div>
            </div>

            {/* Edit/Create Item Modal */}
            {editingItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditingItem(null)}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <div style={{ ...cd, width: 560, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{items.find(i => i.id === editingItem.id) ? 'Edit Item' : 'Create New Item'}</h3> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <button title="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditingItem(null)}><X size={20} /></button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ gridColumn: '1 / -1' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name *</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <input style={ip} value={editingItem.name} onChange={e => setEditingItem(p => p ? { ...p, name: e.target.value } : null)} placeholder="Item name" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Type</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <select style={sl} value={editingItem.type} onChange={e => setEditingItem(p => p ? { ...p, type: e.target.value as Item['type'] } : null)} aria-label="Item type">
                                    <option value="single">Single Item</option>
                                    <option value="combo">Combo</option>
                                    <option value="item-group">Item Group</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Course</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <select style={sl} value={editingItem.course} onChange={e => setEditingItem(p => p ? { ...p, course: parseInt(e.target.value) } : null)} aria-label="Course">
                                    <option value={0}>{"No "}Course</option>
                                    <option value={1}>Course 1 - Starters</option>
                                    <option value={2}>Course 2 - Mains</option>
                                    <option value={3}>Course 3 - Desserts</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Price (€)</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <input type="number" step="0.01" style={ip} value={editingItem.price} onChange={e => setEditingItem(p => p ? { ...p, price: parseFloat(e.target.value) || 0 } : null)} aria-label="Price" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Cost Price (€)</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <input type="number" step="0.01" style={ip} value={editingItem.costPrice} onChange={e => setEditingItem(p => p ? { ...p, costPrice: parseFloat(e.target.value) || 0 } : null)} aria-label="Cost price" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Accounting Group</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <select style={sl} value={editingItem.accountingGroup} onChange={e => setEditingItem(p => p ? { ...p, accountingGroup: e.target.value } : null)} aria-label="Accounting group">{GROUPS.map(g => <option key={g} value={g}>{g}</option>)}</select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Production Center</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <select style={sl} value={editingItem.productionCenter} onChange={e => setEditingItem(p => p ? { ...p, productionCenter: e.target.value } : null)} aria-label="Production center">{CENTERS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Tax Profile</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <select style={sl} value={editingItem.taxProfile} onChange={e => setEditingItem(p => p ? { ...p, taxProfile: e.target.value } : null)} aria-label="Tax profile">
                                    <option>Standard 18%</option><option>Reduced 5%</option><option>Zero Rate</option><option>Eco Tax 7%</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>SKU</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <input style={ip} value={editingItem.sku} onChange={e => setEditingItem(p => p ? { ...p, sku: e.target.value } : null)} placeholder="e.g. MN-001" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Barcode</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <input style={ip} value={editingItem.barcode} onChange={e => setEditingItem(p => p ? { ...p, barcode: e.target.value } : null)} placeholder="Scan or enter" />
                            </div>
                        </div>

                        {/* Allergens */}
                        <div style={{ marginTop: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Allergens</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                {ALLERGENS.map(a => (
                                    <button key={a} onClick={() => setEditingItem(p => {
                                        if (!p) return null;
                                        const has = p.allergens.includes(a);
                                        return { ...p, allergens: has ? p.allergens.filter(x => x !== a) : [...p.allergens, a] };
                                    })} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: editingItem.allergens.includes(a) ? '1px solid #EF4444' : '1px solid var(--border-primary, #27272a)', background: editingItem.allergens.includes(a) ? 'rgba(239,68,68,0.1)' : 'transparent', color: editingItem.allergens.includes(a) ? '#EF4444' : 'var(--text-secondary)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        {a}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Margin Display */}
                        {editingItem.price > 0 && editingItem.costPrice > 0 && (
                            <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-secondary, #09090b)', borderRadius: 8, fontSize: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <span style={{ color: 'var(--text-secondary)' }}>Margin:</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <span style={{ fontWeight: 600, color: '#10B981' }}>{((1 - editingItem.costPrice / editingItem.price) * 100).toFixed(1)}%</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <span style={{ color: 'var(--text-secondary)' }}>Profit:</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <span style={{ fontWeight: 600 }}>€{(editingItem.price - editingItem.costPrice).toFixed(2)}</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={saveItem}><Save size={14} /> Save Item</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <button style={bo} onClick={() => setEditingItem(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemLibrary;
