/**
 * Customer-Facing Display — L-Series Parity
 * Opens in a new window/tab to show on a secondary screen.
 * Receives order data via BroadcastChannel API.
 *
 * Features:
 * - Real-time order item list
 * - Running total with animation
 * - Welcome / Thank You states
 * - Venue branding
 */
import React, { useState, useEffect } from 'react';

/* ===== Types ===== */

interface DisplayItem {
    id?: string;
    menu_item_name?: string;
    name?: string;
    qty?: number;
    unit_price?: number;
    price?: number;
    modifiers?: Array<{ name: string } | string>;
}

type DisplayStatus = 'welcome' | 'ordering' | 'payment' | 'thankyou';

interface BroadcastMessage {
    type: 'ORDER_UPDATE' | 'PAYMENT_START' | 'ORDER_COMPLETE' | 'CLEAR';
    items?: DisplayItem[];
    total?: number;
    venueName?: string;
}

/* ===== Constants ===== */

const BROADCAST_CHANNEL = 'pos-customer-display';

export default function CustomerFacingDisplay() {
    const [items, setItems] = useState<DisplayItem[]>([]);
    const [total, setTotal] = useState(0);
    const [venueName, setVenueName] = useState('');
    const [status, setStatus] = useState<DisplayStatus>('welcome');
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    useEffect(() => {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL);
        channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
            const data = event.data;
            if (data.type === 'ORDER_UPDATE') {
                setItems(data.items || []);
                setTotal(data.total || 0);
                setVenueName(data.venueName || '');
                setStatus('ordering');
                setLastUpdate(Date.now());
            } else if (data.type === 'PAYMENT_START') {
                setStatus('payment');
            } else if (data.type === 'ORDER_COMPLETE') {
                setStatus('thankyou');
                setTimeout(() => {
                    setItems([]);
                    setTotal(0);
                    setStatus('welcome');
                }, 5000);
            } else if (data.type === 'CLEAR') {
                setItems([]);
                setTotal(0);
                setStatus('welcome');
            }
        };
        return () => channel.close();
    }, []);

    return (
        <div style={styles.root}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.venueName}>{venueName || 'Welcome'}</div>
                <div style={styles.clock}>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>

            {/* Main Content */}
            <div style={styles.content}>
                {status === 'welcome' && (
                    <div style={styles.welcomeScreen}>
                        <div style={styles.welcomeIcon}>🍽️</div>
                        <div style={styles.welcomeTitle}>Welcome</div>
                        <div style={styles.welcomeSub}>Your order will appear here</div>
                    </div>
                )}

                {status === 'ordering' && (
                    <>
                        <div style={styles.itemsList}>
                            {items.map((item, idx) => (
                                <div key={item.id || idx} style={{ /* keep-inline */ /* keep-inline */
                                    ...styles.itemRow,
                                    animation: Date.now() - lastUpdate < 500 && idx === items.length - 1
                                        ? 'slideIn 0.3s ease-out' : 'none',
                                }}>
                                    <div style={styles.itemQty}>{item.qty || 1}x</div>
                                    <div style={styles.itemName}>
                                        {item.menu_item_name || item.name}
                                        {item.modifiers && item.modifiers.length > 0 && (
                                            <div style={styles.itemMod}>
                                                {item.modifiers.map((m: { name: string } | string) => typeof m === 'string' ? m : m.name).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <div style={styles.itemPrice}>
                                        €{((item.unit_price || item.price || 0) * (item.qty || 1)).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div style={styles.totalBar}>
                            <span style={styles.totalLabel}>Total</span>
                            <span style={styles.totalAmount}>€{total.toFixed(2)}</span>
                        </div>

                        <div style={styles.itemCount}>
                            {items.length} item{items.length !== 1 ? 's' : ''}
                        </div>
                    </>
                )}

                {status === 'payment' && (
                    <div style={styles.welcomeScreen}>
                        <div style={styles.welcomeIcon}>💳</div>
                        <div style={styles.welcomeTitle}>€{total.toFixed(2)}</div>
                        <div style={styles.welcomeSub}>Please follow the payment terminal instructions</div>
                    </div>
                )}

                {status === 'thankyou' && (
                    <div style={styles.welcomeScreen}>
                        <div style={styles.welcomeIcon}>✅</div>
                        <div style={styles.welcomeTitle}>Thank You!</div>
                        <div style={styles.welcomeSub}>Have a great day</div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={styles.footer}>
                <span>Powered by Restin.ai</span>
            </div>

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}

/* ═══ Broadcast Helper — call from POS Runtime ════════════════ */
export function broadcastToCustomerDisplay(type: string, data: Record<string, unknown> = {}) {
    try {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL);
        channel.postMessage({ type, ...data });
        channel.close();
    } catch {
        // BroadcastChannel not supported (fallback silently)
    }
}

const styles: Record<string, React.CSSProperties> = {
    root: {
        display: 'flex', flexDirection: 'column',
        height: '100vh', width: '100vw',
        backgroundColor: '#0a0a0a', color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 32px', borderBottom: '1px solid #222',
    },
    venueName: { fontSize: 22, fontWeight: 700, color: '#2A9D8F' },
    clock: { fontSize: 18, color: '#888', fontFamily: 'monospace' },
    content: { flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 32px', overflow: 'hidden' },
    welcomeScreen: {
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
    },
    welcomeIcon: { fontSize: 72 },
    welcomeTitle: { fontSize: 42, fontWeight: 800, color: '#fff' },
    welcomeSub: { fontSize: 18, color: '#666' },
    itemsList: { flex: 1, overflowY: 'auto' },
    itemRow: {
        display: 'flex', alignItems: 'flex-start', padding: '14px 0',
        borderBottom: '1px solid #1a1a1a', gap: 12,
    },
    itemQty: { fontSize: 16, fontWeight: 700, color: '#2A9D8F', minWidth: 32 },
    itemName: { flex: 1, fontSize: 18, fontWeight: 500, color: '#fff' },
    itemMod: { fontSize: 13, color: '#888', marginTop: 2 },
    itemPrice: { fontSize: 18, fontWeight: 700, color: '#fff', minWidth: 80, textAlign: 'right' },
    totalBar: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 0', borderTop: '2px solid #2A9D8F', marginTop: 8,
    },
    totalLabel: { fontSize: 22, fontWeight: 700, color: '#888' },
    totalAmount: { fontSize: 36, fontWeight: 800, color: '#2A9D8F' },
    itemCount: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 8 },
    footer: {
        padding: '12px 32px', borderTop: '1px solid #222',
        textAlign: 'center', fontSize: 12, color: '#444',
    },
};
