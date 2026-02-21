/**
 * Customer Modal — Assign/search/create customer for order
 * Phase 7: Customers & Seats
 */
import React, { useState } from 'react';
import { X, UserPlus, Search } from 'lucide-react';

/* ===== Types ===== */

interface Customer {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
}

interface CustomerModalProps {
    customers: Customer[];
    onSelect: (customer: Customer) => void;
    onCreate: (customer: { name: string; email: string; phone: string }) => void;
    onClose: () => void;
}

/* ===== Styles ===== */

const s: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
    },
    modal: {
        backgroundColor: '#1a1a1a', borderRadius: 12, width: 440, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', border: '1px solid #333',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid #333',
    },
    title: { fontSize: 16, fontWeight: 700, color: '#fff' },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4 },
    searchBar: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
        borderBottom: '1px solid #333',
    },
    input: {
        flex: 1, backgroundColor: '#000', border: '1px solid #333', borderRadius: 8,
        padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none',
    },
    body: { flex: 1, overflowY: 'auto', padding: 4 },
    customerRow: {
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '12px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
        backgroundColor: 'transparent', color: '#fff', textAlign: 'left' as const,
    },
    avatar: {
        width: 36, height: 36, borderRadius: '50%', backgroundColor: '#333',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: '#888',
    },
    custName: { fontSize: 14, fontWeight: 500 },
    custMeta: { fontSize: 12, color: '#888' },
    createBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        margin: '12px 16px', padding: '12px 0', borderRadius: 8,
        backgroundColor: '#2A9D8F', color: '#fff', border: 'none', cursor: 'pointer',
        fontSize: 14, fontWeight: 700,
    },
    empty: { textAlign: 'center', color: '#666', padding: 40, fontSize: 13 },
    formGroup: { padding: '0 16px', marginBottom: 12 },
    label: { fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 4, display: 'block' },
    formInput: {
        width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: 8,
        padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
    },
};

export default function CustomerModal({ customers, onSelect, onCreate, onClose }: CustomerModalProps) {
    const [query, setQuery] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPhone, setNewPhone] = useState('');

    const filtered = query
        ? (customers || []).filter((c: Customer) =>
            c.name?.toLowerCase().includes(query.toLowerCase()) ||
            c.email?.toLowerCase().includes(query.toLowerCase()) ||
            c.phone?.includes(query)
        )
        : (customers || []);

    const handleCreate = () => {
        if (!newName.trim()) return;
        onCreate({ name: newName, email: newEmail, phone: newPhone });
        onClose();
    };

    return (
        <div style={s.overlay} onClick={onClose}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
                <div style={s.header}>
                    <span style={s.title}>{showCreate ? 'New Customer' : 'Assign Customer'}</span>
                    <button style={s.closeBtn} onClick={onClose} title="Close customer modal">
                        <X size={18} color="#888" />
                    </button>
                </div>

                {showCreate ? (
                    <div style={{ padding: '16px 0' }}>
                        <div style={s.formGroup}>
                            <label style={s.label}>Name *</label>
                            <input style={s.formInput} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" />
                        </div>
                        <div style={s.formGroup}>
                            <label style={s.label}>Email</label>
                            <input style={s.formInput} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" />
                        </div>
                        <div style={s.formGroup}>
                            <label style={s.label}>Phone</label>
                            <input style={s.formInput} value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone" />
                        </div>
                        <button style={s.createBtn} onClick={handleCreate}>
                            <UserPlus size={16} /> Create & Assign
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={s.searchBar}>
                            <Search size={16} color="#888" />
                            <input aria-label="Input"
                                style={s.input}
                                placeholder="Search customers..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                
                            />
                        </div>
                        <div style={s.body}>
                            {filtered.length === 0 ? (
                                <div style={s.empty}>{"No "}customers found</div>
                            ) : (
                                filtered.slice(0, 20).map((c: Customer, idx: number) => (
                                    <button
                                        key={c.id || idx}
                                        style={s.customerRow}
                                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#333'; }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        onClick={() => { onSelect(c); onClose(); }}
                                    >
                                        <div style={s.avatar}>{(c.name || '?').charAt(0).toUpperCase()}</div>
                                        <div>
                                            <div style={s.custName}>{c.name}</div>
                                            <div style={s.custMeta}>{c.email || c.phone || 'No contact'}</div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <button style={s.createBtn} onClick={() => setShowCreate(true)}>
                            <UserPlus size={16} /> New Customer
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
