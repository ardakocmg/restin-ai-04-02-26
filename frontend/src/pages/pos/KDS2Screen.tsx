/**
 * KDS2Screen.tsx — Kitchen Display System 2.0
 * Pixel-perfect Lightspeed K-Series clone
 *
 * Features:
 * - Ticket-based kitchen display
 * - 5 order statuses: New → Preparing → Ready → On Hold / Canceled
 * - Status filters + Order type filters
 * - Production instructions (Warning/Addition/Removal/Comment)
 * - Courses (separate/combined chits)
 * - Items List view
 * - Settings sidebar (10 sections)
 * - Wait time alerts (delayed/late)
 * - Undo system (5-second window)
 * - Light + Dark theme
 * - Bell sound alerts
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Settings, Maximize2, Minimize2, ChevronDown, ChevronUp,
    Play, Bell, Check, X, RotateCcw, List, LayoutGrid,
    AlertTriangle, Plus, MinusCircle, MessageSquare,
    Clock, Users, Truck, ShoppingBag, UtensilsCrossed,
    Wifi, WifiOff, Volume2, BarChart3, Printer
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import './kds2.css';

/* ===== Types ===== */

type OrderStatus = 'new' | 'preparing' | 'ready' | 'hold' | 'canceled' | 'completed';
type OrderType = 'dine-in' | 'delivery' | 'pickup';
type InstructionType = 'warning' | 'addition' | 'removal' | 'comment';
type KDSView = 'tickets' | 'items-list';
type TicketLayout = 'direct-line' | 'equal';
type ColorTheme = 'light' | 'dark';
type TimeFormat = '24h' | 'ampm';
type CoursingMode = 'separate' | 'combined';

interface ProductionInstruction {
    id: string;
    type: InstructionType;
    text: string;
}

interface KDSItem {
    id: string;
    name: string;
    quantity: number;
    status: 'pending' | 'preparing' | 'ready' | 'completed';
    instructions: ProductionInstruction[];
    course: number;
    seat?: number;
}

interface KDSTicket {
    id: string;
    collectionCode: string;
    server: string;
    orderType: OrderType;
    covers: number;
    status: OrderStatus;
    items: KDSItem[];
    courses: number[];
    tableNumber?: string;
    floor?: string;
    customerName?: string;
    orderSource?: string;
    pickupTime?: string;
    placedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    isUpdated: boolean;
}

interface KDSSettings {
    colorTheme: ColorTheme;
    layout: TicketLayout;
    summaryView: 'full' | 'condensed';
    showStation: boolean;
    showStatusFilter: boolean;
    showTypeFilter: boolean;
    language: string;
    timeFormat: TimeFormat;
    enableTimer: boolean;
    delayedAfter: number;
    lateAfter: number;
    coursing: CoursingMode;
    enablePrinting: boolean;
    ticketSummary: {
        customer: boolean;
        orderId: boolean;
        covers: boolean;
        server: boolean;
        type: boolean;
        floor: boolean;
        orderSource: boolean;
        pickupTime: boolean;
    };
    statusNew: boolean;
    statusReady: boolean;
}

/* ===== Default Settings ===== */

const DEFAULT_SETTINGS: KDSSettings = {
    colorTheme: 'dark',
    layout: 'direct-line',
    summaryView: 'full',
    showStation: true,
    showStatusFilter: true,
    showTypeFilter: true,
    language: 'English',
    timeFormat: '24h',
    enableTimer: true,
    delayedAfter: 10,
    lateAfter: 20,
    coursing: 'separate',
    enablePrinting: false,
    ticketSummary: {
        customer: true,
        orderId: true,
        covers: true,
        server: true,
        type: true,
        floor: true,
        orderSource: false,
        pickupTime: true,
    },
    statusNew: true,
    statusReady: true,
};

/* ===== Demo Data ===== */

