/**
 * PaymentMethods.tsx — K-Series Payment Methods
 * Add/edit cash, card, voucher payment methods + accounting references
 * Exact Lightspeed K-Series Back Office > Payment > Payment Methods parity
 */

import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Plus, Save, Edit3, Trash2, Search, X,
    CreditCard, Banknote, Wallet, QrCode, Gift, Smartphone,
    ChevronRight, Settings, Eye, EyeOff, Wifi, Hotel
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';

/* ===== Types ===== */

interface PaymentMethod {
    id: string;
    name: string;
    type: 'cash' | 'card' | 'voucher' | 'mobile' | 'account' | 'other';
    isActive: boolean;
    isDefault: boolean;
    accountingRef: string;
    opensCashDrawer: boolean;
    requiresAmount: boolean;
    allowsChange: boolean;
    allowsTips: boolean;
    printReceipt: boolean;
    autoCloseOrder: boolean;
    icon: string;
    color: string;
    sortOrder: number;
}

/* ===== Styles ===== */

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary, #0a0a0a)', color: 'var(--text-primary, #fafafa)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card, #18181b)', border: '1px solid var(--border-primary, #27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, color: 'var(--text-primary, #fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary, #09090b)', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, color: 'var(--text-primary, #fafafa)', fontSize: 14 };
const sl: React.CSSProperties = { ...ip, cursor: 'pointer' };
const rw: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' };

