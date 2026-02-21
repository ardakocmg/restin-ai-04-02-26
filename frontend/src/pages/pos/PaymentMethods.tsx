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
import './pos-shared.css';

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

/* ===== Toggle ===== */

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
    <div className={`pos-toggle-track ${value ? 'pos-toggle-track--on' : 'pos-toggle-track--off'}`} onClick={onChange}>
        <div className={`pos-toggle-thumb ${value ? 'pos-toggle-thumb--on' : 'pos-toggle-thumb--off'}`} />
    </div>
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
                (m: Record<string, unknown>) => ({ id: (m.id || m._id || crypto.randomUUID()) as string, name: (m.name || '') as string, type: (m.type || 'other') as PaymentMethod['type'], isActive: (m.isActive ?? m.is_active ?? true) as boolean, isDefault: (m.isDefault ?? m.is_default ?? false) as boolean, accountingRef: (m.accountingRef ?? m.accounting_ref ?? '') as string, opensCashDrawer: (m.opensCashDrawer ?? m.opens_cash_drawer ?? false) as boolean, requiresAmount: (m.requiresAmount ?? m.requires_amount ?? false) as boolean, allowsChange: (m.allowsChange ?? m.allows_change ?? false) as boolean, allowsTips: (m.allowsTips ?? m.allows_tips ?? false) as boolean, printReceipt: (m.printReceipt ?? m.print_receipt ?? true) as boolean, autoCloseOrder: (m.autoCloseOrder ?? m.auto_close_order ?? true) as boolean, icon: (m.icon || 'credit-card') as string, color: (m.color || '#3B82F6') as string, sortOrder: (m.sortOrder ?? m.sort_order ?? 0) as number }))); setIsLive(true);
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
        <div className="pos-page">
            <div className="pos-container">
                {/* Header */}
                <div className="pos-header">
                    <div>
                        <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                        <h1 className="pos-title">Payment Methods {isLive && <Wifi size={14} className="pos-live-icon" />}</h1>
                        <p className="pos-subtitle">Configure payment methods available on POS devices</p>
                    </div>
                    <button className="pos-btn-primary" onClick={() => setEditing({
                        id: crypto.randomUUID(), name: '', type: 'other', isActive: true, isDefault: false, accountingRef: '', opensCashDrawer: false, requiresAmount: false, allowsChange: false, allowsTips: false, printReceipt: true, autoCloseOrder: true, icon: 'credit-card', color: '#3B82F6', sortOrder: methods.length + 1,
                    })}>
                        <Plus size={16} /> Add Payment Method
                    </button>
                </div>

                {/* Search */}
                <div className="pos-search-wrapper pos-mb-20">
                    <Search size={14} className="pos-search-icon" />
                    <input aria-label="Search payment methods..." className="pos-input pos-search-input" placeholder="Search payment methods..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {/* Active Methods */}
                <div className="pos-text-sm pos-text-bold pos-text-secondary pos-mb-8 uppercase tracking-wide">
                    Active Methods ({active.length})
                </div>
                <div className="pos-card">
                    {active.map(method => (
                        <div key={method.id} className="pos-flex pos-flex--center pos-gap-14 py-3.5 border-b border-white/[0.03] cursor-pointer"
                            onClick={() => setEditing({ ...method })}>
                            {/* keep-inline: dynamic background/color from user-configurable method.color */}
                            <div className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${method.color}15`, color: method.color }}>
                                {ICONS[method.icon] || <CreditCard size={20} />}
                            </div>
                            <div className="flex-1">
                                <div className="pos-flex pos-flex--center pos-gap-8">
                                    <span className="text-[15px] font-semibold">{method.name}</span>
                                    {method.isDefault && <span className="pos-badge pos-badge--blue text-[10px] font-semibold">DEFAULT</span>}
                                </div>
                                <div className="pos-cell-secondary pos-flex pos-gap-12 mt-0.5">
                                    <span>{method.type.charAt(0).toUpperCase() + method.type.slice(1)}</span>
                                    {method.accountingRef && <span>Ref: {method.accountingRef}</span>}
                                    {method.opensCashDrawer && <span>Opens Drawer</span>}
                                    {method.allowsTips && <span>Tips ✓</span>}
                                </div>
                            </div>
                            <div className="pos-flex pos-gap-6 shrink-0">
                                {!method.isDefault && (
                                    <button className="pos-btn-outline py-1 px-2.5 text-[11px]" onClick={e => { e.stopPropagation(); setDefault(method.id); }}>
                                        Set Default
                                    </button>
                                )}
                                <button title="Edit method" className="pos-btn-icon" onClick={e => { e.stopPropagation(); setEditing({ ...method }); }}>
                                    <Edit3 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Inactive Methods */}
                {inactive.length > 0 && (
                    <>
                        <div className="pos-text-sm pos-text-bold pos-text-secondary pos-mb-8 uppercase tracking-wide mt-6">
                            Inactive Methods ({inactive.length})
                        </div>
                        <div className="pos-card">
                            {inactive.map(method => (
                                <div key={method.id} className="pos-flex pos-flex--center pos-gap-14 py-3 border-b border-white/[0.03] cursor-pointer opacity-60"
                                    onClick={() => setEditing({ ...method })}>
                                    {/* keep-inline: dynamic background/color from user-configurable method.color */}
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${method.color}10`, color: method.color }}>
                                        {ICONS[method.icon] || <CreditCard size={18} />}
                                    </div>
                                    <div className="flex-1">
                                        <span className="pos-cell-value">{method.name}</span>
                                        <div className="pos-cell-secondary">{method.type}</div>
                                    </div>
                                    <button className="pos-btn-outline py-1 px-2.5 text-[11px]" onClick={e => {
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
                <div className="pos-modal-overlay" onClick={() => setEditing(null)}>
                    <div className="pos-card pos-modal max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        <div className="pos-modal-header">
                            <h3 className="pos-modal-title">
                                {methods.find(m => m.id === editing.id) ? 'Edit' : 'New'} Payment Method
                            </h3>
                            <button title="Close" className="pos-btn-icon" onClick={() => setEditing(null)}><X size={20} /></button>
                        </div>

                        <div className="pos-form-grid">
                            <div className="col-span-full">
                                <label className="pos-form-label">Name *</label>
                                <input aria-label="Input field" className="pos-input" value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Visa" />
                            </div>
                            <div>
                                <label className="pos-form-label">Type</label>
                                <select aria-label="Select option" className="pos-select" value={editing.type} onChange={e => setEditing(p => p ? { ...p, type: e.target.value as PaymentMethod['type'] } : null)} aria-label="Payment type">
                                    <option value="cash">Cash</option><option value="card">Card</option><option value="voucher">Voucher</option>
                                    <option value="mobile">Mobile Payment</option><option value="account">Account Charge</option><option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="pos-form-label">Accounting Reference</label>
                                <input aria-label="Input field" className="pos-input" value={editing.accountingRef} onChange={e => setEditing(p => p ? { ...p, accountingRef: e.target.value } : null)} placeholder="e.g. 1010" />
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="pos-card pos-mb-16 bg-[var(--bg-secondary,#09090b)] p-4">
                            <div className="pos-text-xs pos-text-bold pos-text-secondary pos-mb-8 uppercase tracking-wide">Behavior</div>
                            {[
                                { key: 'opensCashDrawer', label: 'Opens cash drawer', desc: 'Trigger cash drawer to open on payment' },
                                { key: 'requiresAmount', label: 'Requires entered amount', desc: 'Staff must enter the received amount' },
                                { key: 'allowsChange', label: 'Allows change', desc: 'Calculate and display change to give' },
                                { key: 'allowsTips', label: 'Allows tips', desc: 'Enable tip input for this method' },
                                { key: 'printReceipt', label: 'Auto-print receipt', desc: 'Print receipt after payment' },
                                { key: 'autoCloseOrder', label: 'Auto-close order', desc: 'Automatically close order after payment' },
                                { key: 'isActive', label: 'Active', desc: 'Show this method on POS' },
                            ].map(({ key, label, desc }) => (
                                <div key={key} className="pos-flex pos-flex--center pos-flex--between py-3 border-b border-white/[0.04]">
                                    <div><div className="pos-cell-value">{label}</div>{desc && <div className="pos-cell-secondary mt-px">{desc}</div>}</div>
                                    <Toggle value={editing[key as keyof PaymentMethod] as boolean} onChange={() => setEditing(p => p ? { ...p, [key]: !(p[key as keyof PaymentMethod] as boolean) } : null)} />
                                </div>
                            ))}
                        </div>

                        <div className="pos-modal-footer">
                            <button className="pos-btn-primary flex-1 justify-center" onClick={save}><Save size={14} /> Save</button>
                            <button title="Delete method" className="pos-btn-outline text-red-400 border-red-500/30" onClick={() => {
                                setMethods(prev => prev.filter(m => m.id !== editing.id));
                                setEditing(null);
                                toast.success('Payment method deleted');
                            }}><Trash2 size={14} /></button>
                            <button className="pos-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentMethods;
