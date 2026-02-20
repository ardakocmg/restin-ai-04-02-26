/**
 * TaxSettings.tsx — K-Series Taxes & Tax Profiles
 * Tax rates + tax profiles with conditional rules
 * Exact Lightspeed K-Series Back Office > Payment > Taxes parity
 */

import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Plus, Save, Edit3, Trash2, Search, X,
    Percent, FileText, ChevronRight, Settings, Wifi
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';

/* ===== Types ===== */

interface TaxRate {
    id: string;
    name: string;
    rate: number;
    isDefault: boolean;
    isActive: boolean;
    accountingRef: string;
}

interface TaxProfileRule {
    orderType: string;
    taxRate: string;
}

interface TaxProfile {
    id: string;
    name: string;
    defaultTaxRate: string;
    rules: TaxProfileRule[];
    itemCount: number;
    isActive: boolean;
}

/* ===== Styles ===== */

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary, #0a0a0a)', color: 'var(--text-primary, #fafafa)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card, #18181b)', border: '1px solid var(--border-primary, #27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, color: 'var(--text-primary, #fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary, #09090b)', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, color: 'var(--text-primary, #fafafa)', fontSize: 14 };
const sl: React.CSSProperties = { ...ip, cursor: 'pointer' };

type TabKey = 'rates' | 'profiles';

/* ===== Seed Data ===== */

const SEED_RATES: TaxRate[] = [
    { id: '1', name: 'Standard Rate', rate: 18, isDefault: true, isActive: true, accountingRef: 'VAT-18' },
    { id: '2', name: 'Reduced Rate', rate: 5, isDefault: false, isActive: true, accountingRef: 'VAT-5' },
    { id: '3', name: 'Eco Tax', rate: 7, isDefault: false, isActive: true, accountingRef: 'ECO-7' },
    { id: '4', name: 'Zero Rate', rate: 0, isDefault: false, isActive: true, accountingRef: 'VAT-0' },
    { id: '5', name: 'Tourism Tax', rate: 3.5, isDefault: false, isActive: false, accountingRef: 'TOUR-3.5' },
];

const SEED_PROFILES: TaxProfile[] = [
    { id: '1', name: 'Standard 18%', defaultTaxRate: 'Standard Rate', rules: [], itemCount: 45, isActive: true },
    { id: '2', name: 'Reduced 5%', defaultTaxRate: 'Reduced Rate', rules: [], itemCount: 15, isActive: true },
    {
        id: '3', name: 'Mixed (Dine-in/Takeaway)', defaultTaxRate: 'Standard Rate', rules: [
            { orderType: 'Takeaway', taxRate: 'Reduced Rate' },
            { orderType: 'Delivery', taxRate: 'Reduced Rate' },
        ], itemCount: 8, isActive: true
    },
    { id: '4', name: 'Eco-Beverage', defaultTaxRate: 'Eco Tax', rules: [], itemCount: 5, isActive: true },
    { id: '5', name: 'Zero-Rated Export', defaultTaxRate: 'Zero Rate', rules: [], itemCount: 2, isActive: false },
];

const ORDER_TYPES = ['Dine-In', 'Takeaway', 'Delivery', 'Pickup', 'Room Service'];

/* ===== Component ===== */

