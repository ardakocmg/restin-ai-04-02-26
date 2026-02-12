import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Save, Eye, ChevronLeft, Grip, Trash2, ChevronDown, ChevronUp,
    Type, Image, Table, Minus, Barcode, QrCode, Shield, Layers,
    Settings2, Sparkles, LayoutTemplate, CheckCircle, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

/* ── Block Type Definitions ─────────────────────────────── */
const BLOCK_TYPES = [
    {
        type: 'text', label: 'Text', icon: <Type className="w-4 h-4" />,
        defaultProps: { text_props: { content: 'New text', font_size: 12, bold: false, italic: false, underline: false, alignment: 'left', variable: null } }
    },
    {
        type: 'image', label: 'Image', icon: <Image className="w-4 h-4" />,
        defaultProps: { image_props: { url: '', width: 200, alignment: 'center', dithering: true } }
    },
    {
        type: 'table', label: 'Table', icon: <Table className="w-4 h-4" />,
        defaultProps: { table_props: { columns: [{ key: 'name', label: 'Item', align: 'left' }, { key: 'qty', label: 'Qty', align: 'center' }, { key: 'price', label: 'Price', align: 'right' }], data_source: 'order.items', show_header: true, show_totals: true } }
    },
    {
        type: 'divider', label: 'Divider', icon: <Minus className="w-4 h-4" />,
        defaultProps: { divider_props: { style: 'solid', thickness: 1 } }
    },
    {
        type: 'barcode', label: 'Barcode', icon: <Barcode className="w-4 h-4" />,
        defaultProps: { barcode_props: { data_source: 'order.id', format: 'CODE128', height: 60, width: 2, show_text: true } }
    },
    {
        type: 'qr', label: 'QR Code', icon: <QrCode className="w-4 h-4" />,
        defaultProps: { qr_props: { data_source: 'order.payment_url', size: 150, error_correction: 'M', label: '' } }
    },
    {
        type: 'fiscal', label: 'Fiscal', icon: <Shield className="w-4 h-4" />,
        defaultProps: { fiscal_props: { fiscal_id_variable: 'fiscal.receipt_id', fiscal_qr_variable: 'fiscal.qr_data', show_fiscal_id: true, show_fiscal_qr: true } }
    }
];

const PAPER_PRESETS = [
    { label: '80mm (Standard)', width: '80mm', widthPx: 576 },
    { label: '58mm (Narrow)', width: '58mm', widthPx: 384 }
];

