/**
 * PrintingProfiles.tsx — K-Series Printing Profiles
 * Lightspeed K-Series Back Office > Hardware > Printing Profiles parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, Search, X, Printer, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';
import './pos-shared.css';

interface PrinterDevice { id: string; name: string; ip: string; type: string; isOnline: boolean; }
interface PrintingProfile {
    id: string; name: string; description: string; printers: string[]; fallbackPrinter: string; productionCenters: string[];
    printReceipts: boolean; printOrderTickets: boolean; printKitchenTickets: boolean;
    copies: number; paperWidth: '58mm' | '80mm'; fontSize: 'small' | 'medium' | 'large';
    cutAfterPrint: boolean; buzzAfterPrint: boolean; isActive: boolean;
}

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
    <div className={`pos-toggle-track ${value ? 'pos-toggle-track--on' : 'pos-toggle-track--off'}`} onClick={onChange}>
        <div className={`pos-toggle-thumb ${value ? 'pos-toggle-thumb--on' : 'pos-toggle-thumb--off'}`} />
    </div>
);

const PRINTERS: PrinterDevice[] = [
    { id: 'p1', name: 'Front Counter (Epson TM-T88)', ip: '192.168.1.100', type: 'thermal', isOnline: true },
    { id: 'p2', name: 'Kitchen Printer (Star TSP143)', ip: '192.168.1.101', type: 'impact', isOnline: true },
    { id: 'p3', name: 'Bar Printer (Star TSP143)', ip: '192.168.1.102', type: 'impact', isOnline: true },
    { id: 'p4', name: 'Pastry Printer (Epson TM-U220)', ip: '192.168.1.103', type: 'impact', isOnline: false },
    { id: 'p5', name: 'Label Printer (Brother QL-820)', ip: '192.168.1.104', type: 'label', isOnline: true },
];
const PROD_CENTERS = ['Kitchen', 'Bar', 'Pastry', 'Cold Kitchen', 'Grill Station'];
const SEED: PrintingProfile[] = [
    { id: '1', name: 'Receipt (Front Counter)', description: 'Customer receipts', printers: ['p1'], fallbackPrinter: 'p3', productionCenters: [], printReceipts: true, printOrderTickets: false, printKitchenTickets: false, copies: 1, paperWidth: '80mm', fontSize: 'medium', cutAfterPrint: true, buzzAfterPrint: false, isActive: true },
    { id: '2', name: 'Kitchen Tickets', description: 'Order tickets for kitchen', printers: ['p2'], fallbackPrinter: 'p4', productionCenters: ['Kitchen', 'Cold Kitchen', 'Grill Station'], printReceipts: false, printOrderTickets: true, printKitchenTickets: true, copies: 1, paperWidth: '80mm', fontSize: 'large', cutAfterPrint: true, buzzAfterPrint: true, isActive: true },
    { id: '3', name: 'Bar Tickets', description: 'Drink orders for bar', printers: ['p3'], fallbackPrinter: '', productionCenters: ['Bar'], printReceipts: false, printOrderTickets: true, printKitchenTickets: true, copies: 1, paperWidth: '80mm', fontSize: 'large', cutAfterPrint: true, buzzAfterPrint: true, isActive: true },
    { id: '4', name: 'Pastry Labels', description: 'Labels for pastry items', printers: ['p4', 'p5'], fallbackPrinter: 'p2', productionCenters: ['Pastry'], printReceipts: false, printOrderTickets: false, printKitchenTickets: true, copies: 1, paperWidth: '58mm', fontSize: 'small', cutAfterPrint: false, buzzAfterPrint: false, isActive: true },
];

const PrintingProfiles: React.FC = () => {
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState(SEED);
    const [editing, setEditing] = useState<PrintingProfile | null>(null);
    const [search, setSearch] = useState('');
    const [isLive, setIsLive] = useState(false);
    const venueId = localStorage.getItem('restin_pos_venue') || '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: apiData } = useVenueConfig<any>({ venueId, configType: 'printing-profiles' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useEffect(() => { if (apiData?.length > 0) { setProfiles(apiData.map((p: /**/any) => ({ id: p.id || p._id || crypto.randomUUID(), name: p.name || '', description: p.description || '', printers: p.printers || [], fallbackPrinter: p.fallbackPrinter ?? p.fallback_printer ?? '', productionCenters: p.productionCenters ?? p.production_centers ?? [], printReceipts: p.printReceipts ?? p.print_receipts ?? false, printOrderTickets: p.printOrderTickets ?? p.print_order_tickets ?? false, printKitchenTickets: p.printKitchenTickets ?? p.print_kitchen_tickets ?? false, copies: p.copies ?? 1, paperWidth: p.paperWidth ?? p.paper_width ?? '80mm', fontSize: p.fontSize ?? p.font_size ?? 'medium', cutAfterPrint: p.cutAfterPrint ?? p.cut_after_print ?? true, buzzAfterPrint: p.buzzAfterPrint ?? p.buzz_after_print ?? false, isActive: p.isActive ?? p.is_active ?? true }))); setIsLive(true); } }, [apiData]);
    const filtered = profiles.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));
    const save = () => { if (!editing) return; const ex = profiles.find(p => p.id === editing.id); if (ex) setProfiles(p => p.map(pp => pp.id === editing.id ? editing : pp)); else setProfiles(p => [...p, editing]); setEditing(null); toast.success('Printing profile saved'); };

    return (
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Printing Profiles {isLive && <Wifi size={14} className="pos-live-icon" />}</h1>
                    <p className="pos-subtitle">Configure print profiles for receipts, order tickets, and kitchen tickets</p>
                </div>
                <button className="pos-btn-primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', description: '', printers: [], fallbackPrinter: '', productionCenters: [], printReceipts: false, printOrderTickets: false, printKitchenTickets: false, copies: 1, paperWidth: '80mm', fontSize: 'medium', cutAfterPrint: true, buzzAfterPrint: false, isActive: true })}><Plus size={16} /> Add Profile</button>
            </div>

            {/* Connected Printers */}
            <div className="pos-card pos-card--compact">
                <div className="pos-text-sm pos-text-bold pos-text-secondary pos-mb-12" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Connected Printers</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                    {PRINTERS.map(p => (
                        <div key={p.id} className="pos-flex pos-flex--center pos-gap-10" style={{ padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.isOnline ? '#10B981' : '#EF4444', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="pos-text-xs pos-text-bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                <div className="pos-cell-secondary" style={{ fontFamily: 'monospace' }}>{p.ip}</div>
                            </div>
                            <Printer size={14} className="pos-icon-secondary" style={{ flexShrink: 0 }} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="pos-search-wrapper pos-mb-16"><Search size={14} className="pos-search-icon" /><input aria-label="Search profiles..." className="pos-input pos-search-input" placeholder="Search profiles..." value={search} onChange={e => setSearch(e.target.value)} /></div>

            {/* Profile Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
                {filtered.map(profile => (
                    <div key={profile.id} className="pos-card" style={{ cursor: 'pointer' }} onClick={() => setEditing({ ...profile })}>
                        <div className="pos-flex pos-flex--between" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
                            <div><h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{profile.name}</h3>
                                {profile.description && <p className="pos-subtitle">{profile.description}</p>}</div>
                            <span className={`pos-badge ${profile.isActive ? 'pos-badge--green' : 'pos-badge--red'}`} style={{ fontSize: 10, fontWeight: 600 }}>{profile.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div className="pos-flex pos-flex--wrap pos-gap-6 pos-mb-12">
                            {profile.printReceipts && <span className="pos-badge pos-badge--blue">Receipts</span>}
                            {profile.printOrderTickets && <span className="pos-badge pos-badge--green">Order Tickets</span>}
                            {profile.printKitchenTickets && <span className="pos-badge pos-badge--amber">Kitchen Tickets</span>}
                        </div>
                        <div className="pos-cell-secondary pos-flex pos-gap-14 pos-flex--wrap">
                            <span><Printer size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />{profile.printers.length} printer{profile.printers.length !== 1 ? 's' : ''}</span>
                            <span>{profile.copies} {profile.copies === 1 ? 'copy' : 'copies'}</span>
                            <span>{profile.paperWidth}</span>
                            <span>Font: {profile.fontSize}</span>
                            {profile.fallbackPrinter && <span className="pos-cell-amber">Fallback: {PRINTERS.find(p => p.id === profile.fallbackPrinter)?.name?.split('(')[0]?.trim() || profile.fallbackPrinter}</span>}
                        </div>
                        {profile.productionCenters.length > 0 && <div className="pos-flex pos-flex--wrap pos-gap-4" style={{ marginTop: 8 }}>
                            {profile.productionCenters.map(c => <span key={c} className="pos-badge pos-badge--purple">{c}</span>)}
                        </div>}
                    </div>
                ))}
            </div>
        </div>

            {editing && <div className="pos-modal-overlay" onClick={() => setEditing(null)}>
                <div className="pos-card pos-modal" style={{ maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                    <div className="pos-modal-header"><h3 className="pos-modal-title">{profiles.find(p => p.id === editing.id) ? 'Edit' : 'New'} Printing Profile</h3><button title="Close" className="pos-btn-icon" onClick={() => setEditing(null)}><X size={20} /></button></div>
                    <div className="pos-form-group"><label className="pos-form-label">Profile Name *</label><input className="pos-input" value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Kitchen Tickets" /></div>
                    <div className="pos-form-group"><label className="pos-form-label">Description</label><input className="pos-input" value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : null)} placeholder="Optional" /></div>
                    <div className="pos-form-group"><label className="pos-form-label pos-mb-4">Assign Printers</label>
                        <div className="pos-flex pos-flex--col pos-gap-6">
                            {PRINTERS.map(p => <label key={p.id} className="pos-flex pos-flex--center pos-gap-10" style={{ padding: '8px 12px', background: 'var(--bg-secondary,#09090b)', borderRadius: 8, cursor: 'pointer', border: editing.printers.includes(p.id) ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.04)' }}>
                                <input type="checkbox" checked={editing.printers.includes(p.id)} onChange={() => setEditing(prev => { if (!prev) return null; const has = prev.printers.includes(p.id); return { ...prev, printers: has ? prev.printers.filter(x => x !== p.id) : [...prev.printers, p.id] }; })} />
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.isOnline ? '#10B981' : '#EF4444' }} />
                                <span className="pos-text-sm" style={{ flex: 1 }}>{p.name}</span>
                                <span className="pos-cell-secondary" style={{ fontFamily: 'monospace' }}>{p.ip}</span>
                            </label>)}
                        </div>
                    </div>
                    <div className="pos-form-group"><label className="pos-form-label pos-mb-4">Production Centers</label>
                        <div className="pos-flex pos-flex--wrap pos-gap-6">
                            {PROD_CENTERS.map(c => <button key={c} onClick={() => setEditing(prev => { if (!prev) return null; const has = prev.productionCenters.includes(c); return { ...prev, productionCenters: has ? prev.productionCenters.filter(x => x !== c) : [...prev.productionCenters, c] }; })}
                                className={`pos-btn-outline ${editing.productionCenters.includes(c) ? 'pos-badge--purple' : ''}`} style={{ padding: '6px 14px', fontSize: 12, borderColor: editing.productionCenters.includes(c) ? '#8B5CF6' : undefined }}>{c}</button>)}
                        </div>
                    </div>
                    <div className="pos-form-group"><label className="pos-form-label">Fallback Printer</label>
                        <select className="pos-select" value={editing.fallbackPrinter} onChange={e => setEditing(p => p ? { ...p, fallbackPrinter: e.target.value } : null)} aria-label="Fallback printer"><option value="">— None —</option>{PRINTERS.filter(p => !editing.printers.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                        <div className="pos-cell-secondary" style={{ marginTop: 4 }}>Used when the primary printer is offline</div>
                    </div>
                    <div className="pos-card pos-form-group" style={{ background: 'var(--bg-secondary,#09090b)', padding: 14 }}>
                        <div className="pos-text-xs pos-text-bold pos-text-secondary pos-mb-8" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Print Options</div>
                        {([['printReceipts', 'Customer Receipts'], ['printOrderTickets', 'Order Tickets'], ['printKitchenTickets', 'Kitchen Tickets'], ['cutAfterPrint', 'Auto-cut'], ['buzzAfterPrint', 'Buzz after print'], ['isActive', 'Active']] as const).map(([key, label]) =>
                            <div key={key} className="pos-flex pos-flex--center pos-flex--between" style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}><span className="pos-cell-value">{label}</span>
                                <Toggle value={editing[key] as boolean} onChange={() => setEditing(p => p ? { ...p, [key]: !(p[key] as boolean) } : null)} /></div>
                        )}
                    </div>
                    <div className="pos-form-grid--3 pos-mb-16" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                        <div><label className="pos-form-label">Copies</label><input type="number" min={1} max={5} className="pos-input" value={editing.copies} onChange={e => setEditing(p => p ? { ...p, copies: parseInt(e.target.value) || 1 } : null)} aria-label="Copies" /></div>
                        <div><label className="pos-form-label">Paper Width</label><select className="pos-select" value={editing.paperWidth} onChange={e => setEditing(p => p ? { ...p, paperWidth: e.target.value as '58mm' | '80mm' } : null)} aria-label="Paper width"><option value="58mm">58mm</option><option value="80mm">80mm</option></select></div>
                        <div><label className="pos-form-label">Font Size</label><select className="pos-select" value={editing.fontSize} onChange={e => setEditing(p => p ? { ...p, fontSize: e.target.value as 'small' | 'medium' | 'large' } : null)} aria-label="Font size"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
                    </div>
                    <div className="pos-modal-footer">
                        <button className="pos-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete profile" className="pos-btn-outline" style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => { setProfiles(p => p.filter(pp => pp.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button className="pos-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default PrintingProfiles;