const DEMO_TICKETS: KDSTicket[] = [
    {
        id: 't1',
        collectionCode: '#1042',
        server: 'Maria S.',
        orderType: 'dine-in',
        covers: 4,
        status: 'new',
        tableNumber: 'T12',
        floor: 'Main Floor',
        placedAt: new Date(Date.now() - 3 * 60000),
        isUpdated: false,
        courses: [1],
        items: [
            { id: 'i1', name: 'Caesar Salad', quantity: 2, status: 'pending', course: 1, instructions: [{ id: 'ins1', type: 'warning', text: '⚠ Nut allergy' }] },
            { id: 'i2', name: 'Bruschetta', quantity: 1, status: 'pending', course: 1, instructions: [{ id: 'ins2', type: 'removal', text: '⊘ No onions' }] },
            { id: 'i3', name: 'Soup of the Day', quantity: 1, status: 'pending', course: 1, instructions: [] },
        ],
    },
    {
        id: 't2',
        collectionCode: '#1043',
        server: 'James K.',
        orderType: 'dine-in',
        covers: 2,
        status: 'preparing',
        tableNumber: 'T5',
        floor: 'Terrace',
        placedAt: new Date(Date.now() - 8 * 60000),
        startedAt: new Date(Date.now() - 5 * 60000),
        isUpdated: false,
        courses: [1, 2],
        items: [
            { id: 'i4', name: 'Grilled Salmon', quantity: 1, status: 'preparing', course: 1, instructions: [{ id: 'ins3', type: 'comment', text: '💬 Medium rare' }] },
            { id: 'i5', name: 'Ribeye Steak', quantity: 1, status: 'preparing', course: 1, instructions: [{ id: 'ins4', type: 'comment', text: '💬 Well done' }, { id: 'ins5', type: 'addition', text: '+ Extra mushrooms' }] },
            { id: 'i6', name: 'Tiramisu', quantity: 2, status: 'pending', course: 2, instructions: [] },
        ],
    },
    {
        id: 't3',
        collectionCode: '#1044',
        server: 'Sofia L.',
        orderType: 'delivery',
        covers: 1,
        status: 'preparing',
        customerName: 'John D.',
        placedAt: new Date(Date.now() - 12 * 60000),
        startedAt: new Date(Date.now() - 9 * 60000),
        isUpdated: true,
        courses: [1],
        items: [
            { id: 'i7', name: 'Margherita Pizza', quantity: 2, status: 'ready', course: 1, instructions: [] },
            { id: 'i8', name: 'Garlic Bread', quantity: 1, status: 'preparing', course: 1, instructions: [] },
            { id: 'i9', name: 'Coca Cola', quantity: 2, status: 'ready', course: 1, instructions: [] },
        ],
    },
    {
        id: 't4',
        collectionCode: '#1045',
        server: 'Alex M.',
        orderType: 'pickup',
        covers: 1,
        status: 'ready',
        customerName: 'Sarah W.',
        pickupTime: '19:30',
        placedAt: new Date(Date.now() - 18 * 60000),
        startedAt: new Date(Date.now() - 14 * 60000),
        completedAt: new Date(Date.now() - 2 * 60000),
        isUpdated: false,
        courses: [1],
        items: [
            { id: 'i10', name: 'Fish & Chips', quantity: 1, status: 'ready', course: 1, instructions: [] },
            { id: 'i11', name: 'Coleslaw', quantity: 1, status: 'ready', course: 1, instructions: [] },
        ],
    },
    {
        id: 't5',
        collectionCode: '#1046',
        server: 'Maria S.',
        orderType: 'dine-in',
        covers: 6,
        status: 'hold',
        tableNumber: 'T20',
        floor: 'Main Floor',
        placedAt: new Date(Date.now() - 25 * 60000),
        isUpdated: false,
        courses: [1, 2, 3],
        items: [
            { id: 'i12', name: 'Mixed Grill Platter', quantity: 2, status: 'pending', course: 1, instructions: [{ id: 'ins6', type: 'warning', text: '⚠ Gluten allergy' }] },
            { id: 'i13', name: 'Grilled Vegetables', quantity: 1, status: 'pending', course: 1, instructions: [] },
            { id: 'i14', name: 'Lamb Rack', quantity: 2, status: 'pending', course: 2, instructions: [{ id: 'ins7', type: 'comment', text: '💬 Medium' }] },
            { id: 'i15', name: 'Cheesecake', quantity: 3, status: 'pending', course: 3, instructions: [] },
        ],
    },
    {
        id: 't6',
        collectionCode: '#1047',
        server: 'James K.',
        orderType: 'dine-in',
        covers: 2,
        status: 'new',
        tableNumber: 'T8',
        floor: 'Main Floor',
        placedAt: new Date(Date.now() - 1 * 60000),
        isUpdated: false,
        courses: [1],
        items: [
            { id: 'i16', name: 'Pasta Carbonara', quantity: 1, status: 'pending', course: 1, instructions: [{ id: 'ins8', type: 'addition', text: '+ Extra parmesan' }] },
            { id: 'i17', name: 'Penne Arrabbiata', quantity: 1, status: 'pending', course: 1, instructions: [{ id: 'ins9', type: 'removal', text: '⊘ No chili flakes' }] },
        ],
    },
];

/* ===== Helpers ===== */

const getMinutesAgo = (date: Date): string => {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'just now';
    return `${mins} min ago`;
};

