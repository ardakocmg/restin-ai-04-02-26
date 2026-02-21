/**
 * Void Reason Modal — Select reason when voiding items/orders
 * Phase 3: Cancel/Void with reason
 */
import React, { useState } from 'react';

const REASONS = [
    'Customer changed mind',
    'Wrong item ordered',
    'Kitchen error',
    'Quality issue',
    'Out of stock (86)',
    'Manager override',
    'Other',
];

const s: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
    },
    modal: {
        backgroundColor: '#1a1a1a', borderRadius: 12, padding: 24, minWidth: 360,
        border: '1px solid #333',
    },
    title: { fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16, textAlign: 'center' as const },
    reasonBtn: {
        width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none',
        backgroundColor: '#222', color: '#fff', fontSize: 14, textAlign: 'left' as const,
        cursor: 'pointer', marginBottom: 6,
    },
    reasonBtnActive: {
        width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none',
        backgroundColor: '#2A9D8F', color: '#fff', fontSize: 14, textAlign: 'left' as const,
        cursor: 'pointer', marginBottom: 6, fontWeight: 700,
    },
    otherInput: {
        width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: 8,
        padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none',
        marginTop: 4, marginBottom: 6, boxSizing: 'border-box' as const,
    },
    actions: { display: 'flex', gap: 8, marginTop: 16 },
    cancelBtn: {
        flex: 1, padding: '12px 0', borderRadius: 8, border: '1px solid #555',
        background: 'none', color: '#888', fontSize: 14, cursor: 'pointer',
    },
    confirmBtn: {
        flex: 1, padding: '12px 0', borderRadius: 8, border: 'none',
        backgroundColor: '#E05A33', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    },
};

export default function VoidReasonModal({ itemName, onConfirm, onCancel }) {
    const [selected, setSelected] = useState(null);
    const [otherText, setOtherText] = useState('');

    const handleConfirm = () => {
        const reason = selected === 'Other' ? (otherText || 'Other') : selected;
        if (reason) onConfirm(reason);
    };

    return (
        <div style={s.overlay} onClick={onCancel}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
                <div style={s.title}>Void Reason{itemName ? `: ${itemName}` : ''}</div>
                {REASONS.map(r => (
                    <div key={r}>
                        <button
                            style={selected === r ? s.reasonBtnActive : s.reasonBtn}
                            onClick={() => setSelected(r)}
                            onMouseEnter={e => { if (selected !== r) e.currentTarget.style.backgroundColor = '#333'; }}
                            onMouseLeave={e => { if (selected !== r) e.currentTarget.style.backgroundColor = '#222'; }}
                        >
                            {r}
                        </button>
                        {selected === 'Other' && r === 'Other' && (
                            <input aria-label="Input"
                                style={s.otherInput}
                                placeholder="Describe reason..."
                                value={otherText}
                                onChange={e => setOtherText(e.target.value)}
                                autoFocus
                            />
                        )}
                    </div>
                ))}
                <div style={s.actions}>
                    <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
                    <button
                        style={{ ...s.confirmBtn, opacity: selected ? 1 : 0.5 }} /* keep-inline */ /* keep-inline */
                        onClick={handleConfirm}
                        disabled={!selected}
                    >Void Item</button>
                </div>
            </div>
        </div>
    );
}
