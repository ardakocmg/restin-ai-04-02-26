/**
 * Item Options Menu — Touch-and-hold popup for order items
 * Phase 3: Cancel, Void, Modifiers, Transfer, Notes, Course Edit, Split
 */
import React from 'react';

const s = {
    overlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
    },
    menu: {
        backgroundColor: '#1a1a1a', borderRadius: 12, padding: 8, minWidth: 280,
        border: '1px solid #333', maxHeight: '80vh', overflowY: 'auto' as const,
    },
    header: {
        padding: '12px 16px', borderBottom: '1px solid #333',
        fontSize: 14, fontWeight: 700, color: '#fff',
    },
    headerSub: { fontSize: 11, color: '#888', marginTop: 2 },
    option: {
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '12px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
        backgroundColor: 'transparent', color: '#fff', fontSize: 14, textAlign: 'left' as const,
    },
    optionIcon: { fontSize: 18, minWidth: 24, textAlign: 'center' as const },
    divider: { height: 1, backgroundColor: '#333', margin: '4px 16px' },
    danger: { color: '#E05A33' },
} as const;

const OPTIONS = [
    { key: 'modifiers', icon: '🔧', label: 'Edit Modifiers', danger: false },
    { key: 'notes', icon: '📝', label: 'Add Note / Instructions', danger: false },
    { key: 'quantity', icon: '🔢', label: 'Change Quantity', danger: false },
    { key: 'price', icon: '💰', label: 'Override Price', danger: false },
    { key: 'course', icon: '📋', label: 'Move to Course...', danger: false },
    { key: 'seat', icon: '💺', label: 'Move to Seat...', danger: false },
    { key: 'hold', icon: '⏸️', label: 'Hold Item', danger: false },
    { key: 'rush', icon: '🔥', label: 'Rush Item', danger: false },
    { key: 'split', icon: '✂️', label: 'Split Item', danger: false },
    { key: 'transfer', icon: '↗️', label: 'Transfer to Table...', danger: false },
    { key: 'repeat', icon: '🔁', label: 'Repeat Last Item', danger: false },
    { key: 'divider' },
    { key: 'void', icon: '🗑️', label: 'Void / Remove', danger: true },
    { key: 'stock86', icon: '🚫', label: '86 — Out of Stock', danger: true },
];

export default function ItemOptionsMenu({ item, onAction, onClose }) {
    if (!item) return null;

    return (
        <div style={s.overlay} onClick={onClose}>
            <div style={s.menu} onClick={e => e.stopPropagation()}>
                <div style={s.header}>
                    {item.menu_item_name || item.name}
                    <div style={s.headerSub}>
                        Qty: {item.qty || 1} · Seat {item.seat || 1} · Course {item.course || 1}
                    </div>
                </div>
                {OPTIONS.map(opt => {
                    if (opt.key === 'divider') return <div key="div" style={s.divider} />;
                    return (
                        <button
                            key={opt.key}
                            style={{ ...s.option, ...(opt.danger ? s.danger : {}) }} /* keep-inline */
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#333'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            onClick={() => onAction(opt.key, item)}
                        >
                            <span style={s.optionIcon}>{opt.icon}</span>
                            <span>{opt.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