const formatTime = (date: Date, format: TimeFormat): string => {
    if (format === '24h') {
        return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
    new: { label: 'New', color: 'var(--kds2-status-new)', bg: 'var(--kds2-status-new-bg)' },
    preparing: { label: 'Preparing', color: 'var(--kds2-status-preparing)', bg: 'var(--kds2-status-preparing-bg)' },
    ready: { label: 'Ready', color: 'var(--kds2-status-ready)', bg: 'var(--kds2-status-ready-bg)' },
    hold: { label: 'On Hold', color: 'var(--kds2-status-hold)', bg: 'var(--kds2-status-hold-bg)' },
    canceled: { label: 'Canceled', color: 'var(--kds2-status-canceled)', bg: 'var(--kds2-status-canceled-bg)' },
    completed: { label: 'Completed', color: 'var(--kds2-status-completed)', bg: 'var(--kds2-status-completed-bg)' },
};

const ORDER_TYPE_CONFIG: Record<OrderType, { label: string; icon: React.ReactNode }> = {
    'dine-in': { label: 'Dine-In', icon: <UtensilsCrossed size={14} /> },
    'delivery': { label: 'Delivery', icon: <Truck size={14} /> },
    'pickup': { label: 'Pickup', icon: <ShoppingBag size={14} /> },
};

const INSTRUCTION_ICONS: Record<InstructionType, { icon: React.ReactNode; label: string }> = {
    warning: { icon: <AlertTriangle size={10} />, label: '⚠' },
    addition: { icon: <Plus size={10} />, label: '+' },
    removal: { icon: <MinusCircle size={10} />, label: '⊘' },
    comment: { icon: <MessageSquare size={10} />, label: '💬' },
};

/* ===== Main Component ===== */

const KDS2Screen: React.FC = () => {
    const { user } = useAuth();

    // State
    const [tickets, setTickets] = useState<KDSTicket[]>(DEMO_TICKETS);
    const [settings, setSettings] = useState<KDSSettings>(DEFAULT_SETTINGS);
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [typeFilter, setTypeFilter] = useState<OrderType | 'all'>('all');
    const [showCompleted, setShowCompleted] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAllSettings, setShowAllSettings] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [view, setView] = useState<KDSView>('tickets');
    const [undoTicket, setUndoTicket] = useState<KDSTicket | null>(null);
    const [statusMenu, setStatusMenu] = useState<{ ticketId: string; x: number; y: number } | null>(null);
    const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
    const [showStats, setShowStats] = useState(false);

    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const stationName = 'Kitchen';

    // Filtered tickets
    const filteredTickets = useMemo(() => {
        let result = tickets;

        if (showCompleted) {
            return result.filter(t => t.status === 'completed');
        }

        if (statusFilter !== 'all') {
            result = result.filter(t => t.status === statusFilter);
        } else {
            result = result.filter(t => t.status !== 'completed');
        }

        if (typeFilter !== 'all') {
            result = result.filter(t => t.orderType === typeFilter);
        }

        // Sort by placedAt (FIFO)
        return result.sort((a, b) => a.placedAt.getTime() - b.placedAt.getTime());
    }, [tickets, statusFilter, typeFilter, showCompleted]);

    // Status counts
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: 0, new: 0, preparing: 0, ready: 0, hold: 0, canceled: 0, completed: 0 };
        tickets.forEach(t => {
            if (t.status !== 'completed') counts.all++;
            counts[t.status]++;
        });
        return counts;
    }, [tickets]);

    // Type counts
    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = { all: 0, 'dine-in': 0, delivery: 0, pickup: 0 };
        tickets.filter(t => t.status !== 'completed').forEach(t => {
            counts.all++;
            counts[t.orderType]++;
        });
        return counts;
    }, [tickets]);

    // Uncollected items count
    const uncollectedCount = useMemo(() => {
        return tickets
            .filter(t => t.status !== 'completed' && t.status !== 'canceled')
            .reduce((sum, t) => sum + t.items.filter(i => i.status !== 'completed').length, 0);
    }, [tickets]);

    // Items list grouped by status
    const itemsList = useMemo(() => {
        const groups: Record<string, { name: string; quantity: number; instructions: ProductionInstruction[] }[]> = {
            preparing: [],
            hold: [],
            ready: [],
        };

        const itemMap = new Map<string, { name: string; quantity: number; instructions: ProductionInstruction[] }>();

        tickets.filter(t => t.status !== 'completed' && t.status !== 'canceled').forEach(t => {
            const groupKey = t.status === 'hold' ? 'hold' : t.status === 'ready' ? 'ready' : 'preparing';
            t.items.forEach(item => {
                const key = `${groupKey}-${item.name}`;
                const existing = itemMap.get(key);
                if (existing) {
                    existing.quantity += item.quantity;
                } else {
                    const entry = { name: item.name, quantity: item.quantity, instructions: item.instructions };
                    itemMap.set(key, entry);
                    groups[groupKey].push(entry);
                }
            });
        });

        return groups;
    }, [tickets]);

    // Wait time check
    const getTicketAlertClass = useCallback((ticket: KDSTicket): string => {
        if (!settings.enableTimer || ticket.status === 'completed' || ticket.status === 'canceled') return '';
        const mins = Math.floor((Date.now() - ticket.placedAt.getTime()) / 60000);
        if (mins >= settings.lateAfter) return 'late';
        if (mins >= settings.delayedAfter) return 'delayed';
        return '';
    }, [settings.enableTimer, settings.delayedAfter, settings.lateAfter]);

    // ===== Actions =====

    const bumpItemStatus = useCallback((ticketId: string, itemId: string) => {
        setTickets(prev => prev.map(t => {
            if (t.id !== ticketId) return t;
            const items = t.items.map(i => {
                if (i.id !== itemId) return i;
                const nextStatus: Record<string, string> = {
                    pending: 'preparing',
                    preparing: 'ready',
                    ready: 'completed',
                };
                return { ...i, status: (nextStatus[i.status] || i.status) as KDSItem['status'] };
            });

            // Update ticket status based on item statuses
            const allCompleted = items.every(i => i.status === 'completed');
            const anyPreparing = items.some(i => i.status === 'preparing' || i.status === 'ready');
            let newStatus = t.status;

            if (allCompleted) {
                newStatus = 'completed';
                // Trigger undo
                const completedTicket = { ...t, status: newStatus as OrderStatus, items };
                setUndoTicket(completedTicket);
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                undoTimerRef.current = setTimeout(() => setUndoTicket(null), 5000);
            } else if (anyPreparing && t.status === 'new') {
                newStatus = 'preparing';
            } else if (items.every(i => i.status === 'ready' || i.status === 'completed')) {
                newStatus = 'ready';
            }

            return { ...t, items, status: newStatus as OrderStatus, startedAt: t.startedAt || (newStatus === 'preparing' ? new Date() : undefined), completedAt: allCompleted ? new Date() : t.completedAt };
        }));
    }, []);

    const bumpTicket = useCallback((ticketId: string) => {
        setTickets(prev => prev.map(t => {
            if (t.id !== ticketId) return t;
            const nextStatus: Record<string, OrderStatus> = {
                new: 'preparing',
                preparing: 'ready',
                ready: 'completed',
            };
            const next = nextStatus[t.status];
            if (!next) return t;

            if (next === 'completed') {
                setUndoTicket({ ...t, status: next });
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                undoTimerRef.current = setTimeout(() => setUndoTicket(null), 5000);
            }

            return {
                ...t,
                status: next,
                startedAt: t.startedAt || (next === 'preparing' ? new Date() : undefined),
                completedAt: next === 'completed' ? new Date() : t.completedAt,
                items: t.items.map(i => ({ ...i, status: next === 'completed' ? 'completed' : i.status })),
            };
        }));
    }, []);

    const setTicketStatus = useCallback((ticketId: string, status: OrderStatus) => {
        setTickets(prev => prev.map(t => {
            if (t.id !== ticketId) return t;
            return { ...t, status, isUpdated: false };
        }));
        setStatusMenu(null);
    }, []);

    const undoComplete = useCallback(() => {
        if (!undoTicket) return;
        setTickets(prev => prev.map(t => {
            if (t.id !== undoTicket.id) return t;
            return { ...t, status: 'preparing' as OrderStatus, completedAt: undefined, items: t.items.map(i => ({ ...i, status: 'preparing' as KDSItem['status'] })) };
        }));
        setUndoTicket(null);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    }, [undoTicket]);

    const confirmUpdate = useCallback((ticketId: string) => {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, isUpdated: false } : t));
    }, []);

    const toggleItemsCollapse = useCallback((ticketId: string) => {
        setCollapsedItems(prev => {
            const next = new Set(prev);
            if (next.has(ticketId)) next.delete(ticketId); else next.add(ticketId);
            return next;
        });
    }, []);

    const handleLRightClick = useCallback((e: React.MouseEvent, ticketId: string) => {
        e.preventDefault();
        setStatusMenu({ ticketId, x: e.clientX, y: e.clientY });
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {/* ignore */ });
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {/* ignore */ });
        }
    }, []);

    // Close status menu on click anywhere
    useEffect(() => {
        const handler = () => setStatusMenu(null);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    // Get item action button
    const getItemActionButton = (item: KDSItem, ticketId: string) => {
        switch (item.status) {
            case 'pending':
                return (
                    <button className="kds2-ticket-item-action play" onClick={() => bumpItemStatus(ticketId, item.id)} title="Start preparing">
                        <Play size={14} />
                    </button>
                );
            case 'preparing':
                return (
                    <button className="kds2-ticket-item-action bell" onClick={() => bumpItemStatus(ticketId, item.id)} title="Ready to collect">
                        <Bell size={14} />
                    </button>
                );
            case 'ready':
                return (
                    <button className="kds2-ticket-item-action check" onClick={() => bumpItemStatus(ticketId, item.id)} title="Collected">
                        <Check size={14} />
                    </button>
                );
            default:
                return <Check size={14} style={{ color: 'var(--kds2-status-ready)', opacity: 0.5 }} />;
        }
    };

    /* ===== Render ===== */

    return (
        <div className={`kds2-container ${settings.colorTheme === 'dark' ? 'kds2-dark' : ''}`}>
            {/* Header */}
            <div className="kds2-header">
                <div className="kds2-header-left">
                    <span className="kds2-station-name">{stationName}</span>
                    <span className="kds2-item-count">
                        <span className="kds2-item-count-number">{uncollectedCount}</span> items
                    </span>
                </div>
                <div className="kds2-header-right">
                    {/* View toggle */}
                    <div className="kds2-view-toggle">
                        <button className={`kds2-view-toggle-btn ${view === 'tickets' ? 'active' : ''}`} onClick={() => setView('tickets')}>
                            <LayoutGrid size={14} />
                        </button>
                        <button className={`kds2-view-toggle-btn ${view === 'items-list' ? 'active' : ''}`} onClick={() => setView('items-list')}>
                            <List size={14} />
                        </button>
                    </div>
                    <button className="kds2-header-btn" onClick={() => setShowStats(true)} title="Statistics">
                        <BarChart3 size={18} />
                    </button>
                    <div className={`kds2-connection-dot ${true ? '' : 'disconnected'}`} title="Connected" />
                    <button className="kds2-header-btn" onClick={() => setShowSettings(true)} title="Settings">
                        <Settings size={18} />
                    </button>
                    <button className="kds2-header-btn" onClick={toggleFullscreen} title="Fullscreen">
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </div>

            {/* Filter Bars */}
            <div className="kds2-filters">
                {settings.showStatusFilter && (
                    <div className="kds2-filter-row">
                        <button className={`kds2-filter-btn ${statusFilter === 'all' && !showCompleted ? 'active' : ''}`} onClick={() => { setStatusFilter('all'); setShowCompleted(false); }}>
                            All <span className="kds2-filter-count">{statusCounts.all}</span>
                        </button>
                        {settings.statusNew && (
                            <button className={`kds2-filter-btn ${statusFilter === 'new' ? 'active' : ''}`} onClick={() => { setStatusFilter('new'); setShowCompleted(false); }}>
                                <span className="kds2-filter-dot" style={{ background: STATUS_CONFIG.new.color }} /> New <span className="kds2-filter-count">{statusCounts.new}</span>
                            </button>
                        )}
                        <button className={`kds2-filter-btn ${statusFilter === 'preparing' ? 'active' : ''}`} onClick={() => { setStatusFilter('preparing'); setShowCompleted(false); }}>
                            <span className="kds2-filter-dot" style={{ background: STATUS_CONFIG.preparing.color }} /> Preparing <span className="kds2-filter-count">{statusCounts.preparing}</span>
                        </button>
                        {settings.statusReady && (
                            <button className={`kds2-filter-btn ${statusFilter === 'ready' ? 'active' : ''}`} onClick={() => { setStatusFilter('ready'); setShowCompleted(false); }}>
                                <span className="kds2-filter-dot" style={{ background: STATUS_CONFIG.ready.color }} /> Ready <span className="kds2-filter-count">{statusCounts.ready}</span>
                            </button>
                        )}
                        <button className={`kds2-filter-btn ${statusFilter === 'hold' ? 'active' : ''}`} onClick={() => { setStatusFilter('hold'); setShowCompleted(false); }}>
                            <span className="kds2-filter-dot" style={{ background: STATUS_CONFIG.hold.color }} /> On Hold <span className="kds2-filter-count">{statusCounts.hold}</span>
                        </button>
                        <button className={`kds2-filter-btn ${showCompleted ? 'active' : ''}`} onClick={() => setShowCompleted(!showCompleted)} style={{ marginLeft: 'auto' }}>
                            Completed <span className="kds2-filter-count">{statusCounts.completed}</span>
                        </button>
                    </div>
                )}

                {settings.showTypeFilter && (
                    <div className="kds2-filter-row">
                        <button className={`kds2-filter-btn ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>
                            All <span className="kds2-filter-count">{typeCounts.all}</span>
                        </button>
                        {(Object.keys(ORDER_TYPE_CONFIG) as OrderType[]).map(type => (
                            <button key={type} className={`kds2-filter-btn ${typeFilter === type ? 'active' : ''}`} onClick={() => setTypeFilter(type)}>
                                {ORDER_TYPE_CONFIG[type].icon} {ORDER_TYPE_CONFIG[type].label} <span className="kds2-filter-count">{typeCounts[type]}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Main Content */}
            {view === 'tickets' ? (
                filteredTickets.length === 0 ? (
                    <div className="kds2-empty">
                        <div className="kds2-empty-icon">🍳</div>
                        <div className="kds2-empty-text">{showCompleted ? 'No completed orders' : 'No active orders'}</div>
                    </div>
                ) : (
                    <div className={`kds2-tickets-area ${settings.layout === 'equal' ? 'layout-equal' : ''}`}>
                        {filteredTickets.map(ticket => {
                            const alertClass = getTicketAlertClass(ticket);
                            const isCollapsed = collapsedItems.has(ticket.id);

                            return (
                                <div
                                    key={ticket.id}
                                    className={`kds2-ticket status-${ticket.status} ${alertClass} ${ticket.isUpdated ? 'blink' : ''}`}
                                    onDoubleClick={() => bumpTicket(ticket.id)}
                                    onContextMenu={(e) => handleLRightClick(e, ticket.id)}
                                    onClick={() => ticket.isUpdated && confirmUpdate(ticket.id)}
                                >
                                    {/* Course color bar */}
                                    {ticket.courses.length > 1 && (
                                        <div className="kds2-ticket-courses-bar">
                                            {ticket.courses.map((c, idx) => (
                                                <div key={idx} className={`course-segment ${idx === 0 ? 'completed' : ''}`} style={{ background: ['#3B82F6', '#22C55E', '#F97316', '#8B5CF6'][idx % 4] }} />
                                            ))}
                                        </div>
                                    )}

                                    {/* Summary */}
                                    <div className="kds2-ticket-summary">
                                        {settings.summaryView === 'full' ? (
                                            <div className="kds2-ticket-summary-full">
                                                {settings.ticketSummary.orderId && (
                                                    <div className="kds2-ticket-collection-code">{ticket.collectionCode}</div>
                                                )}
                                                {settings.ticketSummary.server && (
                                                    <div className="kds2-ticket-summary-row">
                                                        <Users size={12} /> <span className="label">{ticket.server}</span>
                                                    </div>
                                                )}
                                                {settings.ticketSummary.type && (
                                                    <div className="kds2-ticket-summary-row">
                                                        {ORDER_TYPE_CONFIG[ticket.orderType].icon} {ORDER_TYPE_CONFIG[ticket.orderType].label}
                                                        {ticket.tableNumber && ` • ${ticket.tableNumber}`}
                                                    </div>
                                                )}
                                                {settings.ticketSummary.covers && (
                                                    <div className="kds2-ticket-summary-row">
                                                        <Users size={12} /> {ticket.covers} {ticket.covers === 1 ? 'cover' : 'covers'}
                                                    </div>
                                                )}
                                                {settings.ticketSummary.floor && ticket.floor && (
                                                    <div className="kds2-ticket-summary-row">📍 {ticket.floor}</div>
                                                )}
                                                {settings.ticketSummary.customer && ticket.customerName && (
                                                    <div className="kds2-ticket-summary-row">👤 {ticket.customerName}</div>
                                                )}
                                                {settings.ticketSummary.pickupTime && ticket.pickupTime && (
                                                    <div className="kds2-ticket-summary-row">
                                                        <Clock size={12} /> Pickup: {ticket.pickupTime}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="kds2-ticket-summary-condensed">
                                                <div className="kds2-ticket-summary-row"><span className="label">{ticket.collectionCode}</span></div>
                                                <div className="kds2-ticket-summary-row">{ORDER_TYPE_CONFIG[ticket.orderType].icon} {ticket.tableNumber || ORDER_TYPE_CONFIG[ticket.orderType].label}</div>
                                                <div className="kds2-ticket-summary-row"><Users size={10} /> {ticket.server}</div>
                                                <div className="kds2-ticket-summary-row"><Users size={10} /> {ticket.covers}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Body — Items */}
                                    <div className="kds2-ticket-body">
                                        {settings.coursing === 'separate' ? (
                                            ticket.courses.map(course => {
                                                const courseItems = ticket.items.filter(i => i.course === course);
                                                return (
                                                    <div key={course}>
                                                        {ticket.courses.length > 1 && (
                                                            <div className="kds2-ticket-course-header">
                                                                <span className="kds2-ticket-course-label">Course {course}</span>
                                                                <button className="kds2-ticket-items-toggle" onClick={(e) => { e.stopPropagation(); toggleItemsCollapse(`${ticket.id}-c${course}`); }} title="Toggle items">
                                                                    <span className="kds2-ticket-item-count">{courseItems.length} items</span>
                                                                    {collapsedItems.has(`${ticket.id}-c${course}`) ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                                                </button>
                                                            </div>
                                                        )}
                                                        {!collapsedItems.has(`${ticket.id}-c${course}`) && courseItems.map(item => (
                                                            <div key={item.id} className={`kds2-ticket-item ${item.status === 'completed' ? 'kds2-ticket-item-completed' : ''}`}>
                                                                <div className="kds2-ticket-item-info">
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                        <span className="kds2-ticket-item-qty">{item.quantity}×</span>
                                                                        <span className="kds2-ticket-item-name">{item.name}</span>
                                                                    </div>
                                                                    {item.instructions.map(inst => (
                                                                        <div key={inst.id} className={`kds2-instruction ${inst.type}`}>
                                                                            <span className="kds2-instruction-icon">{INSTRUCTION_ICONS[inst.type].icon}</span>
                                                                            {inst.text}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {getItemActionButton(item, ticket.id)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            /* Combined view */
                                            <>
                                                <button className="kds2-ticket-items-toggle" onClick={(e) => { e.stopPropagation(); toggleItemsCollapse(ticket.id); }} title="Toggle items">
                                                    <span className="kds2-ticket-item-count">{ticket.items.length} items</span>
                                                    {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                                </button>
                                                {!isCollapsed && ticket.items.map(item => (
                                                    <div key={item.id} className={`kds2-ticket-item ${item.status === 'completed' ? 'kds2-ticket-item-completed' : ''}`}>
                                                        <div className="kds2-ticket-item-info">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <span className="kds2-ticket-item-qty">{item.quantity}×</span>
                                                                <span className="kds2-ticket-item-name">{item.name}</span>
                                                            </div>
                                                            {item.instructions.map(inst => (
                                                                <div key={inst.id} className={`kds2-instruction ${inst.type}`}>
                                                                    <span className="kds2-instruction-icon">{INSTRUCTION_ICONS[inst.type].icon}</span>
                                                                    {inst.text}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {getItemActionButton(item, ticket.id)}
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>

                                    {/* Footer — Timestamps */}
                                    <div className="kds2-ticket-footer" onDoubleClick={(e) => { e.stopPropagation(); bumpTicket(ticket.id); }}>
                                        <div className="kds2-ticket-timestamps">
                                            <div className="kds2-ticket-timestamp">
                                                <Clock size={10} /> <span className="time">{getMinutesAgo(ticket.placedAt)}</span>
                                            </div>
                                            {ticket.startedAt && (
                                                <div className="kds2-ticket-timestamp">
                                                    ▶ <span className="time">{formatTime(ticket.startedAt, settings.timeFormat)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: STATUS_CONFIG[ticket.status].color, color: '#fff' }}>
                                                {STATUS_CONFIG[ticket.status].label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                /* Items List View */
                <div className="kds2-items-list">
                    {Object.entries(itemsList).map(([status, items]) => {
                        if (items.length === 0) return null;
                        const totalQty = items.reduce((s, i) => s + i.quantity, 0);
                        return (
                            <div key={status} className="kds2-items-list-group">
                                <div className="kds2-items-list-group-header">
                                    <span className="kds2-items-list-group-title" style={{ color: STATUS_CONFIG[status as OrderStatus]?.color }}>
                                        {STATUS_CONFIG[status as OrderStatus]?.label || status} ({totalQty} items)
                                    </span>
                                </div>
                                {items.map((item, idx) => (
                                    <div key={idx} className="kds2-items-list-item">
                                        <div className="kds2-items-list-item-info">
                                            <span className="kds2-items-list-item-qty">{item.quantity}×</span>
                                            <div>
                                                <span className="kds2-items-list-item-name">{item.name}</span>
                                                {item.instructions.map((inst, i) => (
                                                    <div key={i} className={`kds2-instruction ${inst.type}`} style={{ fontSize: 12 }}>
                                                        {INSTRUCTION_ICONS[inst.type].icon} {inst.text}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <button className={`kds2-ticket-item-action ${status === 'preparing' ? 'bell' : status === 'ready' ? 'check' : 'play'}`} title="Bump">
                                            {status === 'preparing' ? <Bell size={14} /> : status === 'ready' ? <Check size={14} /> : <Play size={14} />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Undo Toast */}
            {undoTicket && (
                <div className="kds2-undo-toast">
                    <RotateCcw size={16} />
                    <span>{undoTicket.collectionCode} completed</span>
                    <button className="kds2-undo-btn" onClick={undoComplete}>Undo</button>
                </div>
            )}

            {/* Status Context Menu */}
            {statusMenu && (
                <div className="kds2-status-menu" style={{ left: statusMenu.x, top: statusMenu.y }} onClick={e => e.stopPropagation()}>
                    {(['new', 'preparing', 'ready', 'hold', 'canceled'] as OrderStatus[]).map(s => (
                        <button key={s} className="kds2-status-menu-item" onClick={() => setTicketStatus(statusMenu.ticketId, s)}>
                            <span className="status-dot" style={{ background: STATUS_CONFIG[s].color }} />
                            {STATUS_CONFIG[s].label}
                        </button>
                    ))}
                </div>
            )}

            {/* Settings Sidebar */}
            {showSettings && (
                <div className="kds2-settings-overlay" onClick={() => setShowSettings(false)}>
                    <div className="kds2-settings-panel" onClick={e => e.stopPropagation()}>
                        <div className="kds2-settings-header">
                            <span className="kds2-settings-title">{showAllSettings ? 'All Settings' : 'Quick Settings'}</span>
                            <button className="kds2-settings-close" onClick={() => { setShowSettings(false); setShowAllSettings(false); }}>
                                <X size={18} />
                            </button>
                        </div>

                        {!showAllSettings ? (
                            /* Quick Settings */
                            <>
                                <button className="kds2-all-settings-link" onClick={() => setShowAllSettings(true)}>
                                    <Settings size={16} /> All settings →
                                </button>

                                <div className="kds2-settings-section">
                                    <div className="kds2-settings-section-title">Language</div>
                                    <select className="kds2-select" value={settings.language} onChange={e => setSettings(s => ({ ...s, language: e.target.value }))} aria-label="Language">
                                        <option>English</option>
                                        <option>Deutsch</option>
                                        <option>Français</option>
                                        <option>Nederlands</option>
                                        <option>Türkçe</option>
                                    </select>
                                </div>

                                <div className="kds2-settings-section">
                                    <div className="kds2-settings-section-title">Ticket Summary View</div>
                                    <div className="kds2-radio-group">
                                        <button className={`kds2-radio-option ${settings.summaryView === 'full' ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, summaryView: 'full' }))}>Full</button>
                                        <button className={`kds2-radio-option ${settings.summaryView === 'condensed' ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, summaryView: 'condensed' }))}>Condensed</button>
                                    </div>
                                </div>

                                <div className="kds2-settings-section">
                                    <div className="kds2-settings-section-title">Show Filters</div>
                                    <div className="kds2-settings-row">
                                        <div className="kds2-settings-row-label">Station</div>
                                        <div className={`kds2-toggle ${settings.showStation ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, showStation: !s.showStation }))} />
                                    </div>
                                    <div className="kds2-settings-row">
                                        <div className="kds2-settings-row-label">Order Status</div>
                                        <div className={`kds2-toggle ${settings.showStatusFilter ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, showStatusFilter: !s.showStatusFilter }))} />
                                    </div>
                                    <div className="kds2-settings-row">
                                        <div className="kds2-settings-row-label">Order Type</div>
                                        <div className={`kds2-toggle ${settings.showTypeFilter ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, showTypeFilter: !s.showTypeFilter }))} />
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* All Settings */
                            <>
                                <button className="kds2-all-settings-link" onClick={() => setShowAllSettings(false)}>
                                    ← Back to Quick Settings
                                </button>

                                {/* 1. Ticket Summary */}
                                <div className="kds2-settings-section">
                                    <div className="kds2-settings-section-title">Ticket Summary</div>
                                    {Object.entries(settings.ticketSummary).map(([key, value]) => (
                                        <div key={key} className="kds2-settings-row">
                                            <div className="kds2-settings-row-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</div>
                                            <div className={`kds2-toggle ${value ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, ticketSummary: { ...s.ticketSummary, [key]: !value } }))} />
                                        </div>
                                    ))}
                                </div>

                                {/* 2. Order Status */}
                                <div className="kds2-settings-section">
                                    <div className="kds2-settings-section-title">Order Status</div>
                                    <div className="kds2-settings-row">
                                        <div>
                                            <div className="kds2-settings-row-label">New</div>
                                            <div className="kds2-settings-row-desc">Received order awaiting preparation</div>
                                        </div>
                                        <button className={`kds2-radio-option ${settings.statusNew ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, statusNew: !s.statusNew }))}>
                                            {settings.statusNew ? 'Activated' : 'Deactivated'}
                                        </button>
                                    </div>
                                    <div className="kds2-settings-row">
                                        <div>
                                            <div className="kds2-settings-row-label">Ready to Collect</div>
                                            <div className="kds2-settings-row-desc">Cooked items ready to be served</div>
                                        </div>
                                        <button className={`kds2-radio-option ${settings.statusReady ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, statusReady: !s.statusReady }))}>
                                            {settings.statusReady ? 'Activated' : 'Deactivated'}
                                        </button>
                                    </div>
                                </div>

                                {/* 3. Color Theme */}
                                <div className="kds2-settings-section">
                                    <div className="kds2-settings-section-title">Color Theme</div>
                                    <div className="kds2-radio-group">
                                        <button className={`kds2-radio-option ${settings.colorTheme === 'light' ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, colorTheme: 'light' }))}>Light</button>
                                        <button className={`kds2-radio-option ${settings.colorTheme === 'dark' ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, colorTheme: 'dark' }))}>Dark</button>
                                    </div>
                                </div>

                                {/* 4. Layouts */}
                                <div className="kds2-settings-section">
                                    <div className="kds2-settings-section-title">Layouts</div>
                                    <div className="kds2-radio-group">
                                        <button className={`kds2-radio-option ${settings.layout === 'direct-line' ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, layout: 'direct-line' }))}>Direct Line</button>
                                        <button className={`kds2-radio-option ${settings.layout === 'equal' ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, layout: 'equal' }))}>Equal View</button>
                                    </div>
                                </div>

                                {/* 5. Language & Time */}
                                <div className="kds2-settings-section">
                                    <div className="kds2-settings-section-title">Language & Time</div>
                                    <div className="kds2-settings-row">
                                        <div className="kds2-settings-row-label">Language</div>
                                        <select className="kds2-select" value={settings.language} onChange={e => setSettings(s => ({ ...s, language: e.target.value }))} aria-label="Language">
                                            <option>English</option><option>Deutsch</option><option>Français</option><option>Nederlands</option><option>Türkçe</option>
                                        </select>
                                    </div>
                                    <div className="kds2-settings-row">
                                        <div className="kds2-settings-row-label">Time Format</div>
                                        <div className="kds2-radio-group">
                                            <button className={`kds2-radio-option ${settings.timeFormat === '24h' ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, timeFormat: '24h' }))}>24h</button>
                                            <button className={`kds2-radio-option ${settings.timeFormat === 'ampm' ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, timeFormat: 'ampm' }))}>AM/PM</button>
                                        </div>
                                    </div>
                                </div>

                                {/* 6. Wait Times */}
                                <div className="kds2-settings-section">
                                    <div className="kds2-settings-section-title">Wait Times</div>
                                    <div className="kds2-settings-row">
                                        <div className="kds2-settings-row-label">Enable Timer</div>
                                        <div className={`kds2-toggle ${settings.enableTimer ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, enableTimer: !s.enableTimer }))} />
                                    </div>
                                    {settings.enableTimer && (
                                        <>
                                            <div className="kds2-settings-row">
                                                <div>
                                                    <div className="kds2-settings-row-label">Delayed After</div>
                                                    <div className="kds2-settings-row-desc">Ticket pulses orange</div>
                                                </div>
                                                <div className="kds2-number-input">
                                                    <input type="number" value={settings.delayedAfter} onChange={e => setSettings(s => ({ ...s, delayedAfter: parseInt(e.target.value) || 0 }))} />
                                                    <span className="unit">min</span>
                                                </div>
                                            </div>
                                            <div className="kds2-settings-row">
                                                <div>
                                                    <div className="kds2-settings-row-label">Late After</div>
                                                    <div className="kds2-settings-row-desc">Ticket pulses red</div>
                                                </div>
                                                <div className="kds2-number-input">
                                                    <input type="number" value={settings.lateAfter} onChange={e => setSettings(s => ({ ...s, lateAfter: parseInt(e.target.value) || 0 }))} />
                                                    <span className="unit">min</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* 7. Coursing */}
                                <div className="kds2-settings-section">
                                    <div className="kds2-settings-section-title">Coursing</div>
                                    <div className="kds2-radio-group">
                                        <button className={`kds2-radio-option ${settings.coursing === 'separate' ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, coursing: 'separate' }))}>Separate Chits</button>
                                        <button className={`kds2-radio-option ${settings.coursing === 'combined' ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, coursing: 'combined' }))}>Single Chit</button>
                                    </div>
                                </div>

                                {/* 8. Printing */}
                                <div className="kds2-settings-section">
                                    <div className="kds2-settings-section-title">Printing</div>
                                    <div className="kds2-settings-row">
                                        <div className="kds2-settings-row-label">Enable Printing</div>
                                        <div className={`kds2-toggle ${settings.enablePrinting ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, enablePrinting: !s.enablePrinting }))} />
                                    </div>
                                    {settings.enablePrinting && (
                                        <>
                                            <div className="kds2-settings-row">
                                                <div className="kds2-settings-row-label">Printing Profile</div>
                                                <select className="kds2-select" aria-label="Printing profile">
                                                    <option>Default Kitchen Printer</option>
                                                    <option>Bar Printer</option>
                                                    <option>Receipt Printer</option>
                                                </select>
                                            </div>
                                            <div className="kds2-settings-row">
                                                <div className="kds2-settings-row-label">Print on New</div>
                                                <div className={`kds2-toggle active`} />
                                            </div>
                                            <div className="kds2-settings-row">
                                                <div className="kds2-settings-row-label">Print on Preparing</div>
                                                <div className={`kds2-toggle`} />
                                            </div>
                                            <div className="kds2-settings-row">
                                                <div className="kds2-settings-row-label">Print on Ready</div>
                                                <div className={`kds2-toggle active`} />
                                            </div>
                                            <div className="kds2-settings-row">
                                                <div className="kds2-settings-row-label">Print on Completed</div>
                                                <div className={`kds2-toggle`} />
                                            </div>
                                        </>
                                    )}
                                </div>

                                <button className="kds2-settings-save" onClick={() => { toast.success('Settings saved'); setShowSettings(false); setShowAllSettings(false); }}>
                                    Save Changes
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Statistics Modal */}
            {showStats && (
                <div className="kds2-stats-modal" onClick={() => setShowStats(false)}>
                    <div className="kds2-stats-panel" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>KDS Statistics</h2>
                            <button className="kds2-settings-close" onClick={() => setShowStats(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <table className="kds2-stats-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Produced</th>
                                    <th>Fastest</th>
                                    <th>Slowest</th>
                                    <th>Average</th>
                                    <th>Total Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>Caesar Salad</td><td>14</td><td>2 min</td><td>8 min</td><td>4.5 min</td><td>63 min</td></tr>
                                <tr><td>Grilled Salmon</td><td>8</td><td>6 min</td><td>15 min</td><td>9 min</td><td>72 min</td></tr>
                                <tr><td>Ribeye Steak</td><td>12</td><td>8 min</td><td>18 min</td><td>12 min</td><td>144 min</td></tr>
                                <tr><td>Margherita Pizza</td><td>22</td><td>5 min</td><td>12 min</td><td>7 min</td><td>154 min</td></tr>
                                <tr><td>Pasta Carbonara</td><td>16</td><td>4 min</td><td>10 min</td><td>6 min</td><td>96 min</td></tr>
                                <tr><td>Fish & Chips</td><td>10</td><td>6 min</td><td>14 min</td><td>9 min</td><td>90 min</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KDS2Screen;
