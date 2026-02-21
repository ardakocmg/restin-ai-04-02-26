/**
 * Search Modal — Product search by name
 * Phase 6: PLU / Search
 */
import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchItem {
    id?: string;
    name?: string;
    sku?: string;
    code?: string;
    category_name?: string;
    sell_price?: number;
    price?: number;
}

interface SearchModalProps {
    allItems: SearchItem[];
    onSelect: (item: SearchItem) => void;
    onClose: () => void;
}

const s: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 80, zIndex: 1100,
    },
    modal: {
        backgroundColor: '#1a1a1a', borderRadius: 12, width: 520, maxHeight: '70vh',
        display: 'flex', flexDirection: 'column', border: '1px solid #333',
    },
    searchBar: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
        borderBottom: '1px solid #333',
    },
    input: {
        flex: 1, backgroundColor: '#000', border: '1px solid #333', borderRadius: 8,
        padding: '10px 12px', color: '#fff', fontSize: 15, outline: 'none',
    },
    closeBtn: {
        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
    },
    results: { flex: 1, overflowY: 'auto', padding: 4 },
    resultItem: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 6, cursor: 'pointer', border: 'none',
        width: '100%', backgroundColor: 'transparent', color: '#fff', textAlign: 'left',
    },
    resultName: { fontSize: 14, fontWeight: 500 },
    resultMeta: { fontSize: 12, color: '#888' },
    resultPrice: { fontSize: 14, fontWeight: 700, color: '#2A9D8F' },
    empty: { textAlign: 'center', color: '#666', padding: 40, fontSize: 13 },
};

export default function SearchModal({ allItems, onSelect, onClose }: SearchModalProps) {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const filtered = query.length > 0
        ? (allItems || []).filter((i: SearchItem) =>
            i.name?.toLowerCase().includes(query.toLowerCase()) ||
            i.sku?.toLowerCase().includes(query.toLowerCase()) ||
            i.code?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 20)
        : [];

    return (
        <div style={s.overlay} onClick={onClose}>
            <div style={s.modal} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <div style={s.searchBar}>
                    <Search size={18} color="#888" />
                    <input
                        ref={inputRef}
                        style={s.input}
                        placeholder="Search products by name or code..."
                        value={query}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                    />
                    <button style={s.closeBtn} onClick={onClose}>
                        <X size={18} color="#888" />
                    </button>
                </div>
                <div style={s.results}>
                    {query.length === 0 ? (
                        <div style={s.empty}>Start typing to search products</div>
                    ) : filtered.length === 0 ? (
                        <div style={s.empty}>{"No "}products found for &quot;{query}&quot;</div>
                    ) : (
                        filtered.map((item: SearchItem, idx: number) => (
                            <button
                                key={item.id || idx}
                                style={s.resultItem}
                                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = '#333'; }}
                                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                onClick={() => { onSelect(item); onClose(); }}
                            >
                                <div>
                                    <div style={s.resultName}>{item.name}</div>
                                    <div style={s.resultMeta}>
                                        {item.sku || item.code || ''} · {item.category_name || ''}
                                    </div>
                                </div>
                                <span style={s.resultPrice}>
                                    €{(item.sell_price || item.price || 0).toFixed(2)}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
