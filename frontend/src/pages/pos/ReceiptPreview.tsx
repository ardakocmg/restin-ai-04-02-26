/**
 * ReceiptPreview — Digital receipt modal with print-ready layout
 * Displays a formatted receipt that can be printed (thermal or A4)
 */
import { Download,Mail,Printer,X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ReceiptPreview({ order, items, orderTotal, venueInfo, onClose }) {
    const [format, setFormat] = useState('thermal'); // 'thermal' | 'a4'

    const now = new Date();
    const receiptDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const receiptTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const receiptNumber = order?.order_number || `R-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`;

    const taxRate = 0.18; // Default Malta VAT
    const subtotal = orderTotal / (1 + taxRate);
    const taxAmount = orderTotal - subtotal;

    const venue = venueInfo || {
        name: 'Restin.AI Restaurant',
        address: '123 Republic Street, Valletta',
        phone: '+356 2123 4567',
        vatNumber: 'MT12345678',
    };

    const handlePrint = () => {
        window.print();
        toast.success('Sent to printer');
    };

    const handleEmail = () => {
        toast.success('Receipt emailed to customer');
    };

    const handleDownload = () => {
        toast.success('Receipt downloaded as PDF');
    };

    return (
        <div style={s.overlay} onClick={onClose}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>

                {/* Action bar */}
                <div style={s.actionBar}>
                    <div style={{ display: 'flex', gap: 4  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                        <button
                            style={{ ...s.formatBtn, backgroundColor: format === 'thermal' ? '#2A9D8F' : '#333'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                            onClick={() => setFormat('thermal')}
                        >
                            Thermal
                        </button>
                        <button
                            style={{ ...s.formatBtn, backgroundColor: format === 'a4' ? '#2A9D8F' : '#333'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                            onClick={() => setFormat('a4')}
                        >
                            A4
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                        <button style={s.iconBtn} onClick={handlePrint} title="Print">
                            <Printer size={16} color="#fff" />
                        </button>
                        <button style={s.iconBtn} onClick={handleEmail} title="Email">
                            <Mail size={16} color="#fff" />
                        </button>
                        <button style={s.iconBtn} onClick={handleDownload} title="Download PDF">
                            <Download size={16} color="#fff" />
                        </button>
                        <button style={s.closeBtn} aria-label="Action" onClick={onClose}>
                            <X size={18} color="#888" />
                        </button>
                    </div>
                </div>

                {/* Receipt Paper */}
                <div style={{ ...s.paper, maxWidth: format === 'thermal' ? 320 : 500  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>

                    {/* Logo & Venue Header */}
                    <div style={s.receiptHeader}>
                        <div style={s.venueName}>{venue.name}</div>
                        <div style={s.venueDetail}>{venue.address}</div>
                        <div style={s.venueDetail}>{venue.phone}</div>
                        <div style={s.venueDetail}>VAT: {venue.vatNumber}</div>
                    </div>

                    {/* Divider */}
                    <div style={s.divider} />

                    {/* Receipt Info */}
                    <div style={s.receiptInfo}>
                        <div style={s.infoRow}>
                            <span>Receipt #:</span>
                            <span style={{ fontWeight: 700  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{receiptNumber}</span>
                        </div>
                        <div style={s.infoRow}>
                            <span>Date:</span>
                            <span>{receiptDate}</span>
                        </div>
                        <div style={s.infoRow}>
                            <span>Time:</span>
                            <span>{receiptTime}</span>
                        </div>
                        <div style={s.infoRow}>
                            <span>Table:</span>
                            <span>{order?.table_name || order?.table_number || 'Counter'}</span>
                        </div>
                        {order?.server_name && (
                            <div style={s.infoRow}>
                                <span>Server:</span>
                                <span>{order.server_name}</span>
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div style={s.divider} />

                    {/* Items */}
                    <div style={s.itemsSection}>
                        <div style={s.itemHeader}>
                            <span style={{ flex: 1  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>Item</span>
                            <span style={{ width: 40, textAlign: 'center'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>Qty</span>
                            <span style={{ width: 70, textAlign: 'right'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>Amount</span>
                        </div>
                        {(items || []).map((item, idx) => {
                            const price = (item.unit_price || item.price || 0) * (item.qty || 1);
                            return (
                                <div key={item.id || idx} style={s.itemRow}>
                                    <span style={{ flex: 1, fontSize: 12  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{item.menu_item_name || item.name}</span>
                                    <span style={{ width: 40, textAlign: 'center', fontSize: 12  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{item.qty || 1}</span>
                                    <span style={{ width: 70, textAlign: 'right', fontSize: 12, fontWeight: 600  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>€{price.toFixed(2)}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Divider */}
                    <div style={s.divider} />

                    {/* Totals */}
                    <div style={s.totalsSection}>
                        <div style={s.totalRow}>
                            <span>Subtotal</span>
                            <span>€{subtotal.toFixed(2)}</span>
                        </div>
                        <div style={s.totalRow}>
                            <span>VAT (18%)</span>
                            <span>€{taxAmount.toFixed(2)}</span>
                        </div>
                        <div style={s.dividerThin} />
                        <div style={s.grandTotal}>
                            <span>TOTAL</span>
                            <span>€{orderTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Payment Method */}
                    {order?.tender_type && (
                        <>
                            <div style={s.divider} />
                            <div style={s.paymentMethod}>
                                <span>Paid by: {order.tender_type === 'ROOM_CHARGE' ? 'Room Charge' : order.tender_type}</span>
                                {order.change > 0 && <span>Change: €{order.change.toFixed(2)}</span>}
                            </div>
                            {order.tender_type === 'ROOM_CHARGE' && order.room_number && (
                                <div style={{ ...s.paymentMethod, marginTop: 2  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                    <span>Room: {order.room_number}</span>
                                    {order.guest_name && <span>Guest: {order.guest_name}</span>}
                                </div>
                            )}
                        </>
                    )}

                    {/* Footer */}
                    <div style={s.divider} />
                    <div style={s.footer}>
                        <div style={{ fontSize: 11, textAlign: 'center', color: '#666', marginBottom: 8  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                            Thank you for dining with us!
                        </div>
                        <div style={{ fontSize: 10, textAlign: 'center', color: '#888'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                            Powered by Restin.AI
                        </div>
                        {/* Barcode placeholder */}
                        <div style={s.barcode}>
                            {'|'.repeat(40).split('').map((_, i) => (
                                <div key={i} style={{ width: Math.random() > 0.5 ? 2 : 1, height: 30, backgroundColor: '#333'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
    },
    modal: {
        backgroundColor: '#1a1a1a', borderRadius: 16, border: '1px solid #333',
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const,
    },
    actionBar: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid #333',
    },
    formatBtn: {
        padding: '6px 14px', borderRadius: 6, border: 'none', color: '#fff',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
    },
    iconBtn: {
        background: '#333', border: 'none', borderRadius: 6, padding: '6px 10px',
        cursor: 'pointer', display: 'flex', alignItems: 'center',
    },
    closeBtn: {
        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
    },
    paper: {
        backgroundColor: '#fefefe', color: '#111', margin: 16, borderRadius: 4,
        padding: 20, overflowY: 'auto' as const, fontFamily: "'Courier New', monospace",
    },
    receiptHeader: { textAlign: 'center' as const, marginBottom: 12 },
    venueName: { fontSize: 18, fontWeight: 800, letterSpacing: 1 },
    venueDetail: { fontSize: 11, color: '#555', marginTop: 2 },
    divider: {
        borderTop: '2px dashed #ccc', margin: '10px 0',
    },
    dividerThin: {
        borderTop: '1px solid #ddd', margin: '6px 0',
    },
    receiptInfo: { padding: '4px 0' },
    infoRow: {
        display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: '#333',
    },
    itemsSection: { padding: '4px 0' },
    itemHeader: {
        display: 'flex', fontSize: 10, fontWeight: 700, color: '#888',
        textTransform: 'uppercase' as const, padding: '4px 0', borderBottom: '1px solid #eee',
    },
    itemRow: {
        display: 'flex', padding: '4px 0', borderBottom: '1px dotted #eee',
    },
    totalsSection: { padding: '4px 0' },
    totalRow: {
        display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#444',
    },
    grandTotal: {
        display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800,
        padding: '6px 0', color: '#111',
    },
    paymentMethod: {
        display: 'flex', justifyContent: 'space-between', fontSize: 12,
        padding: '4px 0', color: '#555',
    },
    footer: { padding: '8px 0' },
    barcode: {
        display: 'flex', justifyContent: 'center', gap: 1, marginTop: 12, padding: '4px 0',
    },
};