/* ── Template Editor Page ───────────────────────────────── */
export default function TemplateEditor() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isNew = !id || id === 'new';
    const venueId = user?.venueId || '';
    const userRole = (user?.role || '').toLowerCase();
    const canPublish = ['product_owner', 'owner', 'general_manager'].includes(userRole);

    const [templateName, setTemplateName] = useState('Untitled Template');
    const [templateDesc, setTemplateDesc] = useState('');
    const [templateType, setTemplateType] = useState('receipt');
    const [templateStatus, setTemplateStatus] = useState('draft');
    const [blocks, setBlocks] = useState<any[]>([]);
    const [paperProfile, setPaperProfile] = useState({ width: '80mm', margin_left: 4, margin_right: 4, margin_top: 2, margin_bottom: 2, cut_feed: 4, dpi: 203 });
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [showThermal, setShowThermal] = useState(false);

    const selectedBlock = useMemo(() => blocks.find(b => b.id === selectedBlockId), [blocks, selectedBlockId]);
    const paperWidthPx = paperProfile.width === '80mm' ? 576 : 384;

    useEffect(() => {
        if (!isNew && id) {
            api.get(`/templates/${id}`).then(res => {
                const d = res.data;
                setTemplateName(d.name || 'Untitled');
                setTemplateDesc(d.description || '');
                setTemplateType(d.type || 'receipt');
                setTemplateStatus(d.status || 'draft');
                setBlocks(d.blocks || []);
                if (d.paper_profile) setPaperProfile(d.paper_profile);
            }).catch(() => toast.error('Failed to load template'));
        }
    }, [isNew, id]);

    const addBlock = (bt: typeof BLOCK_TYPES[0]) => {
        const b = { id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type: bt.type, label: bt.label, order: blocks.length, section: 'body', show_if: null, ...bt.defaultProps };
        setBlocks(prev => [...prev, b]);
        setSelectedBlockId(b.id);
    };

    const removeBlock = (bid: string) => { setBlocks(prev => prev.filter(b => b.id !== bid)); if (selectedBlockId === bid) setSelectedBlockId(null); };

    const moveBlock = (bid: string, dir: 'up' | 'down') => {
        setBlocks(prev => {
            const idx = prev.findIndex(b => b.id === bid);
            if (idx < 0) return prev;
            const arr = [...prev]; const si = dir === 'up' ? idx - 1 : idx + 1;
            if (si < 0 || si >= arr.length) return prev;
            [arr[idx], arr[si]] = [arr[si], arr[idx]];
            return arr.map((b, i) => ({ ...b, order: i }));
        });
    };

    const updateProp = (bid: string, pk: string, f: string, v: unknown) => {
        setBlocks(prev => prev.map(b => b.id !== bid ? b : { ...b, [pk]: { ...(b[pk] || {}), [f]: v } }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { venue_id: venueId, name: templateName, description: templateDesc, type: templateType, blocks, paper_profile: paperProfile, tags: [] };
            if (isNew) { const res = await api.post('/templates', payload); toast.success('Template created'); navigate(`/admin/templates/${res.data.id}`, { replace: true }); }
            else { await api.put(`/templates/${id}`, payload); toast.success('Template saved'); }
        } catch { toast.error('Failed to save'); } finally { setSaving(false); }
    };

    const handlePublish = async () => {
        if (!canPublish) { toast.error('No permission to publish'); return; }
        setPublishing(true);
        try {
            if (!isNew) await api.put(`/templates/${id}`, { venue_id: venueId, name: templateName, description: templateDesc, type: templateType, blocks, paper_profile: paperProfile });
            const res = await api.post(`/templates/${id}/publish`, { notes: '' });
            toast.success(`Published v${res.data?.version?.version || ''}`);
            setTemplateStatus('active');
        } catch { toast.error('Publish failed'); } finally { setPublishing(false); }
    };

    const handlePreview = async () => {
        try {
            const res = await api.post('/templates/render', {
                template_id: id || 'preview', venue_id: venueId,
                data: { venue: { name: 'Demo Restaurant', address: '123 Main St' }, order: { id: 'ORD-001', total: '€24.50', subtotal: '€21.00', tax: '€3.50', items: [{ name: 'Margherita', qty: 1, price: '€12.00' }, { name: 'Salad', qty: 1, price: '€9.00' }] }, fiscal: { receipt_id: 'FIS-2026-0042', qr_data: 'https://fiscal.gov.mt/verify/FIS-2026-0042' }, server: { name: 'Mario B.' }, datetime: new Date().toLocaleString() },
                output_format: 'html'
            });
            setPreviewHtml(res.data?.html || '<p>No preview</p>');
            setShowPreview(true);
        } catch { toast.error('Preview failed'); }
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/admin/templates')} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"><ChevronLeft className="w-5 h-5" /></button>
                    <div className="flex flex-col">
                        <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} className="text-lg font-bold bg-transparent text-foreground border-none outline-none p-0" placeholder="Template name..." />
                        <span className="text-xs text-muted-foreground">{templateStatus === 'active' && <CheckCircle className="w-3 h-3 inline mr-1 text-emerald-400" />}{templateStatus} • {paperProfile.width}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isNew && <button onClick={handlePreview} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-sm font-medium transition-all"><Eye className="w-4 h-4" />{t('Preview')}</button>}
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-border hover:bg-muted text-foreground text-sm font-medium transition-all disabled:opacity-50"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Draft'}</button>
                    {canPublish && !isNew && <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-violet-600/20"><Sparkles className="w-4 h-4" />{publishing ? 'Publishing...' : 'Publish'}</button>}
                    {!canPublish && !isNew && <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium"><AlertTriangle className="w-3.5 h-3.5" />GM/Owner can publish</div>}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Block Palette */}
                <div className="w-56 border-r border-border bg-card overflow-y-auto p-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Blocks</h3>
                    <div className="space-y-1.5">
                        {BLOCK_TYPES.map(bt => (
                            <button key={bt.type} onClick={() => addBlock(bt)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/50 hover:bg-violet-500/10 hover:text-violet-400 text-muted-foreground text-sm font-medium transition-all border border-transparent hover:border-violet-500/20">{bt.icon}{bt.label}</button>
                        ))}
                    </div>
                    <div className="mt-6">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" />Paper</h3>
                        {PAPER_PRESETS.map(p => (
                            <button key={p.width} onClick={() => setPaperProfile(prev => ({ ...prev, width: p.width }))} className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-all ${paperProfile.width === p.width ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'}`}>{p.label}</button>
                        ))}
                    </div>
                    <div className="mt-4">
                        <select value={templateType} onChange={e => setTemplateType(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                            <option value="receipt">Receipt</option>
                            <option value="kot">Kitchen Order</option>
                            <option value="invoice">Invoice</option>
                            <option value="report">Report</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                </div>

                {/* Center: Canvas */}
                <div className="flex-1 overflow-auto bg-muted/20 p-8 flex justify-center">
                    <div className="bg-white rounded-lg shadow-2xl shadow-black/20 overflow-hidden" style={{ width: `${paperWidthPx}px`, minHeight: '600px' }}>
                        <div className="p-4 min-h-[600px]" style={{ paddingLeft: `${paperProfile.margin_left * 2}px`, paddingRight: `${paperProfile.margin_right * 2}px`, fontFamily: "'Courier New', monospace", fontSize: '12px', color: '#000' }}>
                            {blocks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[400px] text-zinc-400"><LayoutTemplate className="w-12 h-12 mb-3" /><p className="text-sm font-medium">Click a block type to add</p></div>
                            ) : blocks.map(block => (
                                <div key={block.id} className={`relative group rounded-lg border-2 ${block.id === selectedBlockId ? 'border-violet-500 shadow-lg shadow-violet-500/10' : 'border-transparent hover:border-zinc-300'} p-2 mb-1 cursor-pointer transition-all`} onClick={() => setSelectedBlockId(block.id)}>
                                    {block.type === 'text' && <div style={{ fontSize: `${block.text_props?.font_size || 12}px`, fontWeight: block.text_props?.bold ? 'bold' : 'normal', fontStyle: block.text_props?.italic ? 'italic' : 'normal', textAlign: block.text_props?.alignment || 'left' }}>{block.text_props?.variable || block.text_props?.content || 'Empty'}</div>}
                                    {block.type === 'image' && <div className="flex items-center justify-center py-4 bg-zinc-100 rounded"><Image className="w-8 h-8 text-zinc-400" /><span className="ml-2 text-xs text-zinc-400">Image</span></div>}
                                    {block.type === 'table' && <div className="bg-zinc-100 rounded p-2"><div className="grid grid-cols-3 gap-1 text-xs">{(block.table_props?.columns || []).map((c: any, i: number) => <div key={i} className="px-2 py-1 bg-zinc-200 rounded text-zinc-600 font-medium">{c.label}</div>)}</div></div>}
                                    {block.type === 'divider' && <hr style={{ borderStyle: block.divider_props?.style || 'solid', borderColor: '#333', borderWidth: `${block.divider_props?.thickness || 1}px` }} />}
                                    {block.type === 'barcode' && <div className="text-center py-2"><Barcode className="w-12 h-6 mx-auto text-zinc-700" /><span className="text-xs text-zinc-500">{block.barcode_props?.data_source}</span></div>}
                                    {block.type === 'qr' && <div className="text-center py-2"><QrCode className="w-10 h-10 mx-auto text-zinc-700" /><span className="text-xs text-zinc-500">{block.qr_props?.label || 'QR'}</span></div>}
                                    {block.type === 'fiscal' && <div className="flex items-center gap-2 py-2 px-3 bg-amber-50 rounded border border-amber-200"><Shield className="w-4 h-4 text-amber-600" /><span className="text-xs text-amber-700 font-medium">Fiscal Block</span></div>}
                                    <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={e => { e.stopPropagation(); moveBlock(block.id, 'up'); }} className="p-1 rounded bg-white/80 text-zinc-500 hover:text-zinc-800"><ChevronUp className="w-3 h-3" /></button>
                                        <button onClick={e => { e.stopPropagation(); moveBlock(block.id, 'down'); }} className="p-1 rounded bg-white/80 text-zinc-500 hover:text-zinc-800"><ChevronDown className="w-3 h-3" /></button>
                                        <button onClick={e => { e.stopPropagation(); removeBlock(block.id); }} className="p-1 rounded bg-white/80 text-zinc-500 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Properties */}
                <div className="w-72 border-l border-border bg-card overflow-y-auto p-4">
                    {selectedBlock ? (
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Settings2 className="w-4 h-4 text-violet-400" />Properties</h3>
                            <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">Type: <span className="text-foreground font-medium">{selectedBlock.type}</span></div>
                            <div>
                                <label className="text-xs text-muted-foreground font-medium">Section</label>
                                <select value={selectedBlock.section || 'body'} onChange={e => setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, section: e.target.value } : b))} className="w-full mt-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"><option value="header">Header</option><option value="body">Body</option><option value="footer">Footer</option></select>
                            </div>
                            {selectedBlock.type === 'text' && <>
                                <div><label className="text-xs text-muted-foreground font-medium">Content</label><textarea value={selectedBlock.text_props?.content || ''} onChange={e => updateProp(selectedBlock.id, 'text_props', 'content', e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
                                <div><label className="text-xs text-muted-foreground font-medium">Variable</label><input type="text" value={selectedBlock.text_props?.variable || ''} onChange={e => updateProp(selectedBlock.id, 'text_props', 'variable', e.target.value || null)} placeholder="{{venue.name}}" className="w-full mt-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none font-mono" /></div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className="text-xs text-muted-foreground font-medium">Size</label><input type="number" min={6} max={48} value={selectedBlock.text_props?.font_size || 12} onChange={e => updateProp(selectedBlock.id, 'text_props', 'font_size', Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none" /></div>
                                    <div><label className="text-xs text-muted-foreground font-medium">Align</label><select value={selectedBlock.text_props?.alignment || 'left'} onChange={e => updateProp(selectedBlock.id, 'text_props', 'alignment', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
                                </div>
                                <div className="flex items-center gap-3">{(['bold', 'italic', 'underline'] as const).map(s => <label key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"><input type="checkbox" checked={selectedBlock.text_props?.[s] || false} onChange={e => updateProp(selectedBlock.id, 'text_props', s, e.target.checked)} className="rounded border-border" />{s.charAt(0).toUpperCase() + s.slice(1)}</label>)}</div>
                            </>}
                            {selectedBlock.type === 'divider' && <>
                                <div><label className="text-xs text-muted-foreground font-medium">Style</label><select value={selectedBlock.divider_props?.style || 'solid'} onChange={e => updateProp(selectedBlock.id, 'divider_props', 'style', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none"><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option><option value="double">Double</option></select></div>
                            </>}
                            {selectedBlock.type === 'barcode' && <div><label className="text-xs text-muted-foreground font-medium">Data Source</label><input type="text" value={selectedBlock.barcode_props?.data_source || ''} onChange={e => updateProp(selectedBlock.id, 'barcode_props', 'data_source', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none font-mono" /></div>}
                            {selectedBlock.type === 'qr' && <>
                                <div><label className="text-xs text-muted-foreground font-medium">Data Source</label><input type="text" value={selectedBlock.qr_props?.data_source || ''} onChange={e => updateProp(selectedBlock.id, 'qr_props', 'data_source', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none font-mono" /></div>
                                <div><label className="text-xs text-muted-foreground font-medium">Size</label><input type="number" min={50} max={300} value={selectedBlock.qr_props?.size || 150} onChange={e => updateProp(selectedBlock.id, 'qr_props', 'size', Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none" /></div>
                            </>}
                            {selectedBlock.type === 'image' && <>
                                <div><label className="text-xs text-muted-foreground font-medium">URL</label><input type="text" value={selectedBlock.image_props?.url || ''} onChange={e => updateProp(selectedBlock.id, 'image_props', 'url', e.target.value)} placeholder="https://..." className="w-full mt-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none" /></div>
                                <div><label className="text-xs text-muted-foreground font-medium">Width</label><input type="number" min={20} max={576} value={selectedBlock.image_props?.width || 200} onChange={e => updateProp(selectedBlock.id, 'image_props', 'width', Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none" /></div>
                            </>}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center"><Settings2 className="w-8 h-8 text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">Select a block to edit</p></div>
                    )}
                </div>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2"><Eye className="w-5 h-5 text-violet-400" />Preview</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowThermal(!showThermal)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showThermal ? 'bg-violet-500/20 text-violet-400' : 'bg-muted text-muted-foreground'}`}>Thermal</button>
                                <button onClick={() => setShowPreview(false)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">✕</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-6 flex justify-center bg-zinc-800">
                            <div className={`bg-white shadow-2xl ${showThermal ? 'grayscale contrast-200' : ''}`} style={{ width: `${paperWidthPx}px` }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
