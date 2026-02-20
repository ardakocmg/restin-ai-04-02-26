/**
 * PrintingProfiles.tsx — K-Series Printing Profiles
 * Lightspeed K-Series Back Office > Hardware > Printing Profiles parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, Search, X, Printer, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';

interface PrinterDevice { id: string; name: string; ip: string; type: string; isOnline: boolean; }
interface PrintingProfile {
    id: string; name: string; description: string; printers: string[]; fallbackPrinter: string; productionCenters: string[];
    printReceipts: boolean; printOrderTickets: boolean; printKitchenTickets: boolean;
    copies: number; paperWidth: '58mm' | '80mm'; fontSize: 'small' | 'medium' | 'large';
    cutAfterPrint: boolean; buzzAfterPrint: boolean; isActive: boolean;
}

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };
const sl: React.CSSProperties = { ...ip, cursor: 'pointer' };
const rw: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' };

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
    <div style={{ width: 44, height: 24, borderRadius: 12, background: value ? '#3B82F6' : '#3f3f46', cursor: 'pointer', position: 'relative' }} onClick={onChange}>
        <div style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
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
    const [profiles, setProfiles] = useState<PrintingProfile[]>(SEED);
    const [editing, setEditing] = useState<PrintingProfile | null>(null);
    const [search, setSearch] = useState('');
    const [isLive, setIsLive] = useState(false);

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiData } = useVenueConfig<PrintingProfile>({ venueId, configType: 'printing-profiles' });
    useEffect(() => {
        if (apiData && apiData.length > 0) {
            setProfiles(apiData.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (p: any) => ({ id: p.id || p._id || crypto.randomUUID(), name: p.name || '', description: p.description || '', printers: p.printers || [], fallbackPrinter: p.fallbackPrinter ?? p.fallback_printer ?? '', productionCenters: p.productionCenters ?? p.production_centers ?? [], printReceipts: p.printReceipts ?? p.print_receipts ?? false, printOrderTickets: p.printOrderTickets ?? p.print_order_tickets ?? false, printKitchenTickets: p.printKitchenTickets ?? p.print_kitchen_tickets ?? false, copies: p.copies ?? 1, paperWidth: p.paperWidth ?? p.paper_width ?? '80mm', fontSize: p.fontSize ?? p.font_size ?? 'medium', cutAfterPrint: p.cutAfterPrint ?? p.cut_after_print ?? true, buzzAfterPrint: p.buzzAfterPrint ?? p.buzz_after_print ?? false, isActive: p.isActive ?? p.is_active ?? true }))); setIsLive(true);
        }
    }, [apiData]);
    const filtered = profiles.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

    const save = () => {
        if (!editing) return;
        const exists = profiles.find(p => p.id === editing.id);
        if (exists) setProfiles(prev => prev.map(p => p.id === editing.id ? editing : p));
        else setProfiles(prev => [...prev, editing]);
        setEditing(null); toast.success('Printing profile saved');
    };

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Printing Profiles {isLive && <Wifi size={14} style={{ color: '#10B981', verticalAlign: 'middle', marginLeft: 6 }} />}</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Configure print profiles for receipts, order tickets, and kitchen tickets</p>
                </div>
                <button style={bp} onClick={() => setEditing({ id: crypto.randomUUID(), name: '', description: '', printers: [], fallbackPrinter: '', productionCenters: [], printReceipts: false, printOrderTickets: false, printKitchenTickets: false, copies: 1, paperWidth: '80mm', fontSize: 'medium', cutAfterPrint: true, buzzAfterPrint: false, isActive: true })}><Plus size={16} /> Add Profile</button>
            </div>

            {/* Connected Printers */}
            <div style={{ ...cd, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12, letterSpacing: 0.5 }}>Connected Printers</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                    {PRINTERS.map(p => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.isOnline ? '#10B981' : '#EF4444', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{p.ip}</div>
                            </div>
                            <Printer size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-secondary)' }} />
                <input style={{ ...ip, paddingLeft: 36 }} placeholder="Search profiles..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Profile Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
                {filtered.map(profile => (
                    <div key={profile.id} style={{ ...cd, cursor: 'pointer' }} onClick={() => setEditing({ ...profile })}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div><h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{profile.name}</h3>
                                {profile.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{profile.description}</p>}</div>
                            <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: profile.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: profile.isActive ? '#10B981' : '#EF4444' }}>{profile.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                            {profile.printReceipts && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>Receipts</span>}
                            {profile.printOrderTickets && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>Order Tickets</span>}
                            {profile.printKitchenTickets && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>Kitchen Tickets</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                            <span><Printer size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />{profile.printers.length} printer{profile.printers.length !== 1 ? 's' : ''}</span>
                            <span>{profile.copies} {profile.copies === 1 ? 'copy' : 'copies'}</span>
                            <span>{profile.paperWidth}</span>
                            <span>Font: {profile.fontSize}</span>
                            {profile.fallbackPrinter && <span style={{ color: '#F59E0B' }}>Fallback: {PRINTERS.find(p => p.id === profile.fallbackPrinter)?.name?.split('(')[0]?.trim() || profile.fallbackPrinter}</span>}
                        </div>
                        {profile.productionCenters.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                            {profile.productionCenters.map(c => <span key={c} style={{ padding: '2px 6px', borderRadius: 3, fontSize: 10, background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>{c}</span>)}
                        </div>}
                    </div>
                ))}
            </div>
        </div>

            {/* Edit Modal */}
            {editing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
                <div style={{ ...cd, width: 540, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{profiles.find(p => p.id === editing.id) ? 'Edit' : 'New'} Printing Profile</h3>
                        <button title="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Profile Name *</label>
                        <input style={ip} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Kitchen Tickets" /></div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Description</label>
                        <input style={ip} value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : null)} placeholder="Optional" /></div>

                    {/* Printer Selection */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Assign Printers</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {PRINTERS.map(p => <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-secondary,#09090b)', borderRadius: 8, cursor: 'pointer', border: editing.printers.includes(p.id) ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.04)' }}>
                                <input type="checkbox" checked={editing.printers.includes(p.id)} onChange={() => setEditing(prev => { if (!prev) return null; const has = prev.printers.includes(p.id); return { ...prev, printers: has ? prev.printers.filter(x => x !== p.id) : [...prev.printers, p.id] }; })} />
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.isOnline ? '#10B981' : '#EF4444' }} />
                                <span style={{ fontSize: 13, flex: 1 }}>{p.name}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{p.ip}</span>
                            </label>)}
                        </div>
                    </div>

                    {/* Production Centers */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Production Centers</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {PROD_CENTERS.map(c => <button key={c} onClick={() => setEditing(prev => { if (!prev) return null; const has = prev.productionCenters.includes(c); return { ...prev, productionCenters: has ? prev.productionCenters.filter(x => x !== c) : [...prev.productionCenters, c] }; })}
                                style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: editing.productionCenters.includes(c) ? '1px solid #8B5CF6' : '1px solid var(--border-primary,#27272a)', background: editing.productionCenters.includes(c) ? 'rgba(139,92,246,0.1)' : 'transparent', color: editing.productionCenters.includes(c) ? '#8B5CF6' : 'var(--text-secondary)' }}>{c}</button>)}
                        </div>
                    </div>

                    {/* Fallback Printer */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Fallback Printer</label>
                        <select style={sl} value={editing.fallbackPrinter} onChange={e => setEditing(p => p ? { ...p, fallbackPrinter: e.target.value } : null)} aria-label="Fallback printer">
                            <option value="">— None —</option>
                            {PRINTERS.filter(p => !editing.printers.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>Used when the primary printer is offline</div>
                    </div>

                    {/* Toggles */}
                    <div style={{ ...cd, background: 'var(--bg-secondary,#09090b)', padding: 14, marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: 0.5 }}>Print Options</div>
                        {([['printReceipts', 'Customer Receipts'], ['printOrderTickets', 'Order Tickets'], ['printKitchenTickets', 'Kitchen Tickets'], ['cutAfterPrint', 'Auto-cut'], ['buzzAfterPrint', 'Buzz after print'], ['isActive', 'Active']] as const).map(([key, label]) =>
                            <div key={key} style={rw}><span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                                <Toggle value={editing[key] as boolean} onChange={() => setEditing(p => p ? { ...p, [key]: !(p[key] as boolean) } : null)} /></div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Copies</label>
                            <input type="number" min={1} max={5} style={ip} value={editing.copies} onChange={e => setEditing(p => p ? { ...p, copies: parseInt(e.target.value) || 1 } : null)} aria-label="Copies" /></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Paper Width</label>
                            <select style={sl} value={editing.paperWidth} onChange={e => setEditing(p => p ? { ...p, paperWidth: e.target.value as '58mm' | '80mm' } : null)} aria-label="Paper width"><option value="58mm">58mm</option><option value="80mm">80mm</option></select></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Font Size</label>
                            <select style={sl} value={editing.fontSize} onChange={e => setEditing(p => p ? { ...p, fontSize: e.target.value as 'small' | 'medium' | 'large' } : null)} aria-label="Font size"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete profile" style={{ ...bo, color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => { setProfiles(prev => prev.filter(p => p.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button style={bo} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default PrintingProfiles;
