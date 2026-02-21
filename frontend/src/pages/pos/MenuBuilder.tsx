/**
 * MenuBuilder.tsx — K-Series Menu Builder
 * Create & manage POS menus: main screens, sub-screens, button layout grid
 * Exact Lightspeed K-Series Back Office > Menu > Menus parity
 */

import React, { useState, useCallback } from 'react';
import {
    ArrowLeft, Plus, Save, Grid3X3, Edit3, Trash2, Copy, Eye,
    ChevronRight, ChevronDown, Move, Palette, MoreVertical,
    Search, Menu as MenuIcon, Layout, Settings, X, GripVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/* ===== Types ===== */

interface MenuItem {
    id: string;
    name: string;
    price: number;
    color: string;
    icon?: string;
    type: 'item' | 'sub-screen' | 'combo' | 'empty';
    subItems?: MenuItem[];
}

interface MainScreen {
    id: string;
    name: string;
    color: string;
    gridCols: number;
    gridRows: number;
    buttons: (MenuItem | null)[];
}

interface POSMenu {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    mainScreens: MainScreen[];
    createdAt: string;
    updatedAt: string;
}

/* ===== Styles ===== */

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary, #0a0a0a)', color: 'var(--text-primary, #fafafa)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card, #18181b)', border: '1px solid var(--border-primary, #27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, color: 'var(--text-primary, #fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary, #09090b)', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, color: 'var(--text-primary, #fafafa)', fontSize: 14 };

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6', '#D946EF', '#84CC16'];

/* ===== Seed Data ===== */

const createButton = (name: string, price: number, color: string, type: MenuItem['type'] = 'item'): MenuItem => ({
    id: crypto.randomUUID(), name, price, color, type,
});

const SEED_MENUS: POSMenu[] = [
    {
        id: '1', name: 'Main Menu', description: 'Default restaurant menu', isActive: true,
        createdAt: '2026-01-15', updatedAt: '2026-02-19',
        mainScreens: [
            {
                id: 's1', name: 'Starters', color: '#10B981', gridCols: 4, gridRows: 3,
                buttons: [
                    createButton('Bruschetta', 8.50, '#10B981'), createButton('Soup of Day', 7.00, '#10B981'),
                    createButton('Caesar Salad', 9.50, '#10B981'), createButton('Garlic Bread', 5.00, '#10B981'),
                    createButton('Calamari', 11.00, '#10B981'), createButton('Prawn Cocktail', 12.50, '#10B981'),
                    createButton('Hummus Platter', 8.00, '#10B981'), createButton('Spring Rolls', 7.50, '#10B981'),
                    null, null, null, null,
                ],
            },
            {
                id: 's2', name: 'Mains', color: '#3B82F6', gridCols: 4, gridRows: 4,
                buttons: [
                    createButton('Grilled Salmon', 22.00, '#3B82F6'), createButton('Ribeye Steak', 28.50, '#3B82F6'),
                    createButton('Chicken Parm', 18.00, '#3B82F6'), createButton('Fish & Chips', 16.50, '#3B82F6'),
                    createButton('Pasta Carbonara', 15.00, '#3B82F6'), createButton('Lamb Chops', 26.00, '#3B82F6'),
                    createButton('Burger Classic', 14.50, '#3B82F6'), createButton('Seafood Platter', 32.00, '#3B82F6'),
                    createButton('Risotto', 17.00, '#3B82F6'), createButton('Duck Breast', 24.00, '#3B82F6'),
                    null, null, null, null, null, null,
                ],
            },
            {
                id: 's3', name: 'Desserts', color: '#EC4899', gridCols: 3, gridRows: 3,
                buttons: [
                    createButton('Tiramisu', 8.00, '#EC4899'), createButton('Panna Cotta', 7.50, '#EC4899'),
                    createButton('Chocolate Fondant', 9.00, '#EC4899'), createButton('Crème Brûlée', 7.00, '#EC4899'),
                    createButton('Ice Cream', 5.50, '#EC4899'), createButton('Cheesecake', 8.50, '#EC4899'),
                    null, null, null,
                ],
            },
            {
                id: 's4', name: 'Drinks', color: '#F59E0B', gridCols: 4, gridRows: 3,
                buttons: [
                    createButton('House Red', 6.50, '#F59E0B'), createButton('House White', 6.50, '#F59E0B'),
                    createButton('Prosecco', 7.00, '#F59E0B'), createButton('Beer Draft', 5.50, '#F59E0B'),
                    createButton('Soft Drink', 3.00, '#F59E0B'), createButton('Coffee', 2.50, '#F59E0B'),
                    createButton('Tea', 2.50, '#F59E0B'), createButton('Juice', 3.50, '#F59E0B'),
                    createButton('Water', 2.00, '#F59E0B'), createButton('Cocktails', 0, '#F59E0B', 'sub-screen'),
                    null, null,
                ],
            },
        ],
    },
    {
        id: '2', name: 'Lunch Menu', description: 'Weekday lunch specials', isActive: true,
        createdAt: '2026-01-20', updatedAt: '2026-02-18',
        mainScreens: [
            {
                id: 'l1', name: 'Lunch Specials', color: '#06B6D4', gridCols: 3, gridRows: 2,
                buttons: [
                    createButton('Set Lunch A', 12.50, '#06B6D4'), createButton('Set Lunch B', 14.50, '#06B6D4'),
                    createButton('Set Lunch C', 16.50, '#06B6D4'), createButton('Soup + Sandwich', 10.00, '#06B6D4'),
                    createButton('Daily Special', 13.00, '#06B6D4'), null,
                ],
            },
        ],
    },
    {
        id: '3', name: 'Bar Menu', description: 'Bar & cocktail menu', isActive: false,
        createdAt: '2026-02-01', updatedAt: '2026-02-15',
        mainScreens: [],
    },
];

/* ===== Component ===== */

const MenuBuilder: React.FC = () => {
    const navigate = useNavigate();
    const [menus, setMenus] = useState<POSMenu[]>(SEED_MENUS);
    const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
    const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
    const [editingButton, setEditingButton] = useState<{ screenId: string; index: number; item: MenuItem } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewMenu, setShowNewMenu] = useState(false);
    const [newMenuName, setNewMenuName] = useState('');
    const [showNewScreen, setShowNewScreen] = useState(false);
    const [newScreenName, setNewScreenName] = useState('');
    const [newScreenColor, setNewScreenColor] = useState('#3B82F6');

    const selectedMenu = menus.find(m => m.id === selectedMenuId);
    const selectedScreen = selectedMenu?.mainScreens.find(s => s.id === selectedScreenId);

    const filteredMenus = menus.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const createMenu = useCallback(() => {
        if (!newMenuName.trim()) return;
        const menu: POSMenu = {
            id: crypto.randomUUID(), name: newMenuName, description: '', isActive: true,
            mainScreens: [], createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0],
        };
        setMenus(prev => [...prev, menu]);
        setShowNewMenu(false);
        setNewMenuName('');
        setSelectedMenuId(menu.id);
        toast.success(`Menu "${newMenuName}" created`);
    }, [newMenuName]);

    const deleteMenu = useCallback((id: string) => {
        setMenus(prev => prev.filter(m => m.id !== id));
        if (selectedMenuId === id) { setSelectedMenuId(null); setSelectedScreenId(null); }
        toast.success('Menu deleted');
    }, [selectedMenuId]);

    const duplicateMenu = useCallback((menu: POSMenu) => {
        const copy: POSMenu = {
            ...menu, id: crypto.randomUUID(), name: `${menu.name} (Copy)`,
            mainScreens: menu.mainScreens.map(s => ({
                ...s, id: crypto.randomUUID(),
                buttons: s.buttons.map(b => b ? { ...b, id: crypto.randomUUID() } : null),
            })),
        };
        setMenus(prev => [...prev, copy]);
        toast.success('Menu duplicated');
    }, []);

    const addScreen = useCallback(() => {
        if (!selectedMenuId || !newScreenName.trim()) return;
        const screen: MainScreen = {
            id: crypto.randomUUID(), name: newScreenName, color: newScreenColor,
            gridCols: 4, gridRows: 3,
            buttons: Array(12).fill(null),
        };
        setMenus(prev => prev.map(m => m.id === selectedMenuId ? { ...m, mainScreens: [...m.mainScreens, screen] } : m));
        setShowNewScreen(false);
        setNewScreenName('');
        setSelectedScreenId(screen.id);
        toast.success(`Screen "${newScreenName}" added`);
    }, [selectedMenuId, newScreenName, newScreenColor]);

    const deleteScreen = useCallback((screenId: string) => {
        if (!selectedMenuId) return;
        setMenus(prev => prev.map(m => m.id === selectedMenuId ? { ...m, mainScreens: m.mainScreens.filter(s => s.id !== screenId) } : m));
        if (selectedScreenId === screenId) setSelectedScreenId(null);
        toast.success('Screen deleted');
    }, [selectedMenuId, selectedScreenId]);

    const updateButton = useCallback((screenId: string, index: number, item: MenuItem | null) => {
        if (!selectedMenuId) return;
        setMenus(prev => prev.map(m => m.id === selectedMenuId ? {
            ...m,
            mainScreens: m.mainScreens.map(s => s.id === screenId ? {
                ...s,
                buttons: s.buttons.map((b, i) => i === index ? item : b),
            } : s),
        } : m));
    }, [selectedMenuId]);

    const addItemToGrid = useCallback((screenId: string) => {
        if (!selectedMenuId) return;
        setMenus(prev => prev.map(m => m.id === selectedMenuId ? {
            ...m,
            mainScreens: m.mainScreens.map(s => {
                if (s.id !== screenId) return s;
                const emptyIdx = s.buttons.findIndex(b => b === null);
                if (emptyIdx === -1) {
                    return { ...s, buttons: [...s.buttons, createButton('New Item', 0, s.color)] };
                }
                const newButtons = [...s.buttons];
                newButtons[emptyIdx] = createButton('New Item', 0, s.color);
                return { ...s, buttons: newButtons };
            }),
        } : m));
        toast.success('Item added to grid');
    }, [selectedMenuId]);

    /* ===== RENDER: Menu List (no menu selected) ===== */
    if (!selectedMenuId) {
        return (
            <div style={pg}>
                <div style={ct}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div>
                            <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 12, padding: '8px 16px', fontSize: 13 }}><ArrowLeft size={14} /> Back</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Menus</h1> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <p style={{ fontSize: 14, color: 'var(--text-secondary, #a1a1aa)', margin: '4px 0 0' }}>Create and manage POS menus for your restaurant</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div>
                        <button style={bp} onClick={() => setShowNewMenu(true)}><Plus size={16} /> Create Menu</button>
                    </div>

                    {/* Search */}
                    <div style={{ position: 'relative', marginBottom: 20 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <Search size={16} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-secondary, #a1a1aa)' }} />
                        <input aria-label="Search menus..." style={{ ...ip, paddingLeft: 38 }} placeholder="Search menus..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    </div>

                    {/* New Menu Modal */}
                    {showNewMenu && (
                        <div style={cd}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Create New Menu</h3> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setShowNewMenu(false)}><X size={18} /></button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            </div>
                            <input aria-label="Menu name..." style={{ ...ip, marginBottom: 12 }} placeholder="Menu name..." value={newMenuName} onChange={e => setNewMenuName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && createMenu()} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ display: 'flex', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <button style={bp} onClick={createMenu}><Plus size={14} /> Create</button>
                                <button style={bo} onClick={() => setShowNewMenu(false)}>Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* Menu Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340, 1fr))', gap: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        {filteredMenus.map(menu => (
                            <div key={menu.id} style={{ ...cd, cursor: 'pointer', transition: 'border-color 0.2s' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                                onClick={() => { setSelectedMenuId(menu.id); setSelectedScreenId(menu.mainScreens[0]?.id || null); }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                            <MenuIcon size={18} color="#3B82F6" />
                                            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{menu.name}</h3> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        </div>
                                        {menu.description && <p style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)', margin: '4px 0 0' }}>{menu.description}</p>} /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    </div>
                                    <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: menu.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: menu.isActive ? '#10B981' : '#EF4444' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        {menu.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 13, color: 'var(--text-secondary, #a1a1aa)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <span><Layout size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{menu.mainScreens.length} screens</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <span><Grid3X3 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{menu.mainScreens.reduce((a, s) => a + s.buttons.filter(b => b !== null).length, 0)} items</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    {menu.mainScreens.slice(0, 5).map(screen => (
                                        <span key={screen.id} style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, background: `${screen.color}20`, color: screen.color, border: `1px solid ${screen.color}30` }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                            {screen.name}
                                        </span>
                                    ))}
                                    {menu.mainScreens.length > 5 && <span style={{ padding: '3px 8px', fontSize: 11, color: 'var(--text-secondary)' }}>+{menu.mainScreens.length - 5} more</span>} /* keep-inline */ /* keep-inline */ /* keep-inline */
                                </div>

                                <div style={{ display: 'flex', gap: 8, marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <button style={{ ...bo, padding: '6px 12px', fontSize: 12, flex: 1 }} onClick={e => { e.stopPropagation(); duplicateMenu(menu); }}><Copy size={12} /> Duplicate</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <button style={{ ...bo, padding: '6px 12px', fontSize: 12, flex: 1 }} onClick={e => { e.stopPropagation(); setSelectedMenuId(menu.id); }}><Eye size={12} /> Edit</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <button style={{ ...bo, padding: '6px 12px', fontSize: 12, color: '#EF4444', borderColor: 'rgba(239,68,68,0.2)' }} onClick={e => { e.stopPropagation(); deleteMenu(menu.id); }}><Trash2 size={12} /></button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredMenus.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary, #a1a1aa)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <MenuIcon size={48} style={{ marginBottom: 12, opacity: 0.3 }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <p style={{ fontSize: 16, fontWeight: 500 }}>{"No "}menus found</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <p style={{ fontSize: 13 }}>Create your first POS menu to get started</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div>
                    )}
                </div>
            </div>
        );
    }

    /* ===== RENDER: Menu Editor (menu selected) ===== */
    return (
        <div style={pg}>
            <div style={{ ...ct, display: 'flex', gap: 20 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                {/* Left: Screen List */}
                <div style={{ width: 240, flexShrink: 0 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <button onClick={() => { setSelectedMenuId(null); setSelectedScreenId(null); }} style={{ ...bo, width: '100%', marginBottom: 12, padding: '8px 14px', fontSize: 13 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <ArrowLeft size={14} /> All Menus
                    </button>

                    <div style={{ ...cd, padding: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{selectedMenu?.name}</h3> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <button style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 12, fontWeight: 500 }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                                onClick={() => toast.success('Menu saved')}>
                                <Save size={12} /> Save
                            </button>
                        </div>

                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary, #a1a1aa)', marginBottom: 8, letterSpacing: 0.5 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            Main Screens
                        </div>

                        {selectedMenu?.mainScreens.map(screen => (
                            <div key={screen.id}
                                onClick={() => setSelectedScreenId(screen.id)}
                                style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8,
                                    cursor: 'pointer', marginBottom: 4, fontSize: 13,
                                    background: selectedScreenId === screen.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                                    color: selectedScreenId === screen.id ? '#3B82F6' : 'var(--text-primary, #fafafa)',
                                    fontWeight: selectedScreenId === screen.id ? 600 : 400,
                                }}>
                                <GripVertical size={12} style={{ opacity: 0.3 }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ width: 12, height: 12, borderRadius: 3, background: screen.color, flexShrink: 0 }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{screen.name}</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    {screen.buttons.filter(b => b !== null).length}
                                </span>
                                <button style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2, flexShrink: 0 }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    onClick={e => { e.stopPropagation(); deleteScreen(screen.id); }}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}

                        {showNewScreen ? (
                            <div style={{ padding: 8, background: 'var(--bg-secondary, #09090b)', borderRadius: 8, marginTop: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <input aria-label="Screen name..." style={{ ...ip, fontSize: 12, marginBottom: 6, padding: '6px 10px' }} placeholder="Screen name..." value={newScreenName} onChange={e => setNewScreenName(e.target.value)} autoFocus /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    {COLORS.slice(0, 8).map(c => (
                                        <div key={c} onClick={() => setNewScreenColor(c)}
                                            style={{ width: 20, height: 20, borderRadius: 4, background: c, cursor: 'pointer', border: newScreenColor === c ? '2px solid #fff' : '2px solid transparent' }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <button style={{ ...bp, padding: '4px 10px', fontSize: 11 }} onClick={addScreen}>Add</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <button style={{ ...bo, padding: '4px 10px', fontSize: 11 }} onClick={() => setShowNewScreen(false)}>Cancel</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                </div>
                            </div>
                        ) : (
                            <button style={{ ...bo, width: '100%', fontSize: 12, padding: '8px 12px', marginTop: 8, justifyContent: 'center' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                                onClick={() => setShowNewScreen(true)}>
                                <Plus size={12} /> Add Screen
                            </button>
                        )}
                    </div>

                    {/* Menu Properties */}
                    <div style={{ ...cd, padding: 12, marginTop: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary, #a1a1aa)', marginBottom: 8, letterSpacing: 0.5 }}>Properties</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ fontSize: 12, marginBottom: 6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <span style={{ color: 'var(--text-secondary)' }}>Status:</span>{' '} /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <span style={{ color: selectedMenu?.isActive ? '#10B981' : '#EF4444' }}>{selectedMenu?.isActive ? 'Active' : 'Inactive'}</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div>
                        <div style={{ fontSize: 12, marginBottom: 6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <span style={{ color: 'var(--text-secondary)' }}>Screens:</span> {selectedMenu?.mainScreens.length} /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div>
                        <div style={{ fontSize: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <span style={{ color: 'var(--text-secondary)' }}>Total Items:</span> {selectedMenu?.mainScreens.reduce((a, s) => a + s.buttons.filter(b => b !== null).length, 0)} /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div>
                    </div>
                </div>

                {/* Right: Button Grid Editor */}
                <div style={{ flex: 1 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    {selectedScreen ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <div style={{ width: 16, height: 16, borderRadius: 4, background: selectedScreen.color }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{selectedScreen.name}</h2> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        ({selectedScreen.gridCols}×{selectedScreen.gridRows} grid — {selectedScreen.buttons.filter(b => b !== null).length} items)
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <button style={{ ...bo, padding: '8px 14px', fontSize: 12 }} onClick={() => addItemToGrid(selectedScreen.id)}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        <Plus size={14} /> Add Item
                                    </button>
                                    <button style={{ ...bp, padding: '8px 14px', fontSize: 12 }} onClick={() => toast.success('Screen saved')}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        <Save size={14} /> Save
                                    </button>
                                </div>
                            </div>

                            {/* Grid */}
                            <div style={{ ...cd, padding: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedScreen.gridCols}, 1fr)`, gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    {selectedScreen.buttons.map((button, idx) => (
                                        <div key={idx}
                                            onClick={() => {
                                                if (button) setEditingButton({ screenId: selectedScreen.id, index: idx, item: { ...button } });
                                            }}
                                            style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                                aspectRatio: '1.4', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', transition: 'all 0.15s ease', position: 'relative',
                                                background: button ? `${button.color}15` : 'var(--bg-secondary, #09090b)',
                                                border: button ? `2px solid ${button.color}40` : '2px dashed rgba(255,255,255,0.08)',
                                            }}>
                                            {button ? (
                                                <>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: button.color, textAlign: 'center', padding: '0 6px', lineHeight: 1.2 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                                        {button.name}
                                                    </span>
                                                    {button.type === 'item' && button.price > 0 && (
                                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>€{button.price.toFixed(2)}</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                                    )}
                                                    {button.type === 'sub-screen' && (
                                                        <span style={{ fontSize: 10, color: button.color, marginTop: 4, display: 'flex', alignItems: 'center', gap: 2 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                                            <ChevronRight size={10} /> Sub-screen
                                                        </span>
                                                    )}
                                                    <button style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: 4, padding: 2, cursor: 'pointer', opacity: 0.5 }}
                                                        onClick={e => { e.stopPropagation(); updateButton(selectedScreen.id, idx, null); }}>
                                                        <X size={10} />
                                                    </button>
                                                </>
                                            ) : (
                                                <Plus size={16} style={{ opacity: 0.2 }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Grid Size Controls */}
                            <div style={{ ...cd, padding: 14, display: 'flex', alignItems: 'center', gap: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Grid Size:</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <span style={{ fontSize: 12 }}>Cols</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    {[3, 4, 5, 6].map(n => (
                                        <button key={n} onClick={() => {
                                            setMenus(prev => prev.map(m => m.id === selectedMenuId ? {
                                                ...m, mainScreens: m.mainScreens.map(s => {
                                                    if (s.id !== selectedScreen.id) return s;
                                                    const total = n * s.gridRows;
                                                    const newButtons = [...s.buttons];
                                                    while (newButtons.length < total) newButtons.push(null);
                                                    return { ...s, gridCols: n, buttons: newButtons.slice(0, total) };
                                                }),
                                            } : m));
                                        }} style={{ ...bo, padding: '4px 10px', fontSize: 12, ...(selectedScreen.gridCols === n ? { background: 'rgba(59,130,246,0.1)', borderColor: '#3B82F6', color: '#3B82F6' } : {}) }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                            {n}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <span style={{ fontSize: 12 }}>Rows</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    {[2, 3, 4, 5, 6].map(n => (
                                        <button key={n} onClick={() => {
                                            setMenus(prev => prev.map(m => m.id === selectedMenuId ? {
                                                ...m, mainScreens: m.mainScreens.map(s => {
                                                    if (s.id !== selectedScreen.id) return s;
                                                    const total = s.gridCols * n;
                                                    const newButtons = [...s.buttons];
                                                    while (newButtons.length < total) newButtons.push(null);
                                                    return { ...s, gridRows: n, buttons: newButtons.slice(0, total) };
                                                }),
                                            } : m));
                                        }} style={{ ...bo, padding: '4px 10px', fontSize: 12, ...(selectedScreen.gridRows === n ? { background: 'rgba(59,130,246,0.1)', borderColor: '#3B82F6', color: '#3B82F6' } : {}) }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                            {n}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Color:</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    {COLORS.slice(0, 8).map(c => (
                                        <div key={c} onClick={() => {
                                            setMenus(prev => prev.map(m => m.id === selectedMenuId ? {
                                                ...m, mainScreens: m.mainScreens.map(s => s.id === selectedScreen.id ? { ...s, color: c } : s),
                                            } : m));
                                        }} style={{ width: 18, height: 18, borderRadius: 4, background: c, cursor: 'pointer', border: selectedScreen.color === c ? '2px solid #fff' : '2px solid transparent' }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-secondary, #a1a1aa)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <Grid3X3 size={48} style={{ marginBottom: 12, opacity: 0.3 }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <p style={{ fontSize: 16, fontWeight: 500 }}>Select a main screen</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <p style={{ fontSize: 13 }}>Choose a screen from the left panel to edit its button layout</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Button Modal */}
            {editingButton && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                    onClick={() => setEditingButton(null)}>
                    <div style={{ ...cd, width: 480, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Edit Button</h3> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditingButton(null)}><X size={18} /></button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div>

                        <div style={{ marginBottom: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <input style={ip} value={editingButton.item.name} onChange={e => setEditingButton(prev => prev ? { ...prev, item: { ...prev.item, name: e.target.value } } : null)} />
                        </div>

                        <div style={{ marginBottom: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Type</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ display: 'flex', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                {(['item', 'sub-screen', 'combo'] as const).map(t => (
                                    <button key={t} style={{ ...bo, padding: '6px 14px', fontSize: 12, ...(editingButton.item.type === t ? { background: 'rgba(59,130,246,0.1)', borderColor: '#3B82F6', color: '#3B82F6' } : {}) }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        onClick={() => setEditingButton(prev => prev ? { ...prev, item: { ...prev.item, type: t } } : null)}>
                                        {t === 'item' ? 'Item' : t === 'sub-screen' ? 'Sub-screen' : 'Combo'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {editingButton.item.type === 'item' && (
                            <div style={{ marginBottom: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Price (€)</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <input type="number" step="0.01" style={{ ...ip, width: 120 }} value={editingButton.item.price} onChange={e => setEditingButton(prev => prev ? { ...prev, item: { ...prev.item, price: parseFloat(e.target.value) || 0 } } : null)} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            </div>
                        )}

                        <div style={{ marginBottom: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Color</label> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                {COLORS.map(c => (
                                    <div key={c} onClick={() => setEditingButton(prev => prev ? { ...prev, item: { ...prev.item, color: c } } : null)}
                                        style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer', border: editingButton.item.color === c ? '3px solid #fff' : '3px solid transparent' }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={() => { /* keep-inline */ /* keep-inline */ /* keep-inline */
                                updateButton(editingButton.screenId, editingButton.index, editingButton.item);
                                setEditingButton(null);
                                toast.success('Button updated');
                            }}>
                                <Save size={14} /> Save
                            </button>
                            <button style={{ ...bo, color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => { /* keep-inline */ /* keep-inline */ /* keep-inline */
                                updateButton(editingButton.screenId, editingButton.index, null);
                                setEditingButton(null);
                                toast.success('Button removed');
                            }}>
                                <Trash2 size={14} /> Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuBuilder;
