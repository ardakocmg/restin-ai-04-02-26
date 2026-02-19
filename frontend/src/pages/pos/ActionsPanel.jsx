/**
 * Actions Panel — Slide-out panel for Transfer, Send selective, Table Merge
 * Phase 5: Actions Panel
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';

const s = {
    overlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', justifyContent: 'flex-end', zIndex: 1100,
    },
    panel: {
        width: 360, height: '100%', backgroundColor: '#1a1a1a',
        borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid #333',
    },
    title: { fontSize: 18, fontWeight: 700, color: '#fff' },
    closeBtn: {
        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
    },
    body: { flex: 1, overflowY: 'auto', padding: 8 },
    section: { marginBottom: 16 },
    sectionTitle: {
        fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase',
        padding: '8px 12px', letterSpacing: 0.5,
    },
    actionBtn: {
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '14px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
        backgroundColor: 'transparent', color: '#fff', fontSize: 14, textAlign: 'left',
    },
    actionIcon: { fontSize: 20, minWidth: 28, textAlign: 'center' },
    actionLabel: { flex: 1 },
    actionDesc: { fontSize: 11, color: '#666' },
    tableGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: '8px 12px' },
    tableBtn: {
        padding: '12px 0', borderRadius: 8, border: '1px solid #333', backgroundColor: '#222',
        color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'center', cursor: 'pointer',
    },
    tableBtnActive: {
        padding: '12px 0', borderRadius: 8, border: 'none', backgroundColor: '#2A9D8F',
        color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'center', cursor: 'pointer',
    },
};

const ACTIONS = [
    {
        section: 'Order Actions', items: [
            { key: 'transferReceipt', icon: '📋', label: 'Transfer Receipt', desc: 'Move order to another table' },
            { key: 'transferItems', icon: '↗️', label: 'Transfer Items', desc: 'Move specific items to another order' },
            { key: 'mergeTable', icon: '🔗', label: 'Merge Tables', desc: 'Combine two tables into one order' },
        ]
    },
    {
        section: 'Kitchen & Bar', items: [
            { key: 'sendKitchen', icon: '👨‍🍳', label: 'Send to Kitchen', desc: 'Send selected items to kitchen' },
            { key: 'sendBar', icon: '🍸', label: 'Send to Bar', desc: 'Send selected items to bar' },
            { key: 'fireCourse', icon: '🔥', label: 'Fire Next Course', desc: 'Notify kitchen to start next course' },
        ]
    },
    {
        section: 'Customer', items: [
            { key: 'assignCustomer', icon: '👤', label: 'Assign Customer', desc: 'Link a customer profile' },
            { key: 'addCovers', icon: '👥', label: 'Set Covers', desc: 'Number of guests at table' },
        ]
    },
    {
        section: 'Receipts', items: [
            { key: 'printReceipt', icon: '🖨️', label: 'Print Receipt', desc: 'Print current receipt' },
            { key: 'voidReceipt', icon: '🗑️', label: 'Void Receipt', desc: 'Void this entire order' },
        ]
    },
];

export default function ActionsPanel({ order, tables, onAction, onClose }) {
    const [showTablePicker, setShowTablePicker] = useState(false);
    const [transferTarget, setTransferTarget] = useState(null);

    const handleAction = (key) => {
        if (key === 'transferReceipt' || key === 'mergeTable') {
            setShowTablePicker(key);
            return;
        }
        onAction(key);
    };

    const handleTableSelect = (table) => {
        setTransferTarget(table);
        onAction(showTablePicker, { targetTable: table });
        setShowTablePicker(false);
    };

    return (
        <div style={s.overlay} onClick={onClose}>
            <div style={s.panel} onClick={e => e.stopPropagation()}>
                <div style={s.header}>
                    <span style={s.title}>Actions</span>
                    <button style={s.closeBtn} onClick={onClose}>
                        <X size={20} color="#888" />
                    </button>
                </div>
                <div style={s.body}>
                    {showTablePicker ? (
                        <div>
                            <div style={s.sectionTitle}>
                                {showTablePicker === 'transferReceipt' ? 'Transfer to Table' : 'Merge with Table'}
                            </div>
                            <div style={s.tableGrid}>
                                {(tables || []).map(t => (
                                    <button
                                        key={t.id}
                                        style={transferTarget?.id === t.id ? s.tableBtnActive : s.tableBtn}
                                        onClick={() => handleTableSelect(t)}
                                    >
                                        {t.name || `T${t.number || t.id}`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        ACTIONS.map(section => (
                            <div key={section.section} style={s.section}>
                                <div style={s.sectionTitle}>{section.section}</div>
                                {section.items.map(item => (
                                    <button
                                        key={item.key}
                                        style={s.actionBtn}
                                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#333'; }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        onClick={() => handleAction(item.key)}
                                    >
                                        <span style={s.actionIcon}>{item.icon}</span>
                                        <div style={s.actionLabel}>
                                            <div>{item.label}</div>
                                            <div style={s.actionDesc}>{item.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
