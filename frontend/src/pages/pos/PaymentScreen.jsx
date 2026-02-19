/**
 * Payment Screen — Full payment flow with Lightspeed parity
 * Features: Cash, Card, Gift Card, Tab, Split (Equal/By Seat/Custom),
 *           Tips, Discounts, Partial Pay, Change, Unfinalize
 */
import React, { useState, useMemo } from 'react';
import { X, CreditCard, Banknote, Gift, Bookmark, Scissors, Percent, RotateCcw, Users } from 'lucide-react';

const s = {
    overlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'stretch', justifyContent: 'stretch', zIndex: 1200,
    },
    container: {
        flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#111',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: '1px solid #333',
    },
    title: { fontSize: 20, fontWeight: 700, color: '#fff' },
    headerActions: { display: 'flex', alignItems: 'center', gap: 8 },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4 },
    unfinalizeBtn: {
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
        borderRadius: 8, border: '1px solid #F4A261', backgroundColor: 'transparent',
        color: '#F4A261', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    },
    body: { flex: 1, display: 'flex', overflow: 'hidden' },
    /* Left: Order summary */
    orderSummary: {
        width: 360, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column',
        backgroundColor: '#0a0a0a',
    },
    summaryHeader: {
        padding: '16px 20px', borderBottom: '1px solid #222',
        fontSize: 14, fontWeight: 700, color: '#fff',
    },
    summaryItems: { flex: 1, overflowY: 'auto', padding: '8px 16px' },
    summaryItem: {
        display: 'flex', justifyContent: 'space-between', padding: '6px 0',
        borderBottom: '1px solid #1a1a1a', fontSize: 13, color: '#ccc',
    },
    summaryTotal: {
        padding: '16px 20px', borderTop: '1px solid #333',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    },
    totalLabel: { fontSize: 14, color: '#888' },
    totalAmount: { fontSize: 32, fontWeight: 800, color: '#fff' },
    /* Right: Payment methods */
    paymentMethods: { flex: 1, display: 'flex', flexDirection: 'column', padding: 24, overflowY: 'auto' },
    methodGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 },
    methodBtn: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '24px 12px', borderRadius: 12, border: '2px solid #333',
        backgroundColor: '#1a1a1a', cursor: 'pointer', transition: 'all 0.15s',
    },
    methodLabel: { fontSize: 13, fontWeight: 600, color: '#fff' },
    /* Tip section */
    tipSection: { marginBottom: 24 },
    tipLabel: { fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 8 },
    tipGrid: { display: 'flex', gap: 8 },
    tipBtn: {
        flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #333',
        backgroundColor: 'transparent', color: '#fff', fontSize: 14, fontWeight: 600,
        cursor: 'pointer', textAlign: 'center',
    },
    tipBtnActive: {
        flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
        backgroundColor: '#2A9D8F', color: '#fff', fontSize: 14, fontWeight: 700,
        cursor: 'pointer', textAlign: 'center',
    },
    /* Discount section */
    discountSection: { marginBottom: 24 },
    discountBtn: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        borderRadius: 8, border: '1px solid #333', backgroundColor: 'transparent',
        color: '#fff', cursor: 'pointer', fontSize: 14, width: '100%',
    },
    /* Split */
    splitSection: { marginBottom: 24 },
    splitGrid: { display: 'flex', gap: 8 },
    splitBtn: {
        flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #333',
        backgroundColor: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', textAlign: 'center',
    },
    /* Change */
    changeSection: {
        backgroundColor: '#1a2a1a', borderRadius: 12, padding: 20, textAlign: 'center',
        marginBottom: 24,
    },
    changeLabel: { fontSize: 14, color: '#4ade80', fontWeight: 600 },
    changeAmount: { fontSize: 36, fontWeight: 800, color: '#4ade80', marginTop: 4 },
    /* Confirm button */
    confirmBtn: {
        padding: '16px 0', borderRadius: 12, border: 'none',
        backgroundColor: '#2A9D8F', color: '#fff', fontSize: 18, fontWeight: 700,
        cursor: 'pointer', width: '100%', marginTop: 'auto',
    },
    /* Custom amount input */
    customInput: {
        width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: 8,
        padding: '12px 16px', color: '#fff', fontSize: 20, fontWeight: 700, textAlign: 'right',
        outline: 'none', marginBottom: 16, boxSizing: 'border-box',
    },
    /* Seat split cards */
    seatCard: {
        padding: '12px 16px', borderRadius: 10, border: '1px solid #333',
        backgroundColor: '#1a1a1a', marginBottom: 8,
    },
    seatHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8,
    },
    seatTitle: { fontSize: 14, fontWeight: 700, color: '#fff' },
    seatTotal: { fontSize: 16, fontWeight: 800, color: '#F4A261' },
    seatItem: {
        display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', padding: '2px 0',
    },
    seatPayBtn: {
        marginTop: 8, padding: '8px 0', borderRadius: 6, border: '1px solid #2A9D8F',
        backgroundColor: 'transparent', color: '#2A9D8F', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', width: '100%', textAlign: 'center',
    },
    seatPaid: {
        marginTop: 8, padding: '8px 0', borderRadius: 6, border: 'none',
        backgroundColor: '#4ade8022', color: '#4ade80', fontSize: 12, fontWeight: 700,
        width: '100%', textAlign: 'center',
    },
    /* Equal split input */
    equalSplitRow: {
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
    },
    equalSplitLabel: { fontSize: 13, color: '#888', fontWeight: 600 },
    equalSplitInput: {
        width: 60, backgroundColor: '#000', border: '1px solid #333', borderRadius: 8,
        padding: '8px 12px', color: '#fff', fontSize: 18, fontWeight: 700, textAlign: 'center',
        outline: 'none',
    },
    equalSplitAmount: {
        fontSize: 20, fontWeight: 800, color: '#2A9D8F',
    },
};

