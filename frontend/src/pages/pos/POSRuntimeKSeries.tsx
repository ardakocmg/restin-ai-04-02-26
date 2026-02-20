/**
 * K-Series POS Runtime
 * Lightspeed K-Series clone — Brand new 5th POS engine
 *
 * Layout: 3-column
 *  Left:   Order Panel (items + integrated keypad)
 *  Middle: Category Sidebar (vertical, uppercase)
 *  Right:  Menu Grid (2-col tiles with colored bars)
 *
 * Bottom: Action Buttons (Send/Split/Pay) + Navigation Bar
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, X, Plus, Pencil, Lock, AlertTriangle,
    LayoutGrid, ShoppingCart, Users, Receipt, Settings,
    UtensilsCrossed, Send, CreditCard, Trash2, RotateCcw,
    ChevronDown, Star
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { venueAPI, menuAPI, orderAPI } from '../../lib/api';
import { logger } from '../../lib/logger';
import './pos-kseries.css';

/* ─── Tile Color Array (cycles through for items) ────────────── */
const TILE_COLORS = ['green', 'orange', 'teal', 'blue', 'red', 'purple'];

function getTileColor(index: number): string {
    return TILE_COLORS[index % TILE_COLORS.length];
}

/* ─── Types ──────────────────────────────────────────────────── */
interface Category {
    id: string;
    name: string;
    items?: MenuItem[];
}

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category_id?: string;
}

interface OrderItem {
    id: string;
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    seat: string;
    course: number;
    notes?: string;
    sent?: boolean;
}

interface Order {
    id: string;
    items: OrderItem[];
    tableId?: string;
    tableName?: string;
    customerId?: string;
    customerName?: string;
    status: string;
}

/* ─── Bottom Nav Tabs ────────────────────────────────────────── */
const NAV_TABS = [
    { key: 'register', label: 'Register', icon: ShoppingCart },
    { key: 'tables', label: 'Tables', icon: LayoutGrid },
    { key: 'orders', label: 'Orders', icon: Receipt },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'receipts', label: 'Receipts', icon: Receipt },
    { key: 'settings', label: 'Settings', icon: Settings },
];

/* ═══════════════════════════════════════════════════════════════
   Main K-Series Component
   ═══════════════════════════════════════════════════════════════ */