const TaxSettings: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabKey>('rates');
    const [rates, setRates] = useState<TaxRate[]>(SEED_RATES);
    const [profiles, setProfiles] = useState<TaxProfile[]>(SEED_PROFILES);
    const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
    const [editingProfile, setEditingProfile] = useState<TaxProfile | null>(null);
    const [search, setSearch] = useState('');
    const [isLive, setIsLive] = useState(false);

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiRates } = useVenueConfig<TaxRate>({ venueId, configType: 'tax-profiles' });
    useEffect(() => {
        if (apiRates && apiRates.length > 0) {
            setRates(apiRates.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (r: any) => ({ id: r.id || r._id || crypto.randomUUID(), name: r.name || '', rate: r.rate ?? 0, isDefault: r.isDefault ?? r.is_default ?? false, isActive: r.isActive ?? r.is_active ?? true, accountingRef: r.accountingRef ?? r.accounting_ref ?? '' }))); setIsLive(true);
        }
    }, [apiRates]);

    const filteredRates = rates.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));
    const filteredProfiles = profiles.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

    const saveRate = () => {
        if (!editingRate) return;
        const exists = rates.find(r => r.id === editingRate.id);
        if (exists) setRates(prev => prev.map(r => r.id === editingRate.id ? editingRate : r));
        else setRates(prev => [...prev, editingRate]);
        setEditingRate(null);
        toast.success('Tax rate saved');
    };

    const saveProfile = () => {
        if (!editingProfile) return;
        const exists = profiles.find(p => p.id === editingProfile.id);
        if (exists) setProfiles(prev => prev.map(p => p.id === editingProfile.id ? editingProfile : p));
        else setProfiles(prev => [...prev, editingProfile]);
        setEditingProfile(null);
        toast.success('Tax profile saved');
    };

    return (
        <div style={pg}>
            <div style={ct}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                        <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Taxes & Tax Profiles {isLive && <Wifi size={14} style={{ color: '#10B981', verticalAlign: 'middle', marginLeft: 6 }} />}</h1>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)', margin: '4px 0 0' }}>Configure tax rates and profiles with conditional rules per order type</p>
                    </div>
                    <button style={bp} onClick={() => {
                        if (activeTab === 'rates') setEditingRate({ id: crypto.randomUUID(), name: '', rate: 0, isDefault: false, isActive: true, accountingRef: '' });
                        else setEditingProfile({ id: crypto.randomUUID(), name: '', defaultTaxRate: rates[0]?.name || '', rules: [], itemCount: 0, isActive: true });
                    }}>
                        <Plus size={16} /> Add {activeTab === 'rates' ? 'Tax Rate' : 'Tax Profile'}
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card, #18181b)', borderRadius: 10, padding: 4, border: '1px solid var(--border-primary, #27272a)', width: 'fit-content' }}>
                    {(['rates', 'profiles'] as TabKey[]).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: activeTab === tab ? 600 : 400, cursor: 'pointer', background: activeTab === tab ? 'rgba(59,130,246,0.1)' : 'transparent', color: activeTab === tab ? '#3B82F6' : 'var(--text-secondary, #a1a1aa)' }}>
                            {tab === 'rates' ? '📊 Tax Rates' : '📋 Tax Profiles'}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                    <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-secondary)' }} />
                    <input style={{ ...ip, paddingLeft: 36 }} placeholder={`Search ${activeTab}...`} value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {/* Tax Rates Tab */}
                {activeTab === 'rates' && (
                    <div style={cd}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 120px 80px 60px', gap: 12, padding: '8px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div>Name</div><div>Rate</div><div>Default</div><div>Accounting Ref</div><div>Status</div><div>Actions</div>
                        </div>
                        {filteredRates.map(rate => (
                            <div key={rate.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 120px 80px 60px', gap: 12, padding: '14px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
                                onClick={() => setEditingRate({ ...rate })}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Percent size={14} color="#F59E0B" />
                                    <span style={{ fontSize: 14, fontWeight: 500 }}>{rate.name}</span>
                                </div>
                                <span style={{ fontSize: 15, fontWeight: 700, color: '#F59E0B' }}>{rate.rate}%</span>
                                <div>{rate.isDefault && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3B82F6', fontWeight: 600 }}>DEFAULT</span>}</div>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{rate.accountingRef}</span>
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: rate.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: rate.isActive ? '#10B981' : '#EF4444' }}>
                                    {rate.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button title="Edit rate" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }} onClick={e => { e.stopPropagation(); setEditingRate({ ...rate }); }}><Edit3 size={13} /></button>
                                    <button title="Delete rate" style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4, opacity: 0.6 }} onClick={e => { e.stopPropagation(); setRates(prev => prev.filter(r => r.id !== rate.id)); toast.success('Deleted'); }}><Trash2 size={13} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tax Profiles Tab */}
                {activeTab === 'profiles' && (
                    <div style={cd}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 100px 80px 60px', gap: 12, padding: '8px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div>Profile Name</div><div>Default Tax Rate</div><div>Rules</div><div>Items</div><div>Actions</div>
                        </div>
                        {filteredProfiles.map(profile => (
                            <div key={profile.id} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 100px 80px 60px', gap: 12, padding: '14px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
                                onClick={() => setEditingProfile({ ...profile })}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FileText size={14} color="#3B82F6" />
                                    <div>
                                        <span style={{ fontSize: 14, fontWeight: 500 }}>{profile.name}</span>
                                        {!profile.isActive && <span style={{ fontSize: 10, marginLeft: 6, color: '#EF4444' }}>(Inactive)</span>}
                                    </div>
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{profile.defaultTaxRate}</span>
                                <div>
                                    {profile.rules.length > 0 ? (
                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>
                                            {profile.rules.length} rule{profile.rules.length > 1 ? 's' : ''}
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>No rules</span>
                                    )}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 500 }}>{profile.itemCount}</span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button title="Edit profile" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }} onClick={e => { e.stopPropagation(); setEditingProfile({ ...profile }); }}><Edit3 size={13} /></button>
                                    <button title="Delete profile" style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4, opacity: 0.6 }} onClick={e => { e.stopPropagation(); setProfiles(prev => prev.filter(p => p.id !== profile.id)); toast.success('Deleted'); }}><Trash2 size={13} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Tax Rate Modal */}
            {editingRate && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditingRate(null)}>
                    <div style={{ ...cd, width: 480 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{rates.find(r => r.id === editingRate.id) ? 'Edit' : 'New'} Tax Rate</h3>
                            <button title="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditingRate(null)}><X size={20} /></button>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name *</label>
                            <input style={ip} value={editingRate.name} onChange={e => setEditingRate(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Standard Rate" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Rate (%)</label>
                                <input type="number" step="0.1" style={ip} value={editingRate.rate} onChange={e => setEditingRate(p => p ? { ...p, rate: parseFloat(e.target.value) || 0 } : null)} aria-label="Tax rate percentage" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Accounting Ref</label>
                                <input style={ip} value={editingRate.accountingRef} onChange={e => setEditingRate(p => p ? { ...p, accountingRef: e.target.value } : null)} placeholder="e.g. VAT-18" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input type="checkbox" checked={editingRate.isDefault} onChange={() => setEditingRate(p => p ? { ...p, isDefault: !p.isDefault } : null)} /> Default rate
                            </label>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input type="checkbox" checked={editingRate.isActive} onChange={() => setEditingRate(p => p ? { ...p, isActive: !p.isActive } : null)} /> Active
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={saveRate}><Save size={14} /> Save</button>
                            <button style={bo} onClick={() => setEditingRate(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Tax Profile Modal */}
            {editingProfile && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditingProfile(null)}>
                    <div style={{ ...cd, width: 560 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{profiles.find(p => p.id === editingProfile.id) ? 'Edit' : 'New'} Tax Profile</h3>
                            <button title="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditingProfile(null)}><X size={20} /></button>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Profile Name *</label>
                            <input style={ip} value={editingProfile.name} onChange={e => setEditingProfile(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Standard 18%" />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Default Tax Rate</label>
                            <select style={sl} value={editingProfile.defaultTaxRate} onChange={e => setEditingProfile(p => p ? { ...p, defaultTaxRate: e.target.value } : null)} aria-label="Default tax rate">
                                {rates.filter(r => r.isActive).map(r => <option key={r.id} value={r.name}>{r.name} ({r.rate}%)</option>)}
                            </select>
                        </div>

                        {/* Conditional Rules */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Conditional Rules</div>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>Override the default tax rate based on order type (e.g., lower rate for takeaway).</p>
                            {editingProfile.rules.map((rule, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                    <select style={{ ...sl, flex: 1, padding: '8px 12px', fontSize: 12 }} value={rule.orderType} onChange={e => {
                                        const newRules = [...editingProfile.rules]; newRules[idx] = { ...rule, orderType: e.target.value };
                                        setEditingProfile(p => p ? { ...p, rules: newRules } : null);
                                    }} aria-label="Order type">{ORDER_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>→</span>
                                    <select style={{ ...sl, flex: 1, padding: '8px 12px', fontSize: 12 }} value={rule.taxRate} onChange={e => {
                                        const newRules = [...editingProfile.rules]; newRules[idx] = { ...rule, taxRate: e.target.value };
                                        setEditingProfile(p => p ? { ...p, rules: newRules } : null);
                                    }} aria-label="Tax rate">{rates.filter(r => r.isActive).map(r => <option key={r.id} value={r.name}>{r.name} ({r.rate}%)</option>)}</select>
                                    <button title="Delete rule" style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }} onClick={() => setEditingProfile(p => p ? { ...p, rules: p.rules.filter((_, i) => i !== idx) } : null)}><X size={14} /></button>
                                </div>
                            ))}
                            <button style={{ ...bo, padding: '6px 12px', fontSize: 12 }} onClick={() => setEditingProfile(p => p ? { ...p, rules: [...p.rules, { orderType: ORDER_TYPES[0], taxRate: rates[0]?.name || '' }] } : null)}>
                                <Plus size={12} /> Add Rule
                            </button>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input type="checkbox" checked={editingProfile.isActive} onChange={() => setEditingProfile(p => p ? { ...p, isActive: !p.isActive } : null)} /> Active
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={saveProfile}><Save size={14} /> Save</button>
                            <button style={bo} onClick={() => setEditingProfile(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaxSettings;