const TIP_OPTIONS = [0, 5, 10, 15, 20];
const METHODS = [
    { key: 'CASH', icon: Banknote, label: 'Cash', color: '#4ade80' },
    { key: 'CARD', icon: CreditCard, label: 'Card', color: '#5B8DEF' },
    { key: 'GIFT_CARD', icon: Gift, label: 'Gift Card', color: '#C77DBA' },
    { key: 'TAB', icon: Bookmark, label: 'Customer Tab', color: '#F4A261' },
    { key: 'SPLIT', icon: Scissors, label: 'Split Bill', color: '#2A9D8F' },
    { key: 'PARTIAL', icon: Percent, label: 'Partial Pay', color: '#E05A33' },
];

export default function PaymentScreen({ order, items, orderTotal, onPay, onClose, onUnfinalize }) {
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [tipPercent, setTipPercent] = useState(0);
    const [customTip, setCustomTip] = useState('');
    const [customAmount, setCustomAmount] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [splitWay, setSplitWay] = useState(null); // null, 'equal', 'seat', 'custom'
    const [showChange, setShowChange] = useState(false);
    const [equalSplitCount, setEqualSplitCount] = useState(2);
    const [paidSeats, setPaidSeats] = useState(new Set());
    const [giftCardCode, setGiftCardCode] = useState('');
    const [giftCardBalance, setGiftCardBalance] = useState(null);
    const [giftCardChecking, setGiftCardChecking] = useState(false);

    const tipAmount = customTip ? parseFloat(customTip) || 0 : (orderTotal * tipPercent) / 100;
    const finalTotal = orderTotal + tipAmount - discountAmount;
    const paidAmount = parseFloat(customAmount) || finalTotal;
    const changeAmount = Math.max(0, paidAmount - finalTotal);

    /* ─── Group items by seat for "Split by Seat" ──────────────── */
    const seatGroups = useMemo(() => {
        const groups = {};
        (items || []).forEach(item => {
            const seat = item.seat || 1;
            if (!groups[seat]) groups[seat] = { items: [], total: 0 };
            const itemTotal = (item.unit_price || item.price || 0) * (item.qty || 1);
            groups[seat].items.push(item);
            groups[seat].total += itemTotal;
        });
        return groups;
    }, [items]);

    const seatNumbers = Object.keys(seatGroups).map(Number).sort();

    /* ─── Equal Split calculation ──────────────────────────────── */
    const perPersonAmount = equalSplitCount > 0 ? finalTotal / equalSplitCount : finalTotal;

    /* ─── Handle Unfinalize ────────────────────────────────────── */
    const handleUnfinalize = () => {
        if (onUnfinalize) {
            onUnfinalize(order);
        }
        onClose();
    };

    const handlePay = () => {
        if (!selectedMethod) return;
        if (selectedMethod === 'CASH' && paidAmount >= finalTotal) {
            setShowChange(true);
            setTimeout(() => {
                onPay({
                    tender_type: selectedMethod,
                    amount: finalTotal,
                    tip: tipAmount,
                    discount: discountAmount,
                    paid: paidAmount,
                    change: changeAmount,
                    split: splitWay,
                    splitCount: splitWay === 'equal' ? equalSplitCount : null,
                });
            }, 2000);
            return;
        }
        onPay({
            tender_type: selectedMethod,
            amount: finalTotal,
            tip: tipAmount,
            discount: discountAmount,
            split: splitWay,
            splitCount: splitWay === 'equal' ? equalSplitCount : null,
            paidSeats: splitWay === 'seat' ? [...paidSeats] : null,
        });
    };

    const handlePaySeat = (seatNum) => {
        setPaidSeats(prev => {
            const next = new Set(prev);
            next.add(seatNum);
            return next;
        });
    };

    /* ─── Render order summary with seat grouping ──────────────── */
    const renderSummaryItems = () => {
        if (splitWay === 'seat') {
            return seatNumbers.map(seat => (
                <div key={seat} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#2A9D8F', padding: '4px 0', borderBottom: '1px solid #222' }}>
                        Seat {seat} — €{seatGroups[seat].total.toFixed(2)}
                        {paidSeats.has(seat) && <span style={{ marginLeft: 8, color: '#4ade80' }}>✓ PAID</span>}
                    </div>
                    {seatGroups[seat].items.map((item, idx) => (
                        <div key={item.id || idx} style={s.summaryItem}>
                            <span>{item.qty || 1}x {item.menu_item_name || item.name}</span>
                            <span>€{((item.unit_price || item.price || 0) * (item.qty || 1)).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            ));
        }
        return (items || []).map((item, idx) => (
            <div key={item.id || idx} style={s.summaryItem}>
                <span>{item.qty || 1}x {item.menu_item_name || item.name}</span>
                <span>€{((item.unit_price || item.price || 0) * (item.qty || 1)).toFixed(2)}</span>
            </div>
        ));
    };

    return (
        <div style={s.overlay} onClick={onClose}>
            <div style={s.container} onClick={e => e.stopPropagation()}>
                <div style={s.header}>
                    <span style={s.title}>Payment</span>
                    <div style={s.headerActions}>
                        {onUnfinalize && order?.status === 'finalized' && (
                            <button style={s.unfinalizeBtn} onClick={handleUnfinalize}>
                                <RotateCcw size={14} />
                                Unfinalize
                            </button>
                        )}
                        <button style={s.closeBtn} onClick={onClose}>
                            <X size={22} color="#888" />
                        </button>
                    </div>
                </div>
                <div style={s.body}>
                    {/* Left: Order Summary */}
                    <div style={s.orderSummary}>
                        <div style={s.summaryHeader}>
                            Order Summary
                            {splitWay === 'seat' && <span style={{ float: 'right', fontSize: 11, color: '#2A9D8F' }}>{seatNumbers.length} seats</span>}
                        </div>
                        <div style={s.summaryItems}>
                            {renderSummaryItems()}
                            {tipAmount > 0 && (
                                <div style={{ ...s.summaryItem, color: '#4ade80' }}>
                                    <span>Tip ({tipPercent}%)</span>
                                    <span>€{tipAmount.toFixed(2)}</span>
                                </div>
                            )}
                            {discountAmount > 0 && (
                                <div style={{ ...s.summaryItem, color: '#E05A33' }}>
                                    <span>Discount</span>
                                    <span>-€{discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                        <div style={s.summaryTotal}>
                            <span style={s.totalLabel}>Total Due</span>
                            <span style={s.totalAmount}>€{finalTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Right: Payment Methods */}
                    <div style={s.paymentMethods}>
                        {showChange ? (
                            <div style={s.changeSection}>
                                <div style={s.changeLabel}>Change Due</div>
                                <div style={s.changeAmount}>€{changeAmount.toFixed(2)}</div>
                            </div>
                        ) : (
                            <>
                                {/* Method selection */}
                                <div style={s.methodGrid}>
                                    {METHODS.map(m => {
                                        const Icon = m.icon;
                                        const isActive = selectedMethod === m.key;
                                        return (
                                            <button
                                                key={m.key}
                                                style={{
                                                    ...s.methodBtn,
                                                    borderColor: isActive ? m.color : '#333',
                                                    backgroundColor: isActive ? `${m.color}22` : '#1a1a1a',
                                                }}
                                                onClick={() => setSelectedMethod(m.key)}
                                            >
                                                <Icon size={24} color={isActive ? m.color : '#888'} />
                                                <span style={{ ...s.methodLabel, color: isActive ? m.color : '#fff' }}>
                                                    {m.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Cash: Custom amount */}
                                {selectedMethod === 'CASH' && (
                                    <input
                                        style={s.customInput}
                                        placeholder={finalTotal.toFixed(2)}
                                        value={customAmount}
                                        onChange={e => setCustomAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                    />
                                )}

                                {/* Partial: Custom amount */}
                                {selectedMethod === 'PARTIAL' && (
                                    <input
                                        style={s.customInput}
                                        placeholder="Enter partial amount…"
                                        value={customAmount}
                                        onChange={e => setCustomAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                    />
                                )}

                                {/* Gift Card: code entry + balance check */}
                                {selectedMethod === 'GIFT_CARD' && (
                                    <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#1a1020', borderRadius: 12, border: '1px solid #C77DBA40' }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#C77DBA', marginBottom: 8 }}>🎁 Gift Card Redemption</div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input
                                                style={{ ...s.customInput, flex: 1, marginBottom: 0 }}
                                                placeholder="Enter gift card code…"
                                                value={giftCardCode}
                                                onChange={e => setGiftCardCode(e.target.value.toUpperCase())}
                                                maxLength={20}
                                            />
                                            <button
                                                onClick={() => {
                                                    if (!giftCardCode) return;
                                                    setGiftCardChecking(true);
                                                    // Simulate balance check (replace with real API)
                                                    setTimeout(() => {
                                                        const mockBalance = Math.random() > 0.3 ? (Math.random() * 100 + 10).toFixed(2) : 0;
                                                        setGiftCardBalance(parseFloat(mockBalance));
                                                        setGiftCardChecking(false);
                                                    }, 800);
                                                }}
                                                disabled={giftCardChecking || !giftCardCode}
                                                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', backgroundColor: '#C77DBA', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: giftCardChecking ? 0.5 : 1, whiteSpace: 'nowrap' }}
                                            >
                                                {giftCardChecking ? '…' : 'Check'}
                                            </button>
                                        </div>
                                        {giftCardBalance !== null && (
                                            <div style={{ marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: giftCardBalance > 0 ? '#1a2a1a' : '#2a1515', border: `1px solid ${giftCardBalance > 0 ? '#2A9D8F' : '#E05A33'}` }}>
                                                {giftCardBalance > 0 ? (
                                                    <>
                                                        <div style={{ fontSize: 12, color: '#2A9D8F', fontWeight: 600 }}>✅ Card Found — Balance: €{giftCardBalance.toFixed(2)}</div>
                                                        <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                                                            {giftCardBalance >= finalTotal
                                                                ? `Full order covered. Remaining: €${(giftCardBalance - finalTotal).toFixed(2)}`
                                                                : `Partial: €${giftCardBalance.toFixed(2)} applied, remaining €${(finalTotal - giftCardBalance).toFixed(2)} to pay by other method`
                                                            }
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div style={{ fontSize: 12, color: '#E05A33', fontWeight: 600 }}>❌ Invalid card or zero balance</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tip */}
                                <div style={s.tipSection}>
                                    <div style={s.tipLabel}>TIP</div>
                                    <div style={s.tipGrid}>
                                        {TIP_OPTIONS.map(p => (
                                            <button
                                                key={p}
                                                style={tipPercent === p && !customTip ? s.tipBtnActive : s.tipBtn}
                                                onClick={() => { setTipPercent(p); setCustomTip(''); }}
                                            >
                                                {p === 0 ? 'No Tip' : `${p}%`}
                                            </button>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                        <span style={{ fontSize: 11, color: '#888' }}>Custom:</span>
                                        <input
                                            style={{ ...s.customInput, flex: 1, marginBottom: 0, fontSize: 14 }}
                                            placeholder="0.00"
                                            value={customTip}
                                            onChange={e => { setCustomTip(e.target.value.replace(/[^0-9.]/g, '')); setTipPercent(0); }}
                                        />
                                        <span style={{ fontSize: 11, color: '#888' }}>€</span>
                                    </div>
                                </div>

                                {/* Split options */}
                                {selectedMethod === 'SPLIT' && (
                                    <div style={s.splitSection}>
                                        <div style={s.tipLabel}>SPLIT METHOD</div>
                                        <div style={s.splitGrid}>
                                            <button
                                                style={{ ...s.splitBtn, ...(splitWay === 'equal' ? { backgroundColor: '#2A9D8F', borderColor: '#2A9D8F' } : {}) }}
                                                onClick={() => setSplitWay('equal')}
                                            >Equal Split</button>
                                            <button
                                                style={{ ...s.splitBtn, ...(splitWay === 'seat' ? { backgroundColor: '#2A9D8F', borderColor: '#2A9D8F' } : {}) }}
                                                onClick={() => setSplitWay('seat')}
                                            >
                                                <Users size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                                By Seat
                                            </button>
                                            <button
                                                style={{ ...s.splitBtn, ...(splitWay === 'custom' ? { backgroundColor: '#2A9D8F', borderColor: '#2A9D8F' } : {}) }}
                                                onClick={() => setSplitWay('custom')}
                                            >Custom</button>
                                        </div>

                                        {/* Equal Split Details */}
                                        {splitWay === 'equal' && (
                                            <div style={{ marginTop: 16 }}>
                                                <div style={s.equalSplitRow}>
                                                    <span style={s.equalSplitLabel}>Split between</span>
                                                    <button style={{ ...s.splitBtn, width: 36, flex: 'none', padding: '6px 0' }} onClick={() => setEqualSplitCount(Math.max(2, equalSplitCount - 1))}>−</button>
                                                    <input
                                                        style={s.equalSplitInput}
                                                        value={equalSplitCount}
                                                        onChange={e => setEqualSplitCount(Math.max(2, parseInt(e.target.value) || 2))}
                                                        type="number"
                                                        min={2}
                                                    />
                                                    <button style={{ ...s.splitBtn, width: 36, flex: 'none', padding: '6px 0' }} onClick={() => setEqualSplitCount(equalSplitCount + 1)}>+</button>
                                                    <span style={s.equalSplitLabel}>guests</span>
                                                </div>
                                                <div style={{ textAlign: 'center', padding: '16px 0', backgroundColor: '#0a1a1a', borderRadius: 10, border: '1px solid #2A9D8F33' }}>
                                                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Each person pays</div>
                                                    <div style={s.equalSplitAmount}>€{perPersonAmount.toFixed(2)}</div>
                                                    <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>€{finalTotal.toFixed(2)} ÷ {equalSplitCount} guests</div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Split by Seat Details */}
                                        {splitWay === 'seat' && (
                                            <div style={{ marginTop: 16 }}>
                                                {seatNumbers.length > 1 ? seatNumbers.map(seat => (
                                                    <div key={seat} style={s.seatCard}>
                                                        <div style={s.seatHeader}>
                                                            <span style={s.seatTitle}>Seat {seat}</span>
                                                            <span style={s.seatTotal}>€{seatGroups[seat].total.toFixed(2)}</span>
                                                        </div>
                                                        {seatGroups[seat].items.map((item, idx) => (
                                                            <div key={item.id || idx} style={s.seatItem}>
                                                                <span>{item.qty || 1}x {item.menu_item_name || item.name}</span>
                                                                <span>€{((item.unit_price || item.price || 0) * (item.qty || 1)).toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                        {paidSeats.has(seat) ? (
                                                            <div style={s.seatPaid}>✓ Paid</div>
                                                        ) : (
                                                            <button style={s.seatPayBtn} onClick={() => handlePaySeat(seat)}>
                                                                Pay Seat {seat} — €{seatGroups[seat].total.toFixed(2)}
                                                            </button>
                                                        )}
                                                    </div>
                                                )) : (
                                                    <div style={{ textAlign: 'center', padding: 24, color: '#666', fontSize: 13 }}>
                                                        All items are on Seat 1. Assign items to different seats for per-seat billing.
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Custom Split — input amount */}
                                        {splitWay === 'custom' && (
                                            <div style={{ marginTop: 16 }}>
                                                <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Enter amount for this payment:</div>
                                                <input
                                                    style={s.customInput}
                                                    placeholder="0.00"
                                                    value={customAmount}
                                                    onChange={e => setCustomAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                                />
                                                <div style={{ fontSize: 12, color: '#555' }}>
                                                    Remaining: €{(finalTotal - (parseFloat(customAmount) || 0)).toFixed(2)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Discount */}
                                <div style={s.discountSection}>
                                    <button style={s.discountBtn} onClick={() => setDiscountAmount(prev => prev > 0 ? 0 : Math.round(finalTotal * 0.1 * 100) / 100)}>
                                        <Percent size={16} color="#888" />
                                        <span>{discountAmount > 0 ? `Discount: -€${discountAmount.toFixed(2)}` : 'Apply Discount'}</span>
                                    </button>
                                </div>

                                {/* Pay button */}
                                <button
                                    style={{
                                        ...s.confirmBtn,
                                        opacity: selectedMethod ? 1 : 0.5,
                                        cursor: selectedMethod ? 'pointer' : 'not-allowed',
                                    }}
                                    onClick={handlePay}
                                    disabled={!selectedMethod}
                                >
                                    {selectedMethod === 'TAB' ? 'Charge to Tab' :
                                        selectedMethod === 'PARTIAL' ? `Pay €${(parseFloat(customAmount) || 0).toFixed(2)}` :
                                            splitWay === 'equal' ? `Pay €${perPersonAmount.toFixed(2)} per person` :
                                                splitWay === 'seat' ? `Finalize (${paidSeats.size}/${seatNumbers.length} seats paid)` :
                                                    `Pay €${finalTotal.toFixed(2)}`}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