export default function POSRuntimeKSeries() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // ─── Core State ──────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);

    // ─── Order State ─────────────────────────────────────────────
    const [order, setOrder] = useState<Order>({
        id: '',
        items: [],
        status: 'open',
    });
    const [orderMode, setOrderMode] = useState<'direct' | 'table'>('direct');
    const [viewMode, setViewMode] = useState<'seat' | 'course'>('course');
    const [activeCourse, setActiveCourse] = useState(1);
    const [activeSeat, setActiveSeat] = useState('Shared');
    const [seats, setSeats] = useState<string[]>(['Shared']);

    // ─── Keypad State ────────────────────────────────────────────
    const [keypadBuffer, setKeypadBuffer] = useState('');

    // ─── UI State ────────────────────────────────────────────────
    const [activeNav, setActiveNav] = useState('register');
    const [showActions, setShowActions] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    // ─── Venue Config ────────────────────────────────────────────
    const venueId = localStorage.getItem('restin_pos_venue');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // ─── Init ────────────────────────────────────────────────────
    useEffect(() => {
        if (!venueId) {
            navigate('/pos/setup');
            return;
        }
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [venueId]);

    // ─── Data Loading ────────────────────────────────────────────
    const loadData = async () => {
        try {
            setLoading(true);
            const [catRes, itemsRes] = await Promise.all([
                menuAPI.getCategories(venueId!),
                menuAPI.getItems(venueId!),
            ]);

            const cats: Category[] = catRes.data || [];
            const items: MenuItem[] = itemsRes.data || [];

            setCategories(cats);
            setAllMenuItems(items);

            if (cats.length > 0) {
                setActiveCategory(cats[0].id);
                setMenuItems(items.filter((i) => i.category_id === cats[0].id));
            }

            // Create initial order
            try {
                const orderRes = await orderAPI.create({
                    venue_id: venueId,
                    type: 'dine_in',
                    status: 'open',
                    items: [],
                });
                setOrder({
                    id: orderRes.data?.id || `local-${Date.now()}`,
                    items: [],
                    status: 'open',
                });
            } catch {
                setOrder({
                    id: `local-${Date.now()}`,
                    items: [],
                    status: 'open',
                });
            }
        } catch (err) {
            logger.error('[K-Series] Failed to load data', { error: err });
            toast.error('Failed to load POS data');
            // Set fallback empty state
            setCategories([]);
            setAllMenuItems([]);
        } finally {
            setLoading(false);
        }
    };

    // ─── Category Selection ──────────────────────────────────────
    const handleCategoryClick = useCallback(
        (catId: string) => {
            setActiveCategory(catId);
            setMenuItems(allMenuItems.filter((i) => i.category_id === catId));
        },
        [allMenuItems]
    );

    // ─── Add Item to Order ───────────────────────────────────────
    const handleItemClick = useCallback(
        (item: MenuItem) => {
            const qty = keypadBuffer ? parseInt(keypadBuffer, 10) || 1 : 1;
            setKeypadBuffer('');

            setOrder((prev) => {
                // Check if item already exists with same seat/course
                const existingIdx = prev.items.findIndex(
                    (oi) =>
                        oi.menuItemId === item.id &&
                        oi.seat === activeSeat &&
                        oi.course === activeCourse
                );

                if (existingIdx >= 0) {
                    const updated = [...prev.items];
                    updated[existingIdx] = {
                        ...updated[existingIdx],
                        quantity: updated[existingIdx].quantity + qty,
                    };
                    return { ...prev, items: updated };
                }

                const newItem: OrderItem = {
                    id: `oi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    menuItemId: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: qty,
                    seat: activeSeat,
                    course: activeCourse,
                };
                return { ...prev, items: [...prev.items, newItem] };
            });

            toast.success(`${qty}× ${item.name} added`);
        },
        [keypadBuffer, activeSeat, activeCourse]
    );

    // ─── Keypad Handlers ─────────────────────────────────────────
    const handleKeyPress = useCallback((key: string) => {
        switch (key) {
            case 'C':
                setKeypadBuffer('');
                break;
            case '⌫':
                setKeypadBuffer((prev) => prev.slice(0, -1));
                break;
            case '.':
                setKeypadBuffer((prev) => (prev.includes('.') ? prev : prev + '.'));
                break;
            case '×':
                setKeypadBuffer('');
                break;
            default:
                setKeypadBuffer((prev) => prev + key);
        }
    }, []);

    // ─── Order Calculations ──────────────────────────────────────
    const orderTotals = useMemo(() => {
        const subtotal = order.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );
        const taxRate = 0.09; // 9% — configurable later
        const tax = subtotal * taxRate;
        const total = subtotal + tax;
        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const unsentCount = order.items.filter((i) => !i.sent).reduce((sum, i) => sum + i.quantity, 0);
        return { subtotal, tax, taxRate, total, itemCount, unsentCount };
    }, [order.items]);

    // ─── Send to Kitchen ─────────────────────────────────────────
    const handleSend = useCallback(() => {
        if (orderTotals.unsentCount === 0) {
            toast.info('No unsent items');
            return;
        }
        setOrder((prev) => ({
            ...prev,
            items: prev.items.map((i) => ({ ...i, sent: true })),
        }));
        toast.success(`Sent ${orderTotals.unsentCount} items to kitchen`);
    }, [orderTotals.unsentCount]);

    // ─── Void Item ────────────────────────────────────────────────
    const handleVoidItem = useCallback((itemId: string) => {
        setOrder((prev) => ({
            ...prev,
            items: prev.items.filter((i) => i.id !== itemId),
        }));
        setSelectedItemId(null);
        toast.success('Item removed');
    }, []);

    // ─── Add Seat ─────────────────────────────────────────────────
    const handleAddSeat = useCallback(() => {
        const nextSeat = `Seat ${seats.length}`;
        setSeats((prev) => [...prev, nextSeat]);
        setActiveSeat(nextSeat);
    }, [seats.length]);

    // ─── Search ───────────────────────────────────────────────────
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return allMenuItems.filter((i) => i.name.toLowerCase().includes(q));
    }, [searchQuery, allMenuItems]);

    // ─── Format Currency ─────────────────────────────────────────
    const fmt = (amount: number): string => {
        return `€${amount.toFixed(2)}`;
    };

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════

    if (loading) {
        return (
            <div className="ks-root">
                <div className="ks-loading">
                    <div className="ks-loading-spinner" />
                    <span>Loading K-Series POS...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="ks-root">
            {/* ─── TOP BAR ──────────────────────────────────────────── */}
            <div className="ks-topbar">
                <div className="ks-topbar-left">
                    <button className="ks-btn-logout" onClick={() => navigate('/pos')}>
                        Log out
                    </button>
                </div>
                <div className="ks-topbar-center">
                    <div className="ks-manager-badge">
                        <span>{user?.name || 'Manager'}</span>
                        <Lock size={14} />
                    </div>
                    <div className="ks-alert-badge">
                        <AlertTriangle size={12} />
                        <span>{0}</span>
                    </div>
                </div>
                <div className="ks-topbar-right">
                    <button className="ks-topbar-icon" title="Customer Display">
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        className="ks-topbar-icon"
                        title="Search"
                        onClick={() => {
                            setShowSearch(true);
                            setTimeout(() => searchInputRef.current?.focus(), 100);
                        }}
                    >
                        <Search size={20} />
                    </button>
                </div>
            </div>

            {/* ─── MAIN 3-COLUMN LAYOUT ─────────────────────────────── */}
            <div className="ks-main">
                {/* ═══ LEFT: ORDER PANEL ═══ */}
                <div className="ks-order-panel">
                    {/* Order Header */}
                    <div className="ks-order-header">
                        <span className="ks-order-title">
                            {orderMode === 'direct' ? 'Direct sale' : order.tableName || 'Order 1'}
                        </span>
                        <button className="ks-order-actions-link" onClick={() => setShowActions(true)}>
                            Actions
                        </button>
                    </div>

                    {/* Order Meta Row */}
                    <div className="ks-order-meta">
                        <select
                            className="ks-meta-tag-select"
                            value={viewMode}
                            aria-label="Order view mode"
                            onChange={(e) => setViewMode(e.target.value as 'seat' | 'course')}
                        >
                            <option value="course">By course</option>
                            <option value="seat">By seat</option>
                        </select>
                        <span className="ks-meta-tag">
                            <UtensilsCrossed size={12} />
                            {order.items.length > 0 ? orderTotals.itemCount : 0}
                        </span>
                        <span className="ks-meta-tag">
                            {orderMode === 'direct' ? 'Direct' : 'Dine-in'}
                        </span>
                        <button className="ks-meta-tag" onClick={() => toast.info('Assign customer')}>
                            <Users size={12} />
                            {order.customerName || 'No customer'}
                        </button>
                    </div>

                    {/* Order Items */}
                    <div className="ks-order-items">
                        {order.items.length === 0 ? (
                            <div className="ks-menu-empty">
                                <ShoppingCart size={32} className="ks-menu-empty-icon" />
                                <span>No items yet</span>
                            </div>
                        ) : (
                            <>
                                {/* Group by course */}
                                {Array.from(new Set(order.items.map((i) => i.course)))
                                    .sort()
                                    .map((courseNum) => (
                                        <div key={courseNum}>
                                            <div className="ks-course-header">
                                                <span>Course {courseNum}</span>
                                                <button title="Edit course" onClick={() => setActiveCourse(courseNum)}>
                                                    <Pencil size={12} />
                                                </button>
                                            </div>
                                            {order.items
                                                .filter((i) => i.course === courseNum)
                                                .map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className={`ks-order-item ${selectedItemId === item.id ? 'selected' : ''}`}
                                                        onClick={() =>
                                                            setSelectedItemId(selectedItemId === item.id ? null : item.id)
                                                        }
                                                    >
                                                        <span className="ks-order-item-qty">{item.quantity}</span>
                                                        <span className="ks-order-item-name">
                                                            {item.name}
                                                            <Pencil size={12} className="ks-order-item-edit-icon" />
                                                        </span>
                                                        <span className="ks-order-item-meta">{item.seat}</span>
                                                        <span className="ks-order-item-price">{fmt(item.price * item.quantity)}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    ))}
                                {/* Add a course link */}
                                <button
                                    className="ks-add-link"
                                    onClick={() => setActiveCourse((prev) => prev + 1)}
                                >
                                    <Plus size={14} /> Add a course
                                </button>
                            </>
                        )}
                    </div>

                    {/* Order Totals */}
                    <div className="ks-order-totals">
                        <div className="ks-total-row">
                            <span>Subtotal</span>
                            <span>{fmt(orderTotals.subtotal)}</span>
                        </div>
                        <div className="ks-total-row">
                            <span>{(orderTotals.taxRate * 100).toFixed(0)}% Sales Tax (on {fmt(orderTotals.subtotal)})</span>
                            <span>{fmt(orderTotals.tax)}</span>
                        </div>
                        <div className="ks-total-row main">
                            <span>Total</span>
                            <span>{fmt(orderTotals.total)}</span>
                        </div>
                    </div>

                    {/* Keypad Hint */}
                    <div className="ks-keypad-hint">
                        {keypadBuffer
                            ? `Quantity: ${keypadBuffer}`
                            : 'Use keypad to apply quantity, table or payment'}
                    </div>

                    {/* Keypad */}
                    <div className="ks-keypad">
                        <button className="ks-key clear" onClick={() => handleKeyPress('C')}>C</button>
                        <button className="ks-key" onClick={() => handleKeyPress('.')}>.</button>
                        <button className="ks-key" onClick={() => handleKeyPress('⌫')}>⌫</button>
                        <button className="ks-key action-red" onClick={() => {
                            if (selectedItemId) handleVoidItem(selectedItemId);
                            else toast.info('Select an item to edit');
                        }}>Edit order</button>

                        <button className="ks-key" onClick={() => handleKeyPress('7')}>7</button>
                        <button className="ks-key" onClick={() => handleKeyPress('8')}>8</button>
                        <button className="ks-key" onClick={() => handleKeyPress('9')}>9</button>
                        <button className="ks-key action-blue" onClick={() => toast.info('Tab name')}>Tab name</button>

                        <button className="ks-key" onClick={() => handleKeyPress('4')}>4</button>
                        <button className="ks-key" onClick={() => handleKeyPress('5')}>5</button>
                        <button className="ks-key" onClick={() => handleKeyPress('6')}>6</button>
                        <button className="ks-key action-blue" onClick={() => toast.info('Tables view')}>Tables</button>

                        <button className="ks-key" onClick={() => handleKeyPress('1')}>1</button>
                        <button className="ks-key" onClick={() => handleKeyPress('2')}>2</button>
                        <button className="ks-key" onClick={() => handleKeyPress('3')}>3</button>
                        <button className="ks-key action-green" onClick={() => toast.info('Cash payment')}>Cash</button>

                        <button className="ks-key" onClick={() => handleKeyPress('00')}>00</button>
                        <button className="ks-key" onClick={() => handleKeyPress('0')}>0</button>
                        <button className="ks-key" onClick={() => handleKeyPress('×')}>×</button>
                        <button className="ks-key action-teal" onClick={() => toast.info('Credit card')}>Credit card</button>
                    </div>
                </div>

                {/* ═══ MIDDLE: CATEGORY SIDEBAR ═══ */}
                <div className="ks-category-sidebar">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            className={`ks-category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                            onClick={() => handleCategoryClick(cat.id)}
                        >
                            {cat.name}
                        </button>
                    ))}
                    <button
                        className={`ks-category-btn ${activeCategory === 'best-sellers' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveCategory('best-sellers');
                            // Show all items as "best sellers"
                            setMenuItems(allMenuItems.slice(0, 10));
                        }}
                    >
                        Best-sellers <Star size={10} />
                    </button>
                </div>

                {/* ═══ RIGHT: MENU GRID AREA ═══ */}
                <div className="ks-menu-area">
                    {/* Seat/Course Selector Header */}
                    <div className="ks-menu-header">
                        <span className="ks-seat-label">
                            {viewMode === 'seat' ? 'Select a seat' : 'Select a course'}
                        </span>
                        {viewMode === 'seat' ? (
                            <>
                                <button
                                    className={`ks-seat-btn ${activeSeat === 'Table' ? 'active' : ''}`}
                                    onClick={() => setActiveSeat('Shared')}
                                >
                                    Table
                                </button>
                                {seats
                                    .filter((s) => s !== 'Shared')
                                    .map((seat, idx) => (
                                        <button
                                            key={seat}
                                            className={`ks-seat-btn ${activeSeat === seat ? 'active' : ''}`}
                                            onClick={() => setActiveSeat(seat)}
                                        >
                                            {idx + 1}
                                        </button>
                                    ))}
                                <button className="ks-seat-add" onClick={handleAddSeat}>
                                    +
                                </button>
                            </>
                        ) : (
                            <>
                                {[1, 2, 3].map((c) => (
                                    <button
                                        key={c}
                                        className={`ks-seat-btn ${activeCourse === c ? 'active' : ''}`}
                                        onClick={() => setActiveCourse(c)}
                                    >
                                        {c}
                                    </button>
                                ))}
                                <button
                                    className="ks-seat-add"
                                    onClick={() => setActiveCourse((prev) => prev + 1)}
                                >
                                    +
                                </button>
                            </>
                        )}
                    </div>

                    {/* Active Category Title */}
                    <div className="ks-menu-category-title">
                        {categories.find((c) => c.id === activeCategory)?.name ||
                            (activeCategory === 'best-sellers' ? 'Best-sellers' : 'Menu')}
                    </div>

                    {/* Menu Item Grid */}
                    <div className="ks-menu-grid">
                        {menuItems.length === 0 ? (
                            <div className="ks-menu-empty">
                                <UtensilsCrossed size={32} className="ks-menu-empty-icon" />
                                <span>No items in this category</span>
                            </div>
                        ) : (
                            menuItems.map((item, idx) => (
                                <button
                                    key={item.id}
                                    className="ks-item-tile"
                                    onClick={() => handleItemClick(item)}
                                >
                                    <span className="ks-item-tile-name">{item.name}</span>
                                    <div className={`ks-item-tile-bar ${getTileColor(idx)}`} />
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ─── BOTTOM ACTION BUTTONS ────────────────────────────── */}
            <div className="ks-bottom-actions">
                <button
                    className="ks-action-btn send"
                    disabled={orderTotals.unsentCount === 0}
                    onClick={handleSend}
                >
                    Send - {orderTotals.unsentCount} items
                </button>
                <button
                    className="ks-action-btn split"
                    disabled={order.items.length === 0}
                    onClick={() => toast.info('Split check')}
                >
                    Split check
                </button>
                <button
                    className="ks-action-btn pay"
                    disabled={order.items.length === 0}
                    onClick={() => toast.info('Pay')}
                >
                    Pay - {fmt(orderTotals.total)}
                </button>
            </div>

            {/* ─── BOTTOM NAVIGATION BAR ────────────────────────────── */}
            <div className="ks-bottom-nav">
                {NAV_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        className={`ks-nav-item ${activeNav === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveNav(tab.key)}
                    >
                        <tab.icon size={20} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ─── ACTIONS MODAL ────────────────────────────────────── */}
            {showActions && (
                <div className="ks-modal-overlay" onClick={() => setShowActions(false)}>
                    <div className="ks-actions-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="ks-actions-panel-header">
                            <button onClick={() => setShowActions(false)}>Close</button>
                            <span>{order.tableName || 'Order 1'}</span>
                        </div>

                        <div className="ks-actions-section">
                            <div className="ks-actions-section-title">Tap to rename order</div>
                            <input
                                className="ks-actions-input"
                                defaultValue={order.tableName || 'Order 1'}
                                placeholder="Order name"
                            />
                        </div>

                        <div className="ks-actions-section">
                            <div className="ks-actions-section-title">Actions</div>
                            <button
                                className="ks-actions-btn destructive"
                                onClick={() => {
                                    setOrder((prev) => ({
                                        ...prev,
                                        items: prev.items.filter((i) => i.sent),
                                    }));
                                    setShowActions(false);
                                    toast.success('Unsent items cleared');
                                }}
                            >
                                <Trash2 size={16} /> Clear unsent items
                            </button>
                            <button
                                className="ks-actions-btn destructive"
                                onClick={() => {
                                    setOrder((prev) => ({ ...prev, items: [] }));
                                    setShowActions(false);
                                    toast.success('All items refunded');
                                }}
                            >
                                <RotateCcw size={16} /> Refund all items
                            </button>
                        </div>

                        <div className="ks-actions-section">
                            <div className="ks-actions-section-title">Apply discount</div>
                            {['First Responder', 'Student Discount', 'Comp', 'Early Bird Breakfast'].map(
                                (disc) => (
                                    <div key={disc} className="ks-discount-item" onClick={() => {
                                        toast.success(`${disc} applied`);
                                        setShowActions(false);
                                    }}>
                                        <div className="ks-discount-radio" />
                                        <span className="ks-discount-name">{disc}</span>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── SEARCH OVERLAY ───────────────────────────────────── */}
            {showSearch && (
                <div className="ks-search-overlay">
                    <div className="ks-search-header">
                        <input
                            ref={searchInputRef}
                            className="ks-search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search menu items..."
                            autoFocus
                        />
                        <button
                            className="ks-search-close"
                            title="Close search"
                            onClick={() => {
                                setShowSearch(false);
                                setSearchQuery('');
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="ks-search-results">
                        {searchResults.length === 0 && searchQuery ? (
                            <div className="ks-menu-empty">
                                <span>No results for &quot;{searchQuery}&quot;</span>
                            </div>
                        ) : (
                            <div className="ks-menu-grid">
                                {searchResults.map((item, idx) => (
                                    <button
                                        key={item.id}
                                        className="ks-item-tile"
                                        onClick={() => {
                                            handleItemClick(item);
                                            setShowSearch(false);
                                            setSearchQuery('');
                                        }}
                                    >
                                        <span className="ks-item-tile-name">{item.name}</span>
                                        <div className={`ks-item-tile-bar ${getTileColor(idx)}`} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
