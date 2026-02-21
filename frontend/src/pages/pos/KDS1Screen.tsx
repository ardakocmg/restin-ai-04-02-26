/**
 * KDS1Screen.tsx — Kitchen Display System 1.0 (Legacy)
 * Pixel-perfect Lightspeed K-Series clone
 *
 * Two Modes:
 * 1. Receipt Mode — Each order appears as a tile with all items
 * 2. Production Mode — Each item appears as a tile with total quantities
 *
 * Features:
 * - Color progression: Green (0 min) → Yellow → Orange → Red (50+ min)
 * - Tap actions: Ready for delivery/pickup or Remove from screen
 * - Clear all / Reload
 * - KDS Statistics report
 * - Last completed items bar
 */

import {
BarChart3,Clock,
Maximize2,Minimize2,RotateCcw,
ShoppingBag,
Trash2,
Truck,
Users,
UtensilsCrossed,
X
} from 'lucide-react';
import React,{ useCallback,useMemo,useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './kds1.css';

/* ===== Types ===== */

type KDS1Mode = 'receipt' | 'production';
type OrderType = 'dine-in' | 'delivery' | 'pickup';

interface KDS1Instruction {
    id: string;
    text: string;
}

interface KDS1Item {
    id: string;
    name: string;
    quantity: number;
    instructions: KDS1Instruction[];
    course: number;
}

interface KDS1Order {
    id: string;
    orderCode: string;
    server: string;
    orderType: OrderType;
    tableNumber?: string;
    floor?: string;
    covers: number;
    items: KDS1Item[];
    courses: number[];
    placedAt: Date;
    isReady: boolean;
    customerName?: string;
    deliveryAddress?: string;
}

interface CompletedItem {
    name: string;
    quantity: number;
    completedAt: Date;
}

/* ===== Demo Data ===== */

const DEMO_ORDERS: KDS1Order[] = [
    {
        id: 'o1', orderCode: '#2001', server: 'Maria S.', orderType: 'dine-in',
        tableNumber: 'T3', floor: 'Main Floor', covers: 4,
        placedAt: new Date(Date.now() - 2 * 60000), isReady: false,
        courses: [1],
        items: [
            { id: 'x1', name: 'Caesar Salad', quantity: 2, course: 1, instructions: [{ id: 'xi1', text: 'No croutons' }] },
            { id: 'x2', name: 'Bruschetta', quantity: 1, course: 1, instructions: [] },
            { id: 'x3', name: 'Soup of the Day', quantity: 1, course: 1, instructions: [] },
        ]
    },
    {
        id: 'o2', orderCode: '#2002', server: 'James K.', orderType: 'dine-in',
        tableNumber: 'T7', floor: 'Terrace', covers: 2,
        placedAt: new Date(Date.now() - 8 * 60000), isReady: false,
        courses: [1, 2],
        items: [
            { id: 'x4', name: 'Grilled Salmon', quantity: 1, course: 1, instructions: [{ id: 'xi2', text: 'Medium rare' }] },
            { id: 'x5', name: 'Ribeye Steak', quantity: 1, course: 1, instructions: [{ id: 'xi3', text: 'Well done' }, { id: 'xi4', text: 'Extra mushrooms' }] },
            { id: 'x6', name: 'Tiramisu', quantity: 2, course: 2, instructions: [] },
        ]
    },
    {
        id: 'o3', orderCode: '#2003', server: 'Sofia L.', orderType: 'delivery',
        covers: 1, customerName: 'John D.', deliveryAddress: '23 High Street',
        placedAt: new Date(Date.now() - 15 * 60000), isReady: false,
        courses: [1],
        items: [
            { id: 'x7', name: 'Margherita Pizza', quantity: 2, course: 1, instructions: [] },
            { id: 'x8', name: 'Garlic Bread', quantity: 1, course: 1, instructions: [] },
            { id: 'x9', name: 'Coca Cola', quantity: 2, course: 1, instructions: [] },
        ]
    },
    {
        id: 'o4', orderCode: '#2004', server: 'Alex M.', orderType: 'pickup',
        covers: 1, customerName: 'Sarah W.',
        placedAt: new Date(Date.now() - 25 * 60000), isReady: false,
        courses: [1],
        items: [
            { id: 'x10', name: 'Fish & Chips', quantity: 1, course: 1, instructions: [] },
            { id: 'x11', name: 'Coleslaw', quantity: 1, course: 1, instructions: [] },
        ]
    },
    {
        id: 'o5', orderCode: '#2005', server: 'Maria S.', orderType: 'dine-in',
        tableNumber: 'T12', floor: 'Main Floor', covers: 6,
        placedAt: new Date(Date.now() - 45 * 60000), isReady: false,
        courses: [1, 2, 3],
        items: [
            { id: 'x12', name: 'Mixed Grill Platter', quantity: 2, course: 1, instructions: [{ id: 'xi5', text: 'Gluten allergy' }] },
            { id: 'x13', name: 'Grilled Vegetables', quantity: 1, course: 1, instructions: [] },
            { id: 'x14', name: 'Lamb Rack', quantity: 2, course: 2, instructions: [{ id: 'xi6', text: 'Medium' }] },
            { id: 'x15', name: 'Cheesecake', quantity: 3, course: 3, instructions: [] },
            { id: 'x16', name: 'Pasta Carbonara', quantity: 1, course: 1, instructions: [{ id: 'xi7', text: 'Extra parmesan' }] },
        ]
    },
    {
        id: 'o6', orderCode: '#2006', server: 'James K.', orderType: 'dine-in',
        tableNumber: 'T1', floor: 'Main Floor', covers: 2,
        placedAt: new Date(Date.now() - 55 * 60000), isReady: false,
        courses: [1],
        items: [
            { id: 'x17', name: 'Penne Arrabbiata', quantity: 1, course: 1, instructions: [{ id: 'xi8', text: 'No chili flakes' }] },
            { id: 'x18', name: 'Caesar Salad', quantity: 1, course: 1, instructions: [] },
        ]
    },
];

/* ===== Helpers ===== */

const getMinutesAgo = (date: Date): number => {
    return Math.floor((Date.now() - date.getTime()) / 60000);
};

const getTimerColor = (minutes: number): string => {
    if (minutes < 5) return 'var(--kds1-time-green)';
    if (minutes < 15) return 'var(--kds1-time-yellow)';
    if (minutes < 30) return 'var(--kds1-time-orange)';
    return 'var(--kds1-time-red)';
};

const getTimerText = (minutes: number): string => {
    if (minutes < 1) return '< 1m';
    if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${minutes}m`;
};

const _getOrderTypeIcon = (type: OrderType) => {
    switch (type) {
        case 'dine-in': return <UtensilsCrossed size={12} />;
        case 'delivery': return <Truck size={12} />;
        case 'pickup': return <ShoppingBag size={12} />;
    }
};

const getOrderTypeBadge = (type: OrderType) => {
    const labels: Record<OrderType, string> = { 'dine-in': 'Dine-In', 'delivery': 'Delivery', 'pickup': 'Pickup' };
    return <span className={`kds1-receipt-type-badge ${type}`}>{labels[type]}</span>;
};

/* ===== Main Component ===== */

const KDS1Screen: React.FC = () => {
    const { user: _user } = useAuth();

    // State
    const [mode, setMode] = useState<KDS1Mode>('receipt');
    const [orders, setOrders] = useState<KDS1Order[]>(DEMO_ORDERS);
    const [completedItems, setCompletedItems] = useState<CompletedItem[]>([
        { name: 'Spaghetti Bolognese', quantity: 2, completedAt: new Date(Date.now() - 1 * 60000) },
        { name: 'Greek Salad', quantity: 1, completedAt: new Date(Date.now() - 3 * 60000) },
    ]);
    const [selectedOrder, setSelectedOrder] = useState<KDS1Order | null>(null);
    const [selectedProductionItem, setSelectedProductionItem] = useState<{ name: string; totalQty: number } | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [, setTick] = useState(0);

    // Force re-render every 30 seconds for timer updates
    React.useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(interval);
    }, []);

    // Active (not ready) orders
    const activeOrders = useMemo(() => orders.filter(o => !o.isReady), [orders]);

    // Production mode data — group unique items
    const productionItems = useMemo(() => {
        const itemMap = new Map<string, {
            name: string;
            totalQty: number;
            orders: { orderCode: string; qty: number; placedAt: Date; instructions: string[] }[];
            instructions: string[];
            firstPlacedAt: Date;
            lastPlacedAt: Date;
        }>();

        activeOrders.forEach(order => {
            order.items.forEach(item => {
                const existing = itemMap.get(item.name);
                const instTexts = item.instructions.map(i => i.text);
                if (existing) {
                    existing.totalQty += item.quantity;
                    existing.orders.push({ orderCode: order.orderCode, qty: item.quantity, placedAt: order.placedAt, instructions: instTexts });
                    if (instTexts.length > 0) existing.instructions.push(...instTexts);
                    if (order.placedAt < existing.firstPlacedAt) existing.firstPlacedAt = order.placedAt;
                    if (order.placedAt > existing.lastPlacedAt) existing.lastPlacedAt = order.placedAt;
                } else {
                    itemMap.set(item.name, {
                        name: item.name,
                        totalQty: item.quantity,
                        orders: [{ orderCode: order.orderCode, qty: item.quantity, placedAt: order.placedAt, instructions: instTexts }],
                        instructions: [...instTexts],
                        firstPlacedAt: order.placedAt,
                        lastPlacedAt: order.placedAt,
                    });
                }
            });
        });

        return Array.from(itemMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [activeOrders]);

    // Group production items by first letter into 4 columns
    const productionColumns = useMemo(() => {
        const sorted = [...productionItems];
        const colSize = Math.ceil(sorted.length / 4);
        return [
            sorted.slice(0, colSize),
            sorted.slice(colSize, colSize * 2),
            sorted.slice(colSize * 2, colSize * 3),
            sorted.slice(colSize * 3),
        ];
    }, [productionItems]);

    // ===== Actions =====

    const markReady = useCallback((orderId: string) => {
        setOrders(prev => prev.map(o => {
            if (o.id !== orderId) return o;
            // Add items to completed
            o.items.forEach(item => {
                setCompletedItems(c => [{ name: item.name, quantity: item.quantity, completedAt: new Date() }, ...c.slice(0, 9)]);
            });
            return { ...o, isReady: true };
        }));
        setSelectedOrder(null);
    }, []);

    const removeOrder = useCallback((orderId: string) => {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        setSelectedOrder(null);
    }, []);

    const acknowledgeProductionItem = useCallback((itemName: string, qty: number) => {
        // Remove items from orders
        setOrders(prev => {
            const newOrders = prev.map(o => ({
                ...o,
                items: o.items.filter(i => i.name !== itemName),
            })).filter(o => o.items.length > 0);
            return newOrders;
        });
        setCompletedItems(c => [{ name: itemName, quantity: qty, completedAt: new Date() }, ...c.slice(0, 9)]);
        setSelectedProductionItem(null);
    }, []);

    const clearAll = useCallback(() => {
        const allItems: CompletedItem[] = [];
        orders.forEach(o => o.items.forEach(i => allItems.push({ name: i.name, quantity: i.quantity, completedAt: new Date() })));
        setCompletedItems(c => [...allItems, ...c].slice(0, 20));
        setOrders([]);
    }, [orders]);

    const reloadOrders = useCallback(() => {
        setOrders(DEMO_ORDERS);
        setCompletedItems([]);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {/* ignore */ });
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {/* ignore */ });
        }
    }, []);

    /* ===== Render ===== */

    return (
        <div className="kds1-container">
            {/* Header */}
            <div className="kds1-header">
                <div className="kds1-header-left">
                    <span className="kds1-station-name">Kitchen</span>
                    <span className={`kds1-mode-badge ${mode}`}>
                        {mode === 'receipt' ? 'Receipt Mode' : 'Production Mode'}
                    </span>
                </div>
                <div className="kds1-header-right">
                    <button className="kds1-header-btn" onClick={() => setMode(m => m === 'receipt' ? 'production' : 'receipt')}>
                        {mode === 'receipt' ? 'Production' : 'Receipt'}
                    </button>
                    <button className="kds1-header-btn" onClick={() => setShowReport(true)}>
                        <BarChart3 size={14} /> Report
                    </button>
                    <button className="kds1-header-btn" onClick={reloadOrders}>
                        <RotateCcw size={14} /> Reload
                    </button>
                    <button className="kds1-header-btn danger" onClick={clearAll}>
                        <Trash2 size={14} /> Clear All
                    </button>
                    <button className="kds1-header-btn" onClick={toggleFullscreen}>
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                </div>
            </div>

            {/* ===== Receipt Mode ===== */}
            {mode === 'receipt' && (
                <div className="kds1-receipt-grid">
                    {activeOrders.map(order => {
                        const mins = getMinutesAgo(order.placedAt);
                        const timerColor = getTimerColor(mins);

                        return (
                            <div
                                key={order.id}
                                className={`kds1-receipt-tile ${order.isReady ? 'ready' : ''}`}
                                onClick={() => !order.isReady && setSelectedOrder(order)}
                                style={{ borderLeft: `4px solid ${timerColor}`  /* keep-inline */ }}
                            >
                                <div className="kds1-receipt-tile-header">
                                    <div className="kds1-receipt-tile-header-left">
                                        <span className="kds1-receipt-order-code">{order.orderCode}</span>
                                        {order.tableNumber && <span className="kds1-receipt-table">{order.tableNumber}</span>}
                                        {getOrderTypeBadge(order.orderType)}
                                    </div>
                                    <span className="kds1-receipt-timer" style={{ color: timerColor, background: `${timerColor}15`  /* keep-inline */ }}>
                                        <Clock size={12} style={{ marginRight: 4, display: 'inline'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                                        {getTimerText(mins)}
                                    </span>
                                </div>

                                <div className="kds1-receipt-tile-body">
                                    {order.items.map(item => (
                                        <React.Fragment key={item.id}>
                                            <div className="kds1-receipt-item-row">
                                                <span className="kds1-receipt-item-qty">{item.quantity}×</span>
                                                <span className="kds1-receipt-item-name">{item.name}</span>
                                            </div>
                                            {item.instructions.map(inst => (
                                                <div key={inst.id} className="kds1-receipt-item-instruction">↳ {inst.text}</div>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </div>

                                <div className="kds1-receipt-tile-footer">
                                    <div className="server">
                                        <Users size={12} /> {order.server}
                                    </div>
                                    {order.courses.length > 1 && (
                                        <div className="course-info">
                                            {order.courses.map(c => (
                                                <span key={c} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: 3  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                                    C{c}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {order.customerName && <span style={{ fontSize: 11  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>👤 {order.customerName}</span>}
                                </div>
                            </div>
                        );
                    })}

                    {activeOrders.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: 'var(--kds1-text-secondary)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                            <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 12  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>🍳</div>
                            <div style={{ fontSize: 16, fontWeight: 500  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{"No "}active orders</div>
                        </div>
                    )}
                </div>
            )}

            {/* ===== Production Mode ===== */}
            {mode === 'production' && (
                <div className="kds1-production-grid">
                    {productionColumns.map((column, colIdx) => (
                        <React.Fragment key={colIdx}>
                            {column.map(item => {
                                const mins = getMinutesAgo(item.firstPlacedAt);
                                const timerColor = getTimerColor(mins);

                                return (
                                    <div
                                        key={item.name}
                                        className="kds1-production-tile"
                                        onClick={() => setSelectedProductionItem({ name: item.name, totalQty: item.totalQty })}
                                        style={{ borderLeft: `4px solid ${timerColor}`  /* keep-inline */ }}
                                    >
                                        <div className="kds1-production-item-name">{item.name}</div>
                                        {item.instructions.length > 0 && (
                                            <div className="kds1-production-instructions">
                                                {Array.from(new Set(item.instructions)).join(', ')}
                                            </div>
                                        )}
                                        <div className="kds1-production-total-qty" style={{ color: timerColor  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                            {item.totalQty}
                                        </div>
                                        <div className="kds1-production-breakdowns">
                                            {item.orders.map((o, i) => (
                                                <span key={i} className="kds1-production-breakdown-chip">
                                                    {o.orderCode}: {o.qty}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="kds1-production-times">
                                            <span>First: {getTimerText(getMinutesAgo(item.firstPlacedAt))}</span>
                                            <span>Last: {getTimerText(getMinutesAgo(item.lastPlacedAt))}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}

                    {productionItems.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: 'var(--kds1-text-secondary)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                            <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 12  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>🍳</div>
                            <div style={{ fontSize: 16, fontWeight: 500  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{"No "}items waiting</div>
                        </div>
                    )}
                </div>
            )}

            {/* ===== Completed Bar ===== */}
            {completedItems.length > 0 && (
                <div className="kds1-completed-bar">
                    <span className="kds1-completed-label">✓ Last completed:</span>
                    {completedItems.slice(0, 6).map((ci, idx) => (
                        <span key={idx} className="kds1-completed-item">
                            {ci.quantity}× {ci.name}
                        </span>
                    ))}
                </div>
            )}

            {/* ===== Receipt Mode Tap Overlay ===== */}
            {selectedOrder && (
                <div className="kds1-tap-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="kds1-tap-panel" onClick={e => e.stopPropagation()}>
                        <div className="kds1-tap-title">{selectedOrder.orderCode} — {selectedOrder.tableNumber || selectedOrder.customerName}</div>

                        {(selectedOrder.orderType === 'delivery' || selectedOrder.orderType === 'pickup') && (
                            <button className="kds1-tap-button primary" onClick={() => markReady(selectedOrder.id)}>
                                ✓ Ready for {selectedOrder.orderType === 'delivery' ? 'Delivery' : 'Pickup'}
                            </button>
                        )}

                        {selectedOrder.orderType === 'dine-in' && (
                            <button className="kds1-tap-button primary" onClick={() => markReady(selectedOrder.id)}>
                                ✓ Mark as Ready
                            </button>
                        )}

                        <button className="kds1-tap-button" onClick={() => removeOrder(selectedOrder.id)}>
                            Remove from screen
                        </button>

                        <button className="kds1-tap-button cancel" onClick={() => setSelectedOrder(null)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* ===== Production Mode Tap Overlay ===== */}
            {selectedProductionItem && (
                <div className="kds1-tap-overlay" onClick={() => setSelectedProductionItem(null)}>
                    <div className="kds1-tap-panel" onClick={e => e.stopPropagation()}>
                        <div className="kds1-tap-title">{selectedProductionItem.name}</div>
                        <div style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, margin: '16px 0', color: 'var(--kds1-time-green)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                            {selectedProductionItem.totalQty}
                        </div>
                        <button className="kds1-tap-button primary" onClick={() => acknowledgeProductionItem(selectedProductionItem.name, selectedProductionItem.totalQty)}>
                            ✓ Acknowledge all ({selectedProductionItem.totalQty})
                        </button>
                        <button className="kds1-tap-button cancel" onClick={() => setSelectedProductionItem(null)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* ===== KDS Report Modal ===== */}
            {showReport && (
                <div className="kds1-report-modal" onClick={() => setShowReport(false)}>
                    <div className="kds1-report-panel" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>KDS Statistics Report</h2>
                            <button className="kds1-header-btn" onClick={() => setShowReport(false)}>
                                <X size={16} />
                            </button>
                        </div>
                        <table className="kds1-report-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Produced</th>
                                    <th>Avg Time</th>
                                    <th>Fastest</th>
                                    <th>Slowest</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>Caesar Salad</td><td>14</td><td>4.5 min</td><td>2 min</td><td>8 min</td></tr>
                                <tr><td>Grilled Salmon</td><td>8</td><td>9 min</td><td>6 min</td><td>15 min</td></tr>
                                <tr><td>Ribeye Steak</td><td>12</td><td>12 min</td><td>8 min</td><td>18 min</td></tr>
                                <tr><td>Margherita Pizza</td><td>22</td><td>7 min</td><td>5 min</td><td>12 min</td></tr>
                                <tr><td>Pasta Carbonara</td><td>16</td><td>6 min</td><td>4 min</td><td>10 min</td></tr>
                                <tr><td>Fish & Chips</td><td>10</td><td>9 min</td><td>6 min</td><td>14 min</td></tr>
                                <tr><td>Mixed Grill Platter</td><td>6</td><td>15 min</td><td>10 min</td><td>22 min</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KDS1Screen;
