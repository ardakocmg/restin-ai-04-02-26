/**
 * TaxSettings.tsx — K-Series Taxes & Tax Profiles
 * Tax rates + tax profiles with conditional rules
 * Exact Lightspeed K-Series Back Office > Payment > Taxes parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, Search, X, Percent, FileText, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';
import './pos-shared.css';

interface TaxRate { id: string; name: string; rate: number; isDefault: boolean; isActive: boolean; accountingRef: string; }
interface TaxProfileRule { orderType: string; taxRate: string; }
interface TaxProfile { id: string; name: string; defaultTaxRate: string; rules: TaxProfileRule[]; itemCount: number; isActive: boolean; }
type TabKey = 'rates' | 'profiles';

const rateTableCols = '1fr 100px 100px 120px 80px 60px';
const profileTableCols = '1fr 150px 100px 80px 60px';
const ORDER_TYPES = ['Dine-In', 'Takeaway', 'Delivery', 'Pickup', 'Room Service'];

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
    { id: '3', name: 'Mixed (Dine-in/Takeaway)', defaultTaxRate: 'Standard Rate', rules: [{ orderType: 'Takeaway', taxRate: 'Reduced Rate' }, { orderType: 'Delivery', taxRate: 'Reduced Rate' }], itemCount: 8, isActive: true },
    { id: '4', name: 'Eco-Beverage', defaultTaxRate: 'Eco Tax', rules: [], itemCount: 5, isActive: true },
    { id: '5', name: 'Zero-Rated Export', defaultTaxRate: 'Zero Rate', rules: [], itemCount: 2, isActive: false },
];

const TaxSettings: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabKey>('rates');
    const [rates, setRates] = useState(SEED_RATES);
    const [profiles, setProfiles] = useState(SEED_PROFILES);
    const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
    const [editingProfile, setEditingProfile] = useState<TaxProfile | null>(null);
    const [search, setSearch] = useState('');
    const [isLive, setIsLive] = useState(false);
    const venueId = localStorage.getItem('restin_pos_venue') || '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: apiRates } = useVenueConfig<any>({ venueId, configType: 'tax-profiles' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useEffect(() => { if (apiRates?.length > 0) { setRates(apiRates.map((r: any) => ({ id: r.id || r._id || crypto.randomUUID(), name: r.name || '', rate: r.rate ?? 0, isDefault: r.isDefault ?? r.is_default ?? false, isActive: r.isActive ?? r.is_active ?? true, accountingRef: r.accountingRef ?? r.accounting_ref ?? '' }))); setIsLive(true); } }, [apiRates]);
    const filteredRates = rates.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));
    const filteredProfiles = profiles.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));
    const saveRate = () => { if (!editingRate) return; const ex = rates.find(r => r.id === editingRate.id); if (ex) setRates(p => p.map(r => r.id === editingRate.id ? editingRate : r)); else setRates(p => [...p, editingRate]); setEditingRate(null); toast.success('Tax rate saved'); };
    const saveProfile = () => { if (!editingProfile) return; const ex = profiles.find(p => p.id === editingProfile.id); if (ex) setProfiles(p => p.map(pp => pp.id === editingProfile.id ? editingProfile : pp)); else setProfiles(p => [...p, editingProfile]); setEditingProfile(null); toast.success('Tax profile saved'); };

    return (
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Taxes & Tax Profiles {isLive && <Wifi size={14} className="pos-live-icon" />}</h1>
                    <p className="pos-subtitle">Configure tax rates and profiles with conditional rules per order type</p>
                </div>
                <button className="pos-btn-primary" onClick={() => { if (activeTab === 'rates') setEditingRate({ id: crypto.randomUUID(), name: '', rate: 0, isDefault: false, isActive: true, accountingRef: '' }); else setEditingProfile({ id: crypto.randomUUID(), name: '', defaultTaxRate: rates[0]?.name || '', rules: [], itemCount: 0, isActive: true }); }}><Plus size={16} /> Add {activeTab === 'rates' ? 'Tax Rate' : 'Tax Profile'}</button>
            </div>
            <div className="pos-toggle-group pos-mb-20" style={{ width: 'fit-content' }}>
                {(['rates', 'profiles'] as TabKey[]).map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`pos-toggle-btn ${activeTab === tab ? 'pos-toggle-btn--active' : ''}`} style={{ padding: '10px 24px', fontSize: 13, fontWeight: activeTab === tab ? 600 : 400 }}>{tab === 'rates' ? '📊 Tax Rates' : '📋 Tax Profiles'}</button>))}
            </div>
            <div className="pos-search-wrapper pos-mb-16"><Search size={14} className="pos-search-icon" /><input className="pos-input pos-search-input" placeholder={`Search ${activeTab}...`} value={search} onChange={e => setSearch(e.target.value)} /></div>

            {activeTab === 'rates' && <div className="pos-card">
                <div className="pos-table-header" style={{ gridTemplateColumns: rateTableCols }}><div>Name</div><div>Rate</div><div>Default</div><div>Accounting Ref</div><div>Status</div><div>Actions</div></div>
                {filteredRates.map(rate => (<div key={rate.id} className="pos-table-row" style={{ gridTemplateColumns: rateTableCols }} onClick={() => setEditingRate({ ...rate })}>
                    <div className="pos-flex pos-flex--center pos-gap-8"><Percent size={14} color="#F59E0B" /><span className="pos-cell-value">{rate.name}</span></div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#F59E0B' }}>{rate.rate}%</span>
                    <div>{rate.isDefault && <span className="pos-badge pos-badge--blue" style={{ fontSize: 10, fontWeight: 600 }}>DEFAULT</span>}</div>
                    <span className="pos-cell-secondary" style={{ fontFamily: 'monospace' }}>{rate.accountingRef}</span>
                    <span className={`pos-badge ${rate.isActive ? 'pos-badge--green' : 'pos-badge--red'}`}>{rate.isActive ? 'Active' : 'Inactive'}</span>
                    <div className="pos-actions"><button title="Edit rate" className="pos-btn-icon" onClick={e => { e.stopPropagation(); setEditingRate({ ...rate }); }}><Edit3 size={13} /></button><button title="Delete rate" className="pos-btn-icon pos-btn-icon--danger" onClick={e => { e.stopPropagation(); setRates(p => p.filter(r => r.id !== rate.id)); toast.success('Deleted'); }}><Trash2 size={13} /></button></div>
                </div>))}
            </div>}

            {activeTab === 'profiles' && <div className="pos-card">
                <div className="pos-table-header" style={{ gridTemplateColumns: profileTableCols }}><div>Profile Name</div><div>Default Tax Rate</div><div>Rules</div><div>Items</div><div>Actions</div></div>
                {filteredProfiles.map(profile => (<div key={profile.id} className="pos-table-row" style={{ gridTemplateColumns: profileTableCols }} onClick={() => setEditingProfile({ ...profile })}>
                    <div className="pos-flex pos-flex--center pos-gap-8"><FileText size={14} color="#3B82F6" /><div><span className="pos-cell-value">{profile.name}</span>{!profile.isActive && <span className="pos-cell-red" style={{ fontSize: 10, marginLeft: 6 }}>(Inactive)</span>}</div></div>
                    <span className="pos-cell-secondary">{profile.defaultTaxRate}</span>
                    <div>{profile.rules.length > 0 ? <span className="pos-badge pos-badge--purple">{profile.rules.length} rule{profile.rules.length > 1 ? 's' : ''}</span> : <span className="pos-cell-secondary">No rules</span>}</div>
                    <span className="pos-cell-value">{profile.itemCount}</span>
                    <div className="pos-actions"><button title="Edit profile" className="pos-btn-icon" onClick={e => { e.stopPropagation(); setEditingProfile({ ...profile }); }}><Edit3 size={13} /></button><button title="Delete profile" className="pos-btn-icon pos-btn-icon--danger" onClick={e => { e.stopPropagation(); setProfiles(p => p.filter(pp => pp.id !== profile.id)); toast.success('Deleted'); }}><Trash2 size={13} /></button></div>
                </div>))}
            </div>}
        </div>

            {editingRate && <div className="pos-modal-overlay" onClick={() => setEditingRate(null)}><div className="pos-card pos-modal pos-modal--sm" onClick={e => e.stopPropagation()}>
                <div className="pos-modal-header"><h3 className="pos-modal-title">{rates.find(r => r.id === editingRate.id) ? 'Edit' : 'New'} Tax Rate</h3><button title="Close" className="pos-btn-icon" onClick={() => setEditingRate(null)}><X size={20} /></button></div>
                <div className="pos-form-group"><label className="pos-form-label">Name *</label><input className="pos-input" value={editingRate.name} onChange={e => setEditingRate(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Standard Rate" /></div>
                <div className="pos-form-grid"><div><label className="pos-form-label">Rate (%)</label><input type="number" step="0.1" className="pos-input" value={editingRate.rate} onChange={e => setEditingRate(p => p ? { ...p, rate: parseFloat(e.target.value) || 0 } : null)} aria-label="Tax rate percentage" /></div><div><label className="pos-form-label">Accounting Ref</label><input className="pos-input" value={editingRate.accountingRef} onChange={e => setEditingRate(p => p ? { ...p, accountingRef: e.target.value } : null)} placeholder="e.g. VAT-18" /></div></div>
                <div className="pos-flex pos-gap-16 pos-mb-16"><label className="pos-toggle-label"><input type="checkbox" checked={editingRate.isDefault} onChange={() => setEditingRate(p => p ? { ...p, isDefault: !p.isDefault } : null)} /> Default rate</label><label className="pos-toggle-label"><input type="checkbox" checked={editingRate.isActive} onChange={() => setEditingRate(p => p ? { ...p, isActive: !p.isActive } : null)} /> Active</label></div>
                <div className="pos-modal-footer"><button className="pos-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveRate}><Save size={14} /> Save</button><button className="pos-btn-outline" onClick={() => setEditingRate(null)}>Cancel</button></div>
            </div></div>}

            {editingProfile && <div className="pos-modal-overlay" onClick={() => setEditingProfile(null)}><div className="pos-card pos-modal" onClick={e => e.stopPropagation()}>
                <div className="pos-modal-header"><h3 className="pos-modal-title">{profiles.find(p => p.id === editingProfile.id) ? 'Edit' : 'New'} Tax Profile</h3><button title="Close" className="pos-btn-icon" onClick={() => setEditingProfile(null)}><X size={20} /></button></div>
                <div className="pos-form-group"><label className="pos-form-label">Profile Name *</label><input className="pos-input" value={editingProfile.name} onChange={e => setEditingProfile(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Standard 18%" /></div>
                <div className="pos-form-group"><label className="pos-form-label">Default Tax Rate</label><select className="pos-select" value={editingProfile.defaultTaxRate} onChange={e => setEditingProfile(p => p ? { ...p, defaultTaxRate: e.target.value } : null)} aria-label="Default tax rate">{rates.filter(r => r.isActive).map(r => <option key={r.id} value={r.name}>{r.name} ({r.rate}%)</option>)}</select></div>
                <div className="pos-form-group">
                    <div className="pos-text-xs pos-text-bold pos-text-secondary pos-mb-8" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Conditional Rules</div>
                    <p className="pos-cell-secondary pos-mb-8">Override the default tax rate based on order type.</p>
                    {editingProfile.rules.map((rule, idx) => (<div key={idx} className="pos-flex pos-gap-8 pos-mb-8 pos-flex--center">
                        <select className="pos-select" style={{ flex: 1, padding: '8px 12px', fontSize: 12 }} value={rule.orderType} onChange={e => { const nr = [...editingProfile.rules]; nr[idx] = { ...rule, orderType: e.target.value }; setEditingProfile(p => p ? { ...p, rules: nr } : null); }} aria-label="Order type">{ORDER_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                        <span className="pos-text-secondary">→</span>
                        <select className="pos-select" style={{ flex: 1, padding: '8px 12px', fontSize: 12 }} value={rule.taxRate} onChange={e => { const nr = [...editingProfile.rules]; nr[idx] = { ...rule, taxRate: e.target.value }; setEditingProfile(p => p ? { ...p, rules: nr } : null); }} aria-label="Tax rate">{rates.filter(r => r.isActive).map(r => <option key={r.id} value={r.name}>{r.name} ({r.rate}%)</option>)}</select>
                        <button title="Delete rule" className="pos-btn-icon pos-btn-icon--danger" onClick={() => setEditingProfile(p => p ? { ...p, rules: p.rules.filter((_, i) => i !== idx) } : null)}><X size={14} /></button>
                    </div>))}
                    <button className="pos-btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setEditingProfile(p => p ? { ...p, rules: [...p.rules, { orderType: ORDER_TYPES[0], taxRate: rates[0]?.name || '' }] } : null)}><Plus size={12} /> Add Rule</button>
                </div>
                <div className="pos-mb-16"><label className="pos-toggle-label"><input type="checkbox" checked={editingProfile.isActive} onChange={() => setEditingProfile(p => p ? { ...p, isActive: !p.isActive } : null)} /> Active</label></div>
                <div className="pos-modal-footer"><button className="pos-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveProfile}><Save size={14} /> Save</button><button className="pos-btn-outline" onClick={() => setEditingProfile(null)}>Cancel</button></div>
            </div></div>}
        </div>
    );
};

export default TaxSettings;
