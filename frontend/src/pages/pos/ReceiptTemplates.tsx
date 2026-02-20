/**
 * ReceiptTemplates.tsx — K-Series Receipt Templates
 * Customize receipt layout: header, footer, logo, fields
 * Lightspeed K-Series Back Office > Configuration > Receipt Templates parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, X, FileText, Eye, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';

interface ReceiptTemplate {
    id: string; name: string; type: 'customer' | 'kitchen' | 'report' | 'notes' | 'invoice'; isDefault: boolean; isActive: boolean;
    headerLine1: string; headerLine2: string; headerLine3: string;
    showLogo: boolean; showDateTime: boolean; showServer: boolean; showTable: boolean; showOrderNumber: boolean;
    showItemPrices: boolean; showTax: boolean; showPaymentMethod: boolean; showTipLine: boolean;
    footerLine1: string; footerLine2: string; footerLine3: string;
    qrCodeUrl: string; qrGuestConsole: boolean; invoicePrefix: string;
    paperWidth: '58mm' | '80mm'; fontSize: 'small' | 'medium' | 'large';
}

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };
const rw: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' };

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
    <div style={{ width: 44, height: 24, borderRadius: 12, background: value ? '#3B82F6' : '#3f3f46', cursor: 'pointer', position: 'relative' }} onClick={onChange}>
        <div style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
);

const SEED: ReceiptTemplate[] = [
    { id: '1', name: 'Standard Receipt', type: 'customer', isDefault: true, isActive: true, headerLine1: 'Restin Restaurant', headerLine2: '123 Triq il-Kbira, Valletta', headerLine3: 'Tel: +356 2123 4567', showLogo: true, showDateTime: true, showServer: true, showTable: true, showOrderNumber: true, showItemPrices: true, showTax: true, showPaymentMethod: true, showTipLine: true, footerLine1: 'Thank you for dining with us!', footerLine2: 'WiFi: RestinGuest / Pass: welcome2024', footerLine3: '', qrCodeUrl: 'https://restin.ai/feedback', qrGuestConsole: true, invoicePrefix: '', paperWidth: '80mm', fontSize: 'medium' },
    { id: '2', name: 'Takeaway Receipt', type: 'customer', isDefault: false, isActive: true, headerLine1: 'Restin Restaurant', headerLine2: 'Order for Pickup/Delivery', headerLine3: '', showLogo: true, showDateTime: true, showServer: false, showTable: false, showOrderNumber: true, showItemPrices: true, showTax: true, showPaymentMethod: true, showTipLine: false, footerLine1: 'Thank you for your order!', footerLine2: '', footerLine3: '', qrCodeUrl: '', qrGuestConsole: false, invoicePrefix: '', paperWidth: '80mm', fontSize: 'medium' },
    { id: '3', name: 'Kitchen Ticket', type: 'kitchen', isDefault: true, isActive: true, headerLine1: '', headerLine2: '', headerLine3: '', showLogo: false, showDateTime: true, showServer: true, showTable: true, showOrderNumber: true, showItemPrices: false, showTax: false, showPaymentMethod: false, showTipLine: false, footerLine1: '', footerLine2: '', footerLine3: '', qrCodeUrl: '', qrGuestConsole: false, invoicePrefix: '', paperWidth: '80mm', fontSize: 'large' },
    { id: '4', name: 'End of Day Report', type: 'report', isDefault: true, isActive: true, headerLine1: 'Daily Summary Report', headerLine2: '', headerLine3: '', showLogo: true, showDateTime: true, showServer: false, showTable: false, showOrderNumber: false, showItemPrices: true, showTax: true, showPaymentMethod: true, showTipLine: false, footerLine1: '', footerLine2: '', footerLine3: '', qrCodeUrl: '', qrGuestConsole: false, invoicePrefix: '', paperWidth: '80mm', fontSize: 'small' },
    { id: '5', name: 'Invoice', type: 'invoice', isDefault: true, isActive: true, headerLine1: 'Restin Restaurant Ltd', headerLine2: 'VAT: MT1234567', headerLine3: '', showLogo: true, showDateTime: true, showServer: false, showTable: true, showOrderNumber: true, showItemPrices: true, showTax: true, showPaymentMethod: true, showTipLine: false, footerLine1: 'This is a fiscal invoice', footerLine2: '', footerLine3: '', qrCodeUrl: '', qrGuestConsole: false, invoicePrefix: 'INV-', paperWidth: '80mm', fontSize: 'medium' },
];

const ReceiptTemplates: React.FC = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState(SEED);
    const [editing, setEditing] = useState<ReceiptTemplate | null>(null);
    const [preview, setPreview] = useState<ReceiptTemplate | null>(null);
    const [isLive, setIsLive] = useState(false);

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiData } = useVenueConfig<ReceiptTemplate>({ venueId, configType: 'receipt-templates' });
    useEffect(() => {
        if (apiData && apiData.length > 0) {
            setTemplates(apiData.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (t: any) => ({ id: t.id || t._id || crypto.randomUUID(), name: t.name || '', type: t.type || 'customer', isDefault: t.isDefault ?? t.is_default ?? false, isActive: t.isActive ?? t.is_active ?? true, headerLine1: t.headerLine1 ?? t.header_line_1 ?? '', headerLine2: t.headerLine2 ?? t.header_line_2 ?? '', headerLine3: t.headerLine3 ?? t.header_line_3 ?? '', showLogo: t.showLogo ?? t.show_logo ?? true, showDateTime: t.showDateTime ?? t.show_date_time ?? true, showServer: t.showServer ?? t.show_server ?? true, showTable: t.showTable ?? t.show_table ?? true, showOrderNumber: t.showOrderNumber ?? t.show_order_number ?? true, showItemPrices: t.showItemPrices ?? t.show_item_prices ?? true, showTax: t.showTax ?? t.show_tax ?? true, showPaymentMethod: t.showPaymentMethod ?? t.show_payment_method ?? true, showTipLine: t.showTipLine ?? t.show_tip_line ?? true, footerLine1: t.footerLine1 ?? t.footer_line_1 ?? '', footerLine2: t.footerLine2 ?? t.footer_line_2 ?? '', footerLine3: t.footerLine3 ?? t.footer_line_3 ?? '', qrCodeUrl: t.qrCodeUrl ?? t.qr_code_url ?? '', qrGuestConsole: t.qrGuestConsole ?? t.qr_guest_console ?? false, invoicePrefix: t.invoicePrefix ?? t.invoice_prefix ?? '', paperWidth: t.paperWidth ?? t.paper_width ?? '80mm', fontSize: t.fontSize ?? t.font_size ?? 'medium' }))); setIsLive(true);
        }
    }, [apiData]);

    const save = () => { if (!editing) return; const e = templates.find(t => t.id === editing.id); if (e) setTemplates(p => p.map(t => t.id === editing.id ? editing : t)); else setTemplates(p => [...p, editing]); setEditing(null); toast.success('Saved'); };

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Receipt Templates {isLive && <Wifi size={14} style={{ color: '#10B981', verticalAlign: 'middle', marginLeft: 6 }} />}</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Customize receipt layouts for customer receipts, kitchen tickets, and reports</p>
                </div>
                <button style={bp} onClick={() => setEditing({ id: crypto.randomUUID(), name: '', type: 'customer', isDefault: false, isActive: true, headerLine1: '', headerLine2: '', headerLine3: '', showLogo: true, showDateTime: true, showServer: true, showTable: true, showOrderNumber: true, showItemPrices: true, showTax: true, showPaymentMethod: true, showTipLine: true, footerLine1: '', footerLine2: '', footerLine3: '', qrCodeUrl: '', qrGuestConsole: false, invoicePrefix: '', paperWidth: '80mm', fontSize: 'medium' })}><Plus size={16} /> Add Template</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                {templates.map(t => (
                    <div key={t.id} style={{ ...cd, cursor: 'pointer' }} onClick={() => setEditing({ ...t })}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FileText size={16} style={{ color: t.type === 'customer' ? '#3B82F6' : t.type === 'kitchen' ? '#F59E0B' : '#10B981' }} />
                                <div><h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{t.name}</h3>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{t.type}</span></div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {t.isDefault && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>DEFAULT</span>}
                                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: t.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: t.isActive ? '#10B981' : '#EF4444' }}>{t.isActive ? 'Active' : 'Off'}</span>
                            </div>
                        </div>
                        {t.headerLine1 && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, fontStyle: 'italic' }}>"{t.headerLine1}"</div>}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{t.paperWidth}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Font: {t.fontSize}</span>
                            {t.showLogo && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Logo ✓</span>}
                            {t.showTipLine && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Tip Line ✓</span>}
                            {t.qrCodeUrl && <span style={{ fontSize: 10, color: '#06B6D4' }}>QR ✓</span>}
                            {t.invoicePrefix && <span style={{ fontSize: 10, color: '#F59E0B' }}>Invoice: {t.invoicePrefix}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                            <button style={{ ...bo, padding: '4px 10px', fontSize: 11 }} onClick={e => { e.stopPropagation(); setPreview(t); }}><Eye size={12} /> Preview</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

            {/* Edit Modal */}
            {editing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
                <div style={{ ...cd, width: 520, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{templates.find(t => t.id === editing.id) ? 'Edit' : 'New'} Template</h3>
                        <button title="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name *</label>
                            <input style={ip} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} aria-label="Template name" /></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Type</label>
                            <select style={{ ...ip, cursor: 'pointer' }} value={editing.type} onChange={e => setEditing(p => p ? { ...p, type: e.target.value as ReceiptTemplate['type'] } : null)} aria-label="Template type"><option value="customer">Customer</option><option value="kitchen">Kitchen</option><option value="report">Report</option><option value="notes">Notes</option><option value="invoice">Invoice</option></select></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input type="checkbox" checked={editing.isDefault} onChange={() => setEditing(p => p ? { ...p, isDefault: !p.isDefault } : null)} /> Set as default for this type
                        </label>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Header</div>
                    {(['headerLine1', 'headerLine2', 'headerLine3'] as const).map((key, i) => <div key={key} style={{ marginBottom: 8 }}>
                        <input style={{ ...ip, padding: '8px 12px', fontSize: 12 }} value={editing[key]} onChange={e => setEditing(p => p ? { ...p, [key]: e.target.value } : null)} placeholder={`Header line ${i + 1}`} />
                    </div>)}
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Fields</div>
                    <div style={{ ...cd, background: 'var(--bg-secondary,#09090b)', padding: 12, marginBottom: 14 }}>
                        {([['showLogo', 'Show Logo'], ['showDateTime', 'Date & Time'], ['showServer', 'Server Name'], ['showTable', 'Table Number'], ['showOrderNumber', 'Order Number'], ['showItemPrices', 'Item Prices'], ['showTax', 'Tax Breakdown'], ['showPaymentMethod', 'Payment Method'], ['showTipLine', 'Tip Line']] as const).map(([key, label]) =>
                            <div key={key} style={rw}><span style={{ fontSize: 13 }}>{label}</span><Toggle value={editing[key]} onChange={() => setEditing(p => p ? { ...p, [key]: !p[key] } : null)} /></div>
                        )}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Footer</div>
                    {(['footerLine1', 'footerLine2', 'footerLine3'] as const).map((key, i) => <div key={key} style={{ marginBottom: 8 }}>
                        <input style={{ ...ip, padding: '8px 12px', fontSize: 12 }} value={editing[key]} onChange={e => setEditing(p => p ? { ...p, [key]: e.target.value } : null)} placeholder={`Footer line ${i + 1}`} />
                    </div>)}
                    {/* QR & Invoice Section */}
                    <div style={{ ...cd, background: 'var(--bg-secondary,#09090b)', padding: 12, marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>QR Code & Invoice</div>
                        <div style={{ marginBottom: 8 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>QR Code URL</label>
                            <input style={{ ...ip, padding: '8px 12px', fontSize: 12 }} value={editing.qrCodeUrl} onChange={e => setEditing(p => p ? { ...p, qrCodeUrl: e.target.value } : null)} placeholder="https://example.com/feedback" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <input type="checkbox" checked={editing.qrGuestConsole} onChange={() => setEditing(p => p ? { ...p, qrGuestConsole: !p.qrGuestConsole } : null)} /> QR links to Guest Console
                            </label>
                        </div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Invoice Prefix</label>
                            <input style={{ ...ip, padding: '8px 12px', fontSize: 12 }} value={editing.invoicePrefix} onChange={e => setEditing(p => p ? { ...p, invoicePrefix: e.target.value } : null)} placeholder="e.g. INV-" maxLength={10} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14, marginTop: 10 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Paper Width</label>
                            <select style={{ ...ip, cursor: 'pointer' }} value={editing.paperWidth} onChange={e => setEditing(p => p ? { ...p, paperWidth: e.target.value as '58mm' | '80mm' } : null)} aria-label="Paper width"><option value="58mm">58mm</option><option value="80mm">80mm</option></select></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Font Size</label>
                            <select style={{ ...ip, cursor: 'pointer' }} value={editing.fontSize} onChange={e => setEditing(p => p ? { ...p, fontSize: e.target.value as 'small' | 'medium' | 'large' } : null)} aria-label="Font size"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete template" style={{ ...bo, color: '#EF4444' }} onClick={() => { setTemplates(p => p.filter(t => t.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button style={bo} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}

            {/* Preview Modal */}
            {preview && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setPreview(null)}>
                <div style={{ background: '#fff', color: '#000', width: 300, borderRadius: 8, padding: 20, fontFamily: 'monospace', fontSize: 12 }} onClick={e => e.stopPropagation()}>
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                        {preview.showLogo && <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🍽️</div>}
                        {preview.headerLine1 && <div style={{ fontWeight: 700 }}>{preview.headerLine1}</div>}
                        {preview.headerLine2 && <div>{preview.headerLine2}</div>}
                        {preview.headerLine3 && <div>{preview.headerLine3}</div>}
                    </div>
                    <div style={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '8px 0', marginBottom: 8 }}>
                        {preview.showDateTime && <div>Date: 19/02/2026 14:32</div>}
                        {preview.showOrderNumber && <div>Order: #1042</div>}
                        {preview.showServer && <div>Server: Sofia C.</div>}
                        {preview.showTable && <div>Table: T-12</div>}
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>1x Margherita</span>{preview.showItemPrices && <span>€12.50</span>}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>1x Caesar Salad</span>{preview.showItemPrices && <span>€9.80</span>}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>2x House Wine</span>{preview.showItemPrices && <span>€16.00</span>}</div>
                    </div>
                    {preview.showTax && <div style={{ borderTop: '1px dashed #ccc', padding: '4px 0', fontSize: 10 }}>VAT 18%: €5.73</div>}
                    <div style={{ borderTop: '1px solid #000', padding: '4px 0', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}><span>TOTAL</span><span>€38.30</span></div>
                    {preview.showPaymentMethod && <div style={{ fontSize: 10, marginTop: 4 }}>Paid: Visa ****4242</div>}
                    {preview.showTipLine && <div style={{ borderTop: '1px dashed #ccc', marginTop: 8, paddingTop: 8 }}>Tip: _________ Total: _________</div>}
                    <div style={{ textAlign: 'center', marginTop: 12, fontSize: 10 }}>
                        {preview.footerLine1 && <div>{preview.footerLine1}</div>}
                        {preview.footerLine2 && <div>{preview.footerLine2}</div>}
                    </div>
                    <button style={{ ...bp, width: '100%', justifyContent: 'center', marginTop: 12, background: '#333' }} onClick={() => setPreview(null)}>Close Preview</button>
                </div>
            </div>}
        </div>
    );
};

export default ReceiptTemplates;
