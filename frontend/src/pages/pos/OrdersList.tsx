/**
 * Orders List — View all orders (open, finalized, voided) with filters
 * Phase 9: Orders List & History + Z-Report
 */
import React, { useState, useEffect, CSSProperties } from 'react';
import { X, Filter, FileText, RotateCcw, Trash2, Printer, Search, ArrowDownLeft } from 'lucide-react';
import api from '../../lib/api';
import { logger } from '../../lib/logger';
import { toast } from 'sonner';

interface OrderEntry {
    id: string;
    order_number?: string;
    table_name?: string;
    table_id?: string;
    server_name?: string;
    item_count?: number;
    items?: unknown[];
    total?: number;
    status?: string;
    tender_type?: string;
    created_at?: string;
    createdAt?: string;
    [key: string]: unknown;
}

interface StatusColor {
    bg: string;
    color: string;
}

interface OrdersListProps {
    venueId: string;
    onReopen?: (order: OrderEntry) => void;
    onClose: () => void;
}

const s: Record<string, CSSProperties> = {
    overlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)',
        display: 'flex', flexDirection: 'column', zIndex: 1200,
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: '1px solid #333', backgroundColor: '#111',
    },
    title: { fontSize: 20, fontWeight: 700, color: '#fff' },
    headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4 },
    filterBar: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
        borderBottom: '1px solid #222', backgroundColor: '#0a0a0a',
    },
    filterBtn: {
        padding: '6px 14px', borderRadius: 20, border: '1px solid #333',
        backgroundColor: 'transparent', color: '#888', fontSize: 12, fontWeight: 600,
        cursor: 'pointer',
    },
    filterBtnActive: {
        padding: '6px 14px', borderRadius: 20, border: 'none',
        backgroundColor: '#2A9D8F', color: '#fff', fontSize: 12, fontWeight: 700,
        cursor: 'pointer',
    },
    body: { flex: 1, overflowY: 'auto', padding: 8, backgroundColor: '#0a0a0a' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: {
        padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
        color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #222',
        position: 'sticky', top: 0, backgroundColor: '#0a0a0a',
    },
    td: {
        padding: '12px 16px', fontSize: 13, color: '#ccc', borderBottom: '1px solid #1a1a1a',
    },
    row: { cursor: 'pointer' },
    statusBadge: {
        padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
        display: 'inline-block',
    },
    actionBtn: {
        padding: '4px 8px', borderRadius: 4, border: '1px solid #333',
        backgroundColor: 'transparent', color: '#888', cursor: 'pointer',
        fontSize: 11, marginRight: 4,
    },
    empty: { textAlign: 'center', color: '#666', padding: 60, fontSize: 14 },
    zReport: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300,
    },
    zReportModal: {
        backgroundColor: '#1a1a1a', borderRadius: 12, padding: 32, minWidth: 500,
        maxWidth: 600, border: '1px solid #333',
    },
    zTitle: { fontSize: 22, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 4 },
    zDate: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 24 },
    zRow: {
        display: 'flex', justifyContent: 'space-between', padding: '8px 0',
        borderBottom: '1px solid #222', fontSize: 14, color: '#ccc',
    },
    zRowTotal: {
        display: 'flex', justifyContent: 'space-between', padding: '12px 0',
        fontSize: 18, fontWeight: 800, color: '#fff',
    },
    zDivider: { height: 2, backgroundColor: '#333', margin: '12px 0' },
    zCloseBtn: {
        marginTop: 20, padding: '12px 0', borderRadius: 8, border: '1px solid #555',
        background: 'none', color: '#888', cursor: 'pointer', fontSize: 14, width: '100%',
    },
};

const STATUS_COLORS: Record<string, StatusColor> = {
    open: { bg: '#2A9D8F33', color: '#2A9D8F' },
    sent: { bg: '#5B8DEF33', color: '#5B8DEF' },
    finalized: { bg: '#4ade8033', color: '#4ade80' },
    voided: { bg: '#E05A3333', color: '#E05A33' },
    closed: { bg: '#88888833', color: '#888' },
};

