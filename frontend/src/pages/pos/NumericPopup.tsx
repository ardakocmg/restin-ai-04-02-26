/**
 * POS Numeric Popup — Used for Quantity, Price, PLU entry
 * Reusable numeric keypad component for L-Series POS
 */
import React, { useState } from 'react';

interface NumericPopupProps {
    title: string;
    subtitle?: string;
    onConfirm: (value: number) => void;
    onCancel: () => void;
    prefix?: string;
    allowDecimal?: boolean;
}

const s: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
    },
    modal: {
        backgroundColor: '#1a1a1a', borderRadius: 12, padding: 24, minWidth: 320,
        border: '1px solid #333',
    },
    title: { fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4, textAlign: 'center' },
    subtitle: { fontSize: 12, color: '#888', marginBottom: 16, textAlign: 'center' },
    display: {
        backgroundColor: '#000', borderRadius: 8, padding: '12px 16px', marginBottom: 16,
        textAlign: 'right', fontSize: 28, fontWeight: 800, color: '#2A9D8F', minHeight: 48,
        border: '1px solid #333',
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 },
    key: {
        padding: '14px 0', borderRadius: 8, border: 'none', fontSize: 20, fontWeight: 700,
        cursor: 'pointer', backgroundColor: '#333', color: '#fff', textAlign: 'center',
    },
    keySpecial: {
        padding: '14px 0', borderRadius: 8, border: 'none', fontSize: 16, fontWeight: 700,
        cursor: 'pointer', backgroundColor: '#E05A33', color: '#fff', textAlign: 'center',
    },
    actions: { display: 'flex', gap: 8, marginTop: 12 },
    cancelBtn: {
        flex: 1, padding: '12px 0', borderRadius: 8, border: '1px solid #555',
        background: 'none', color: '#888', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    },
    confirmBtn: {
        flex: 1, padding: '12px 0', borderRadius: 8, border: 'none',
        backgroundColor: '#2A9D8F', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    },
};

export default function NumericPopup({ title, subtitle, onConfirm, onCancel, prefix = '', allowDecimal = false }: NumericPopupProps) {
    const [value, setValue] = useState('');

    const handleKey = (k: string): void => {
        if (k === 'C') { setValue(''); return; }
        if (k === '⌫') { setValue(v => v.slice(0, -1)); return; }
        if (k === '.' && !allowDecimal) return;
        if (k === '.' && value.includes('.')) return;
        setValue(v => v + k);
    };

    const handleConfirm = (): void => {
        const num = parseFloat(value) || 0;
        if (num > 0) onConfirm(num);
    };

    return (
        <div style={s.overlay} onClick={onCancel}>
            <div style={s.modal} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <div style={s.title}>{title}</div>
                {subtitle && <div style={s.subtitle}>{subtitle}</div>}
                <div style={s.display}>{prefix}{value || '0'}</div>
                <div style={s.grid}>
                    {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(k => (
                        <button key={k} style={s.key} onClick={() => handleKey(k)}>{k}</button>
                    ))}
                    <button style={s.key} onClick={() => handleKey('C')}>C</button>
                    <button style={s.key} onClick={() => handleKey('0')}>0</button>
                    <button style={s.key} onClick={() => handleKey(allowDecimal ? '.' : '⌫')}>
                        {allowDecimal ? '.' : '⌫'}
                    </button>
                </div>
                <div style={s.actions}>
                    <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
                    <button style={s.confirmBtn} onClick={handleConfirm}>Confirm</button>
                </div>
            </div>
        </div>
    );
}