const ts = (a: boolean): React.CSSProperties => ({ width: 44, height: 24, borderRadius: 12, background: a ? '#3B82F6' : '#3f3f46', cursor: 'pointer', position: 'relative', flexShrink: 0 });
const td = (a: boolean): React.CSSProperties => ({ position: 'absolute', top: 2, left: a ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' });

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
    <div style={ts(value)} onClick={onChange}><div style={td(value)} /></div>
);

/* ===== Seed Data ===== */

const SEED: PaymentMethod[] = [
    { id: '1', name: 'Cash', type: 'cash', isActive: true, isDefault: true, accountingRef: '1000', opensCashDrawer: true, requiresAmount: true, allowsChange: true, allowsTips: true, printReceipt: true, autoCloseOrder: true, icon: 'banknote', color: '#10B981', sortOrder: 1 },
    { id: '2', name: 'Lightspeed Payments', type: 'card', isActive: true, isDefault: false, accountingRef: '1010', opensCashDrawer: false, requiresAmount: false, allowsChange: false, allowsTips: true, printReceipt: true, autoCloseOrder: true, icon: 'credit-card', color: '#3B82F6', sortOrder: 2 },
    { id: '3', name: 'Visa/Mastercard', type: 'card', isActive: true, isDefault: false, accountingRef: '1011', opensCashDrawer: false, requiresAmount: false, allowsChange: false, allowsTips: true, printReceipt: true, autoCloseOrder: true, icon: 'credit-card', color: '#6366F1', sortOrder: 3 },
    { id: '4', name: 'AMEX', type: 'card', isActive: true, isDefault: false, accountingRef: '1012', opensCashDrawer: false, requiresAmount: false, allowsChange: false, allowsTips: true, printReceipt: true, autoCloseOrder: true, icon: 'credit-card', color: '#0EA5E9', sortOrder: 4 },
    { id: '5', name: 'Gift Voucher', type: 'voucher', isActive: true, isDefault: false, accountingRef: '1020', opensCashDrawer: false, requiresAmount: true, allowsChange: false, allowsTips: false, printReceipt: true, autoCloseOrder: false, icon: 'gift', color: '#EC4899', sortOrder: 5 },
    { id: '6', name: 'Meal Voucher', type: 'voucher', isActive: true, isDefault: false, accountingRef: '1021', opensCashDrawer: false, requiresAmount: true, allowsChange: false, allowsTips: false, printReceipt: true, autoCloseOrder: false, icon: 'wallet', color: '#F59E0B', sortOrder: 6 },
    { id: '7', name: 'Room Charge', type: 'account', isActive: true, isDefault: false, accountingRef: '1030', opensCashDrawer: false, requiresAmount: false, allowsChange: false, allowsTips: true, printReceipt: true, autoCloseOrder: true, icon: 'hotel', color: '#C74634', sortOrder: 7 },
    { id: '8', name: 'Apple Pay / Google Pay', type: 'mobile', isActive: true, isDefault: false, accountingRef: '1015', opensCashDrawer: false, requiresAmount: false, allowsChange: false, allowsTips: true, printReceipt: true, autoCloseOrder: true, icon: 'smartphone', color: '#14B8A6', sortOrder: 8 },
    { id: '9', name: 'QR Code', type: 'other', isActive: false, isDefault: false, accountingRef: '1040', opensCashDrawer: false, requiresAmount: false, allowsChange: false, allowsTips: false, printReceipt: true, autoCloseOrder: true, icon: 'qr-code', color: '#D946EF', sortOrder: 9 },
];

const ICONS: Record<string, React.ReactNode> = {
    'banknote': <Banknote size={20} />,
    'credit-card': <CreditCard size={20} />,
    'gift': <Gift size={20} />,
    'wallet': <Wallet size={20} />,
    'smartphone': <Smartphone size={20} />,
    'qr-code': <QrCode size={20} />,
    'building': <Settings size={20} />,
    'hotel': <Hotel size={20} />,
};

/* ===== Component ===== */

const PaymentMethods: React.FC = () => {
    const navigate = useNavigate();
    const [methods, setMethods] = useState<PaymentMethod[]>(SEED);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<PaymentMethod | null>(null);
    const [isLive, setIsLive] = useState(false);

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiData } = useVenueConfig<PaymentMethod>({ venueId, configType: 'payment-methods' });
    useEffect(() => {
        if (apiData && apiData.length > 0) {
            setMethods(apiData.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (m: any) => ({ id: m.id || m._id || crypto.randomUUID(), name: m.name || '', type: m.type || 'other', isActive: m.isActive ?? m.is_active ?? true, isDefault: m.isDefault ?? m.is_default ?? false, accountingRef: m.accountingRef ?? m.accounting_ref ?? '', opensCashDrawer: m.opensCashDrawer ?? m.opens_cash_drawer ?? false, requiresAmount: m.requiresAmount ?? m.requires_amount ?? false, allowsChange: m.allowsChange ?? m.allows_change ?? false, allowsTips: m.allowsTips ?? m.allows_tips ?? false, printReceipt: m.printReceipt ?? m.print_receipt ?? true, autoCloseOrder: m.autoCloseOrder ?? m.auto_close_order ?? true, icon: m.icon || 'credit-card', color: m.color || '#3B82F6', sortOrder: m.sortOrder ?? m.sort_order ?? 0 }))); setIsLive(true);
        }
    }, [apiData]);

    const filtered = methods.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.sortOrder - b.sortOrder);
    const active = filtered.filter(m => m.isActive);
    const inactive = filtered.filter(m => !m.isActive);

    const save = () => {
        if (!editing) return;
        const exists = methods.find(m => m.id === editing.id);
        if (exists) setMethods(prev => prev.map(m => m.id === editing.id ? editing : m));
        else setMethods(prev => [...prev, editing]);
        setEditing(null);
        toast.success('Payment method saved');
    };

    const setDefault = (id: string) => {
        setMethods(prev => prev.map(m => ({ ...m, isDefault: m.id === id })));
        toast.success('Default payment method updated');
    };

    return (
        <div style={pg}>
            <div style={ct}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                        <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Payment Methods {isLive && <Wifi size={14} style={{ color: '#10B981', verticalAlign: 'middle', marginLeft: 6 }} />}</h1>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)', margin: '4px 0 0' }}>
                            Configure payment methods available on POS devices
                        </p>
                    </div>
                    <button style={bp} onClick={() => setEditing({
                        id: crypto.randomUUID(), name: '', type: 'other', isActive: true, isDefault: false, accountingRef: '', opensCashDrawer: false, requiresAmount: false, allowsChange: false, allowsTips: false, printReceipt: true, autoCloseOrder: true, icon: 'credit-card', color: '#3B82F6', sortOrder: methods.length + 1,
                    })}>
                        <Plus size={16} /> Add Payment Method
                    </button>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 20 }}>
                    <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-secondary)' }} />
                    <input style={{ ...ip, paddingLeft: 36 }} placeholder="Search payment methods..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {/* Active Methods */}
                <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary, #a1a1aa)', marginBottom: 10, letterSpacing: 0.5 }}>
                    Active Methods ({active.length})
                </div>
                <div style={cd}>
                    {active.map(method => (
                        <div key={method.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
                            onClick={() => setEditing({ ...method })}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${method.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: method.color, flexShrink: 0 }}>
                                {ICONS[method.icon] || <CreditCard size={20} />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 15, fontWeight: 600 }}>{method.name}</span>
                                    {method.isDefault && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3B82F6', fontWeight: 600 }}>DEFAULT</span>}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 12 }}>
                                    <span>{method.type.charAt(0).toUpperCase() + method.type.slice(1)}</span>
                                    {method.accountingRef && <span>Ref: {method.accountingRef}</span>}
                                    {method.opensCashDrawer && <span>Opens Drawer</span>}
                                    {method.allowsTips && <span>Tips ✓</span>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                {!method.isDefault && (
                                    <button style={{ ...bo, padding: '4px 10px', fontSize: 11 }} onClick={e => { e.stopPropagation(); setDefault(method.id); }}>
                                        Set Default
                                    </button>
                                )}
                                <button title="Edit method" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }} onClick={e => { e.stopPropagation(); setEditing({ ...method }); }}>
                                    <Edit3 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Inactive Methods */}
                {inactive.length > 0 && (
                    <>
                        <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary, #a1a1aa)', marginBottom: 10, marginTop: 24, letterSpacing: 0.5 }}>
                            Inactive Methods ({inactive.length})
                        </div>
                        <div style={cd}>
                            {inactive.map(method => (
                                <div key={method.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', opacity: 0.6 }}
                                    onClick={() => setEditing({ ...method })}>
                                    <div style={{ width: 40, height: 40, borderRadius: 8, background: `${method.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: method.color }}>
                                        {ICONS[method.icon] || <CreditCard size={18} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: 14, fontWeight: 500 }}>{method.name}</span>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{method.type}</div>
                                    </div>
                                    <button style={{ ...bo, padding: '4px 10px', fontSize: 11 }} onClick={e => {
                                        e.stopPropagation();
                                        setMethods(prev => prev.map(m => m.id === method.id ? { ...m, isActive: true } : m));
                                        toast.success(`${method.name} activated`);
                                    }}>
                                        <Eye size={12} /> Activate
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Edit Modal */}
            {editing && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
                    <div style={{ ...cd, width: 560, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                                {methods.find(m => m.id === editing.id) ? 'Edit' : 'New'} Payment Method
                            </h3>
                            <button title="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditing(null)}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name *</label>
                                <input style={ip} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Visa" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Type</label>
                                <select style={sl} value={editing.type} onChange={e => setEditing(p => p ? { ...p, type: e.target.value as PaymentMethod['type'] } : null)} aria-label="Payment type">
                                    <option value="cash">Cash</option><option value="card">Card</option><option value="voucher">Voucher</option>
                                    <option value="mobile">Mobile Payment</option><option value="account">Account Charge</option><option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Accounting Reference</label>
                                <input style={ip} value={editing.accountingRef} onChange={e => setEditing(p => p ? { ...p, accountingRef: e.target.value } : null)} placeholder="e.g. 1010" />
                            </div>
                        </div>

                        {/* Toggles */}
                        <div style={{ ...cd, background: 'var(--bg-secondary, #09090b)', padding: 16, marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: 0.5 }}>Behavior</div>
                            {[
                                { key: 'opensCashDrawer', label: 'Opens cash drawer', desc: 'Trigger cash drawer to open on payment' },
                                { key: 'requiresAmount', label: 'Requires entered amount', desc: 'Staff must enter the received amount' },
                                { key: 'allowsChange', label: 'Allows change', desc: 'Calculate and display change to give' },
                                { key: 'allowsTips', label: 'Allows tips', desc: 'Enable tip input for this method' },
                                { key: 'printReceipt', label: 'Auto-print receipt', desc: 'Print receipt after payment' },
                                { key: 'autoCloseOrder', label: 'Auto-close order', desc: 'Automatically close order after payment' },
                                { key: 'isActive', label: 'Active', desc: 'Show this method on POS' },
                            ].map(({ key, label, desc }) => (
                                <div key={key} style={rw}>
                                    <div><div style={{ fontWeight: 500, fontSize: 13 }}>{label}</div>{desc && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{desc}</div>}</div>
                                    <Toggle value={editing[key as keyof PaymentMethod] as boolean} onChange={() => setEditing(p => p ? { ...p, [key]: !(p[key as keyof PaymentMethod] as boolean) } : null)} />
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                            <button title="Delete method" style={{ ...bo, color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => {
                                setMethods(prev => prev.filter(m => m.id !== editing.id));
                                setEditing(null);
                                toast.success('Payment method deleted');
                            }}><Trash2 size={14} /></button>
                            <button style={bo} onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentMethods;