export default function OrdersList({ venueId, onReopen, onClose }: OrdersListProps) {
    const [orders, setOrders] = useState<OrderEntry[]>([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [showZReport, setShowZReport] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const res = await api.get(`pos/orders?venue_id=${venueId}&limit=100`);
            setOrders(res.data?.orders || res.data || []);
        } catch (err: unknown) {
            logger.error('Failed to load orders', { error: String(err) });
        } finally {
            setLoading(false);
        }
    };

    const filteredByStatus: OrderEntry[] = filter === 'all'
        ? orders
        : orders.filter((o: OrderEntry) => o.status?.toLowerCase() === filter);

    const filtered: OrderEntry[] = searchQuery.trim()
        ? filteredByStatus.filter((o: OrderEntry) => {
            const q = searchQuery.toLowerCase();
            const orderNum = (o.order_number || o.id || '').toString().toLowerCase();
            const table = (o.table_name || o.table_id || '').toString().toLowerCase();
            const server = (o.server_name || '').toLowerCase();
            return orderNum.includes(q) || table.includes(q) || server.includes(q);
        })
        : filteredByStatus;

    const handleVoid = async (orderId: string) => {
        try {
            await api.post(`pos/orders/${orderId}/void?venue_id=${venueId}`, { reason: 'Manager void' });
            toast.success('Order voided');
            loadOrders();
        } catch (err: unknown) {
            logger.error('Failed to void order', { error: String(err) });
            toast.error('Failed to void');
        }
    };

    const handleReopen = (order: OrderEntry) => {
        if (onReopen) onReopen(order);
        onClose();
    };

    // Z-Report calculations
    const todayOrders = orders.filter((o: OrderEntry) => {
        const d = new Date(o.created_at || o.createdAt || '');
        const today = new Date();
        return d.toDateString() === today.toDateString();
    });
    const totalSales = todayOrders.reduce((sum: number, o: OrderEntry) => sum + (o.total || 0), 0);
    const cashSales = todayOrders.filter((o: OrderEntry) => o.tender_type === 'CASH').reduce((sum: number, o: OrderEntry) => sum + (o.total || 0), 0);
    const cardSales = todayOrders.filter((o: OrderEntry) => o.tender_type === 'CARD').reduce((sum: number, o: OrderEntry) => sum + (o.total || 0), 0);
    const voidedCount = todayOrders.filter((o: OrderEntry) => o.status === 'voided').length;
    const avgTicket = todayOrders.length > 0 ? totalSales / todayOrders.length : 0;

    return (
        <div style={s.overlay} onClick={onClose}>
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}> /* keep-inline */
                <div style={s.header}>
                    <span style={s.title}>Orders</span>
                    <div style={s.headerRight}>
                        <button
                            style={{ ...s.filterBtn, backgroundColor: '#2A9D8F', color: '#fff', border: 'none' }} /* keep-inline */
                            onClick={() => setShowZReport(true)}
                        >
                            <FileText size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> /* keep-inline */
                            Z-Report
                        </button>
                        <button style={s.closeBtn} onClick={onClose}>
                            <X size={22} color="#888" />
                        </button>
                    </div>
                </div>

                <div style={s.filterBar}>
                    <Filter size={14} color="#888" />
                    {['all', 'open', 'sent', 'finalized', 'voided'].map(f => (
                        <button
                            key={f}
                            style={filter === f ? s.filterBtnActive : s.filterBtn}
                            onClick={() => setFilter(f)}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? orders.length : orders.filter((o: OrderEntry) => o.status?.toLowerCase() === f).length})
                        </button>
                    ))}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#1a1a1a', borderRadius: 8, padding: '4px 10px', border: '1px solid #333' }}> /* keep-inline */
                        <Search size={14} color="#666" />
                        <input
                            style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 12, width: 140 }} /* keep-inline */
                            placeholder="Search orders…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div style={s.body}>
                    {loading ? (
                        <div style={s.empty}>{"Loading "}orders...</div>
                    ) : filtered.length === 0 ? (
                        <div style={s.empty}>{"No "}orders found</div>
                    ) : (
                        <table style={s.table}>
                            <thead>
                                <tr>
                                    <th style={s.th}>Order #</th>
                                    <th style={s.th}>Table</th>
                                    <th style={s.th}>Server</th>
                                    <th style={s.th}>Items</th>
                                    <th style={s.th}>Total</th>
                                    <th style={s.th}>Status</th>
                                    <th style={s.th}>Time</th>
                                    <th style={s.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((o: OrderEntry, idx: number) => {
                                    const statusColor = STATUS_COLORS[o.status?.toLowerCase() || 'open'] || STATUS_COLORS.open;
                                    return (
                                        <tr key={o.id || idx} style={s.row}
                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a1a1a'; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        >
                                            <td style={s.td}>#{(o.order_number || o.id || '').toString().slice(-4)}</td>
                                            <td style={s.td}>{o.table_name || `T${o.table_id?.slice(-1) || '?'}`}</td>
                                            <td style={s.td}>{o.server_name || '-'}</td>
                                            <td style={s.td}>{o.item_count || o.items?.length || 0}</td>
                                            <td style={{ ...s.td, fontWeight: 700 }}>€{(o.total || 0).toFixed(2)}</td> /* keep-inline */
                                            <td style={s.td}>
                                                <span style={{ /* keep-inline */
                                                    ...s.statusBadge,
                                                    backgroundColor: statusColor.bg,
                                                    color: statusColor.color,
                                                }}>
                                                    {o.status || 'open'}
                                                </span>
                                            </td>
                                            <td style={s.td}>
                                                {o.created_at ? new Date(o.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </td>
                                            <td style={s.td}>
                                                {o.status === 'finalized' && (
                                                    <>
                                                        <button style={s.actionBtn} onClick={() => handleReopen(o)} title="Reopen">
                                                            <RotateCcw size={12} />
                                                        </button>
                                                        <button style={{ ...s.actionBtn, color: '#F4A261', borderColor: '#F4A261' }} onClick={() => { toast.info('Partial refund — select items to refund'); handleReopen(o); }} title="Partial Refund"> /* keep-inline */
                                                            <ArrowDownLeft size={12} />
                                                        </button>
                                                        <button style={s.actionBtn} onClick={() => handleVoid(o.id)} title="Void">
                                                            <Trash2 size={12} />
                                                        </button>
                                                        <button style={s.actionBtn} title="Print">
                                                            <Printer size={12} />
                                                        </button>
                                                    </>
                                                )}
                                                {o.status === 'open' && (
                                                    <button style={s.actionBtn} onClick={() => handleReopen(o)} title="Edit">
                                                        Edit
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Z-Report Modal */}
            {showZReport && (
                <div style={s.zReport} onClick={() => setShowZReport(false)}>
                    <div style={s.zReportModal} onClick={e => e.stopPropagation()}>
                        <div style={s.zTitle}>End of Day Report</div>
                        <div style={s.zDate}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <div style={s.zDivider} />
                        <div style={s.zRow}><span>Total Orders</span><span>{todayOrders.length}</span></div>
                        <div style={s.zRow}><span>Cash Sales</span><span>€{cashSales.toFixed(2)}</span></div>
                        <div style={s.zRow}><span>Card Sales</span><span>€{cardSales.toFixed(2)}</span></div>
                        <div style={s.zRow}><span>Voided Orders</span><span>{voidedCount}</span></div>
                        <div style={s.zRow}><span>Average Ticket</span><span>€{avgTicket.toFixed(2)}</span></div>
                        <div style={s.zDivider} />
                        <div style={s.zRowTotal}><span>Total Sales</span><span>€{totalSales.toFixed(2)}</span></div>
                        <button style={s.zCloseBtn} onClick={() => setShowZReport(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}
