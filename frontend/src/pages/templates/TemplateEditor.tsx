import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Save, Eye, ChevronLeft, Trash2, ChevronUp, ChevronDown,
    Type, Image, Table, Minus, Barcode, QrCode, Shield, Layers,
    Settings2, Sparkles, LayoutTemplate, CheckCircle, AlertTriangle,
    FileText, Bookmark, Building2, Receipt, ListOrdered, Package,
    StickyNote, Percent, CreditCard, Heart, Scale, PenLine,
    ZoomIn, ZoomOut, Printer, Upload, History, GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import './template-studio.css';

/* ═══════════════════════════════════════════════════════════
   Block Type Categories (Matching Reference Design)
   ═══════════════════════════════════════════════════════════ */

interface BlockDef {
    type: string;
    label: string;
    icon: React.ReactNode;
    defaultProps: Record<string, unknown>;
}

interface BlockCategory {
    title: string;
    blocks: BlockDef[];
}

const BLOCK_CATEGORIES: BlockCategory[] = [
    {
        title: 'Header Blocks',
        blocks: [
            { type: 'logo', label: 'Logo', icon: <Bookmark className="icon" />, defaultProps: { image_props: { url: '', width: 180, alignment: 'center', dithering: true } } },
            { type: 'venue_info', label: 'Venue Info', icon: <Building2 className="icon" />, defaultProps: { text_props: { content: '{{venue.name}}\n{{venue.address}}\n{{venue.phone}}', font_size: 12, bold: false, alignment: 'center', variable: null } } },
            { type: 'document_title', label: 'Document Title', icon: <FileText className="icon" />, defaultProps: { text_props: { content: 'ORDER TICKET', font_size: 16, bold: true, alignment: 'center', variable: null } } },
            { type: 'qr_barcode', label: 'QR / Barcode', icon: <QrCode className="icon" />, defaultProps: { barcode_props: { data_source: 'order.id', format: 'CODE128', height: 60, width: 2, show_text: true } } },
        ]
    },
    {
        title: 'Content Blocks',
        blocks: [
            { type: 'items_list', label: 'Items List', icon: <ListOrdered className="icon" />, defaultProps: { table_props: { columns: [{ key: 'name', label: 'Item', align: 'left' }, { key: 'qty', label: 'Qty', align: 'center' }, { key: 'price', label: 'Price', align: 'right' }], data_source: 'order.items', show_header: true, show_totals: false, group_by: 'none' } } },
            { type: 'grouped_items', label: 'Grouped Items', icon: <Package className="icon" />, defaultProps: { table_props: { columns: [{ key: 'name', label: 'Item', align: 'left' }, { key: 'qty', label: 'Qty', align: 'center' }, { key: 'price', label: 'Price', align: 'right' }], data_source: 'order.items', show_header: true, show_totals: false, group_by: 'category' } } },
            { type: 'notes', label: 'Notes', icon: <StickyNote className="icon" />, defaultProps: { text_props: { content: '{{order.notes}}', font_size: 11, bold: false, italic: true, alignment: 'left', variable: 'order.notes' } } },
            { type: 'discounts_charges', label: 'Discounts / Charges', icon: <Percent className="icon" />, defaultProps: { table_props: { columns: [{ key: 'label', label: 'Discount', align: 'left' }, { key: 'amount', label: 'Amount', align: 'right' }], data_source: 'order.discounts', show_header: false, show_totals: false } } },
            { type: 'payment_summary', label: 'Payment Summary', icon: <CreditCard className="icon" />, defaultProps: { table_props: { columns: [{ key: 'label', label: '', align: 'left' }, { key: 'value', label: '', align: 'right' }], data_source: 'order.payment_summary', show_header: false, show_totals: true } } },
            { type: 'text', label: 'Text', icon: <Type className="icon" />, defaultProps: { text_props: { content: 'Custom text', font_size: 12, bold: false, italic: false, underline: false, alignment: 'left', variable: null } } },
            { type: 'image', label: 'Image', icon: <Image className="icon" />, defaultProps: { image_props: { url: '', width: 200, alignment: 'center', dithering: true } } },
            { type: 'table', label: 'Custom Table', icon: <Table className="icon" />, defaultProps: { table_props: { columns: [{ key: 'col1', label: 'Column 1', align: 'left' }, { key: 'col2', label: 'Column 2', align: 'right' }], data_source: '', show_header: true, show_totals: false } } },
            { type: 'divider', label: 'Divider', icon: <Minus className="icon" />, defaultProps: { divider_props: { style: 'solid', thickness: 1 } } },
            { type: 'fiscal', label: 'Fiscal Block', icon: <Shield className="icon" />, defaultProps: { fiscal_props: { fiscal_id_variable: 'fiscal.receipt_id', fiscal_qr_variable: 'fiscal.qr_data', show_fiscal_id: true, show_fiscal_qr: true } } },
        ]
    },
    {
        title: 'Footer Blocks',
        blocks: [
            { type: 'thank_you', label: 'Thank You Line', icon: <Heart className="icon" />, defaultProps: { text_props: { content: 'Thank you for dining with us', font_size: 12, bold: false, italic: false, alignment: 'center', variable: null } } },
            { type: 'legal_footer', label: 'Legal Footer', icon: <Scale className="icon" />, defaultProps: { text_props: { content: '{{venue.legal_text}}', font_size: 9, bold: false, italic: false, alignment: 'center', variable: 'venue.legal_text' } } },
            { type: 'signature_line', label: 'Signature Line', icon: <PenLine className="icon" />, defaultProps: { text_props: { content: '________________________\nSignature', font_size: 10, bold: false, italic: false, alignment: 'center', variable: null } } },
        ]
    },
];

/* ═══════════════════════════════════════════════════════════
   Paper Profiles (Expanded)
   ═══════════════════════════════════════════════════════════ */

const PAPER_PROFILES = [
    { label: '58mm Thermal (100%)', width: '58mm', widthPx: 384, dpi: 203 },
    { label: '80mm Thermal (100%)', width: '80mm', widthPx: 576, dpi: 203 },
    { label: '80mm Thermal (80%)', width: '80mm', widthPx: 461, dpi: 203 },
    { label: '112mm Wide', width: '112mm', widthPx: 832, dpi: 203 },
    { label: 'A4 Portrait', width: 'A4', widthPx: 595, dpi: 72 },
    { label: 'A5 Portrait', width: 'A5', widthPx: 420, dpi: 72 },
    { label: 'Letter', width: 'Letter', widthPx: 612, dpi: 72 },
    { label: 'Label 100×50mm', width: 'Label100x50', widthPx: 400, dpi: 203 },
    { label: 'Label 62mm', width: 'Label62', widthPx: 496, dpi: 300 },
    { label: 'Custom', width: 'custom', widthPx: 576, dpi: 203 },
];

/* ═══════════════════════════════════════════════════════════
   Sidebar Tabs
   ═══════════════════════════════════════════════════════════ */

const SIDEBAR_TABS = [
    { id: 'templates', label: 'Templates', icon: <LayoutTemplate className="w-4 h-4" /> },
    { id: 'paper', label: 'Paper Profiles', icon: <FileText className="w-4 h-4" /> },
    { id: 'printer', label: 'Printer Routing', icon: <Printer className="w-4 h-4" /> },
    { id: 'assets', label: 'Assets', icon: <Upload className="w-4 h-4" /> },
    { id: 'imports', label: 'Imports / Exports', icon: <Package className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit', icon: <History className="w-4 h-4" /> },
];

/* ═══════════════════════════════════════════════════════════
   Template Editor (Full Redesign)
   ═══════════════════════════════════════════════════════════ */

export default function TemplateEditor() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isNew = !id || id === 'new';
    const venueId = user?.venueId || '';
    const userRole = (user?.role || '').toLowerCase();
    const canPublish = ['product_owner', 'owner', 'general_manager'].includes(userRole);

    /* ── State ──────────────────────────────────────────────── */
    const [sidebarTab, setSidebarTab] = useState('templates');
    const [viewMode, setViewMode] = useState<'canvas' | 'text'>('canvas');
    const [propsTab, setPropsTab] = useState<'properties' | 'conditional'>('properties');

    const [templateName, setTemplateName] = useState('Untitled Template');
    const [templateDesc, setTemplateDesc] = useState('');
    const [templateType, setTemplateType] = useState('receipt');
    const [templateStatus, setTemplateStatus] = useState('draft');
    const [blocks, setBlocks] = useState<Record<string, unknown>[]>([]);
    const [paperIdx, setPaperIdx] = useState(1); // default 80mm
    const [paperProfile, setPaperProfile] = useState({
        width: '80mm', margin_left: 4, margin_right: 4,
        margin_top: 2, margin_bottom: 2, cut_feed: 4, dpi: 203
    });
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [showThermal, setShowThermal] = useState(false);
    const [zoom, setZoom] = useState(100);

    const selectedBlock = useMemo(
        () => blocks.find((b: Record<string, unknown>) => b.id === selectedBlockId) || null,
        [blocks, selectedBlockId]
    );
    const currentPaper = PAPER_PROFILES[paperIdx];
    const paperWidthPx = Math.round((currentPaper?.widthPx || 576) * (zoom / 100));

    /* ── Load Template ──────────────────────────────────────── */
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
            }).catch(() => toast.error(t('Failed to load template')));
        }
    }, [isNew, id, t]);

    /* ── Block Actions ──────────────────────────────────────── */
    const addBlock = useCallback((bt: BlockDef) => {
        const b: Record<string, unknown> = {
            id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: bt.type,
            label: bt.label,
            order: blocks.length,
            section: bt.type === 'logo' || bt.type === 'venue_info' || bt.type === 'document_title' ? 'header'
                : bt.type === 'thank_you' || bt.type === 'legal_footer' || bt.type === 'signature_line' ? 'footer'
                    : 'body',
            show_if: null,
            ...bt.defaultProps
        };
        setBlocks(prev => [...prev, b]);
        setSelectedBlockId(b.id as string);
    }, [blocks.length]);

    const removeBlock = useCallback((bid: string) => {
        setBlocks(prev => prev.filter(b => b.id !== bid));
        if (selectedBlockId === bid) setSelectedBlockId(null);
    }, [selectedBlockId]);

    const moveBlock = useCallback((bid: string, dir: 'up' | 'down') => {
        setBlocks(prev => {
            const idx = prev.findIndex(b => b.id === bid);
            if (idx < 0) return prev;
            const arr = [...prev];
            const si = dir === 'up' ? idx - 1 : idx + 1;
            if (si < 0 || si >= arr.length) return prev;
            [arr[idx], arr[si]] = [arr[si], arr[idx]];
            return arr.map((b, i) => ({ ...b, order: i }));
        });
    }, []);

    const updateProp = useCallback((bid: string, pk: string, f: string, v: unknown) => {
        setBlocks(prev => prev.map(b =>
            b.id !== bid ? b : { ...b, [pk]: { ...((b[pk] as Record<string, unknown>) || {}), [f]: v } }
        ));
    }, []);

    const changePaper = useCallback((idx: number) => {
        setPaperIdx(idx);
        const p = PAPER_PROFILES[idx];
        if (p) {
            setPaperProfile(prev => ({
                ...prev,
                width: p.width,
                dpi: p.dpi
            }));
        }
    }, []);

    /* ── Save / Publish / Preview ───────────────────────────── */
    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { venue_id: venueId, name: templateName, description: templateDesc, type: templateType, blocks, paper_profile: paperProfile, tags: [] };
            if (isNew) {
                const res = await api.post('/templates', payload);
                toast.success(t('Template created'));
                navigate(`/admin/templates/${res.data.id}`, { replace: true });
            } else {
                await api.put(`/templates/${id}`, payload);
                toast.success(t('Template saved'));
            }
        } catch { toast.error(t('Failed to save')); }
        finally { setSaving(false); }
    };

    const handlePublish = async () => {
        if (!canPublish) { toast.error(t('No permission to publish')); return; }
        setPublishing(true);
        try {
            if (!isNew) await api.put(`/templates/${id}`, { venue_id: venueId, name: templateName, description: templateDesc, type: templateType, blocks, paper_profile: paperProfile });
            const res = await api.post(`/templates/${id}/publish`, { notes: '' });
            toast.success(`${t('Published')} v${res.data?.version?.version || ''}`);
            setTemplateStatus('active');
        } catch { toast.error(t('Publish failed')); }
        finally { setPublishing(false); }
    };

    const handlePreview = async () => {
        try {
            const res = await api.post('/templates/render', {
                template_id: id || 'preview', venue_id: venueId,
                data: {
                    venue: { name: 'Demo Restaurant', address: '123 Main St', phone: '+356 2123 4567', legal_text: 'VAT MT12345678' },
                    order: {
                        id: 'T-1234', table: 'A-2',
                        datetime: new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }),
                        items: [
                            { name: 'Grilled Wagyu Steak', qty: 1, price: '€38.00', category: 'Mains' },
                            { name: 'Spaghetti Truffle', qty: 1, price: '€18.50', category: 'Pasta' },
                            { name: 'Sauteed Mushrooms', qty: 1, price: '€10.00', category: 'Sides' },
                        ],
                        subtotal: '€66.50', service_fee: '€5.00', total: '€65.50',
                        discounts: [{ label: 'Ads was erste', amount: '-€4.00' }],
                        payment_summary: [{ label: 'Subtotal', value: '€66.50' }, { label: 'Service Fee', value: '€5.00' }, { label: 'Total', value: '€65.50' }],
                        notes: 'No nuts please',
                        payment_method: 'Visa'
                    },
                    fiscal: { receipt_id: 'FIS-2026-0042', qr_data: 'https://fiscal.gov.mt/verify/FIS-2026-0042' },
                    server: { name: 'Mario B.' },
                    datetime: new Date().toLocaleString()
                },
                output_format: 'html'
            });
            setPreviewHtml(res.data?.html || '<p>No preview</p>');
            setShowPreview(true);
        } catch { toast.error(t('Preview failed')); }
    };

    /* ═══════════════════════════════════════════════════════════
       Render Helper: Canvas Block
       ═══════════════════════════════════════════════════════════ */
    const renderBlockOnCanvas = (block: Record<string, unknown>) => {
        const tp = block.text_props as Record<string, unknown> | undefined;
        const ip = block.image_props as Record<string, unknown> | undefined;
        const tbp = block.table_props as Record<string, unknown> | undefined;
        const dp = block.divider_props as Record<string, unknown> | undefined;
        const bp = block.barcode_props as Record<string, unknown> | undefined;
        const qp = block.qr_props as Record<string, unknown> | undefined;
        const type = block.type as string;

        switch (type) {
            case 'logo':
                return (
                    <div className="ts-row" style={{ justifyContent: 'center', padding: '12px 0' }}>
                        <div style={{ width: 60, height: 60, borderRadius: 8, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Bookmark style={{ width: 28, height: 28, color: '#aaa' }} />
                        </div>
                    </div>
                );
            case 'venue_info':
            case 'document_title':
            case 'text':
            case 'notes':
            case 'thank_you':
            case 'legal_footer':
            case 'signature_line':
                return (
                    <div style={{
                        fontSize: `${tp?.font_size || 12}px`,
                        fontWeight: (tp?.bold) ? 'bold' : 'normal',
                        fontStyle: (tp?.italic) ? 'italic' : 'normal',
                        textDecoration: (tp?.underline) ? 'underline' : 'none',
                        textAlign: (tp?.alignment as 'left' | 'center' | 'right') || 'left',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {(tp?.variable as string) || (tp?.content as string) || 'Empty'}
                    </div>
                );
            case 'items_list':
            case 'grouped_items':
            case 'table':
            case 'discounts_charges':
            case 'payment_summary':
                return (
                    <div style={{ padding: '4px 0' }}>
                        {Boolean(tbp?.show_header) && (
                            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ccc', paddingBottom: 2, marginBottom: 4 }}>
                                {((tbp?.columns as Array<Record<string, string>>) || []).map((c, i) => (
                                    <div key={i} style={{ flex: 1, fontSize: 10, fontWeight: 600, textAlign: (c.align as 'left' | 'center' | 'right') || 'left', color: '#666' }}>{c.label}</div>
                                ))}
                            </div>
                        )}
                        <div style={{ fontSize: 11, color: '#888', padding: '4px 0' }}>
                            {type === 'items_list' ? '← Items from order.items →' :
                                type === 'grouped_items' ? '← Grouped by category →' :
                                    type === 'payment_summary' ? '← Payment totals →' :
                                        type === 'discounts_charges' ? '← Discounts & charges →' : '← Table data →'}
                        </div>
                    </div>
                );
            case 'divider':
                return <hr style={{ borderStyle: (dp?.style as string) || 'solid', borderColor: '#333', borderWidth: `${dp?.thickness || 1}px`, margin: '4px 0' }} />;
            case 'qr_barcode':
            case 'barcode':
                return (
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <Barcode style={{ width: 48, height: 24, margin: '0 auto', color: '#555' }} />
                        <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>{(bp?.data_source as string) || 'order.id'}</div>
                    </div>
                );
            case 'qr':
                return (
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <QrCode style={{ width: 40, height: 40, margin: '0 auto', color: '#555' }} />
                        <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>{(qp?.label as string) || 'QR Code'}</div>
                    </div>
                );
            case 'image':
                return (
                    <div style={{ textAlign: (ip?.alignment as string) || 'center', padding: '8px 0' }}>
                        <div style={{ display: 'inline-block', width: Number(ip?.width || 180), height: 60, background: '#f5f5f5', borderRadius: 4, display2: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Image style={{ width: 24, height: 24, color: '#ccc', margin: '0 auto', display: 'block', paddingTop: 18 }} />
                        </div>
                    </div>
                );
            case 'fiscal':
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4 }}>
                        <Shield style={{ width: 14, height: 14, color: '#d97706' }} />
                        <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Fiscal Block</span>
                    </div>
                );
            default:
                return <div style={{ fontSize: 11, color: '#999' }}>[{type}]</div>;
        }
    };

    /* ═══════════════════════════════════════════════════════════
       Render Helper: Properties Panel
       ═══════════════════════════════════════════════════════════ */
    const renderPropertiesPanel = () => {
        if (!selectedBlock) {
            return (
                <div className="ts-props-empty">
                    <Settings2 className="icon" />
                    <p style={{ fontSize: 13 }}>{t('Select a block to edit its properties')}</p>
                </div>
            );
        }

        const bid = selectedBlock.id as string;
        const type = selectedBlock.type as string;
        const tp = selectedBlock.text_props as Record<string, unknown> | undefined;
        const tbp = selectedBlock.table_props as Record<string, unknown> | undefined;
        const dp = selectedBlock.divider_props as Record<string, unknown> | undefined;
        const bp = selectedBlock.barcode_props as Record<string, unknown> | undefined;
        const qp = selectedBlock.qr_props as Record<string, unknown> | undefined;
        const ip = selectedBlock.image_props as Record<string, unknown> | undefined;

        const isTextType = ['text', 'venue_info', 'document_title', 'notes', 'thank_you', 'legal_footer', 'signature_line'].includes(type);
        const isTableType = ['items_list', 'grouped_items', 'table', 'discounts_charges', 'payment_summary'].includes(type);

        return (
            <div style={{ animation: 'ts-fadeIn 0.2s ease-out' }}>
                {/* Block Type Chip */}
                <div className="ts-row" style={{ marginBottom: 16, gap: 6 }}>
                    <span className="ts-type-chip active-chip">{(selectedBlock.label as string) || type}</span>
                    <span className="ts-type-chip normal" style={{ marginLeft: 'auto' }}>
                        {isTextType ? 'Normal' : isTableType ? 'Data' : type}
                    </span>
                </div>

                {/* Section selector */}
                <div className="ts-field">
                    <label className="ts-label" htmlFor="ts-section">{t('Section')}</label>
                    <select
                        id="ts-section"
                        title={t('Section')}
                        className="ts-select"
                        value={(selectedBlock.section as string) || 'body'}
                        onChange={e => setBlocks(prev => prev.map(b => b.id === bid ? { ...b, section: e.target.value } : b))}
                    >
                        <option value="header">Header</option>
                        <option value="body">Body</option>
                        <option value="footer">Footer</option>
                    </select>
                </div>

                {/* Text-based block properties */}
                {isTextType && (
                    <>
                        <div className="ts-field">
                            <label className="ts-label" htmlFor="ts-content">{t('Content')}</label>
                            <textarea
                                id="ts-content"
                                className="ts-textarea"
                                rows={3}
                                value={(tp?.content as string) || ''}
                                onChange={e => updateProp(bid, 'text_props', 'content', e.target.value)}
                                placeholder={t('Enter text content...')}
                            />
                        </div>
                        <div className="ts-grid-2">
                            <div className="ts-field">
                                <label className="ts-label" htmlFor="ts-size">{t('Size')}</label>
                                <input
                                    id="ts-size"
                                    type="number" min={6} max={48}
                                    className="ts-input"
                                    value={Number(tp?.font_size || 12)}
                                    onChange={e => updateProp(bid, 'text_props', 'font_size', Number(e.target.value))}
                                />
                            </div>
                            <div className="ts-field">
                                <label className="ts-label" htmlFor="ts-align">{t('Alignment')}</label>
                                <select
                                    id="ts-align"
                                    title={t('Alignment')}
                                    className="ts-select"
                                    value={(tp?.alignment as string) || 'left'}
                                    onChange={e => updateProp(bid, 'text_props', 'alignment', e.target.value)}
                                >
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                        </div>
                        <div className="ts-field">
                            <label className="ts-label">{t('Style')}</label>
                            <div className="ts-row" style={{ gap: 12 }}>
                                {(['bold', 'italic', 'underline'] as const).map(s => (
                                    <label key={s} className="ts-checkbox-row" style={{ fontSize: 12 }}>
                                        <input
                                            type="checkbox"
                                            checked={Boolean(tp?.[s])}
                                            onChange={e => updateProp(bid, 'text_props', s, e.target.checked)}
                                        />
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="ts-field">
                            <label className="ts-label" htmlFor="ts-variable">{t('Variable')}</label>
                            <input
                                id="ts-variable"
                                type="text"
                                className="ts-input"
                                value={(tp?.variable as string) || ''}
                                onChange={e => updateProp(bid, 'text_props', 'variable', e.target.value || null)}
                                placeholder="{{venue.name}}"
                                style={{ fontFamily: 'monospace' }}
                            />
                        </div>
                        {/* Advanced text options */}
                        <div className="ts-field">
                            <div className="ts-checkbox-row">
                                <input type="checkbox" id="ts-show-modifiers" />
                                <label htmlFor="ts-show-modifiers">{t('Show modifiers')}</label>
                            </div>
                            <div className="ts-checkbox-row">
                                <input type="checkbox" id="ts-show-notes" />
                                <label htmlFor="ts-show-notes">{t('Show notes')}</label>
                            </div>
                            <div className="ts-checkbox-row">
                                <input type="checkbox" id="ts-hide-prices" />
                                <label htmlFor="ts-hide-prices">{t('Hide prices')}</label>
                            </div>
                            <div className="ts-checkbox-row">
                                <input type="checkbox" id="ts-compact" />
                                <label htmlFor="ts-compact">{t('Compact mode')}</label>
                            </div>
                        </div>
                    </>
                )}

                {/* Table-based block properties */}
                {isTableType && (
                    <>
                        <div className="ts-field">
                            <label className="ts-label" htmlFor="ts-datasource">{t('Data Source')}</label>
                            <input
                                id="ts-datasource"
                                type="text"
                                className="ts-input"
                                value={(tbp?.data_source as string) || ''}
                                onChange={e => updateProp(bid, 'table_props', 'data_source', e.target.value)}
                                placeholder="order.items"
                                style={{ fontFamily: 'monospace' }}
                            />
                        </div>
                        <div className="ts-field">
                            <label className="ts-label" htmlFor="ts-groupby">{t('Group by')}</label>
                            <select
                                id="ts-groupby"
                                title={t('Group by')}
                                className="ts-select"
                                value={(tbp?.group_by as string) || 'none'}
                                onChange={e => updateProp(bid, 'table_props', 'group_by', e.target.value)}
                            >
                                <option value="none">None</option>
                                <option value="category">Category</option>
                                <option value="course">Course</option>
                                <option value="seat">Seat</option>
                            </select>
                        </div>
                        <div className="ts-checkbox-row">
                            <input type="checkbox" id="ts-show-header" checked={Boolean(tbp?.show_header)} onChange={e => updateProp(bid, 'table_props', 'show_header', e.target.checked)} />
                            <label htmlFor="ts-show-header">{t('Show header')}</label>
                        </div>
                        <div className="ts-checkbox-row">
                            <input type="checkbox" id="ts-show-totals" checked={Boolean(tbp?.show_totals)} onChange={e => updateProp(bid, 'table_props', 'show_totals', e.target.checked)} />
                            <label htmlFor="ts-show-totals">{t('Show totals')}</label>
                        </div>
                        <div className="ts-field">
                            <label className="ts-label">{t('Max chars per line')}</label>
                            <select title={t('Max chars per line')} className="ts-select">
                                <option value="auto">Auto</option>
                                <option value="32">32</option>
                                <option value="42">42</option>
                                <option value="48">48</option>
                            </select>
                        </div>
                        <div className="ts-checkbox-row">
                            <input type="checkbox" id="ts-divider-line" />
                            <label htmlFor="ts-divider-line">{t('Divider line')}</label>
                        </div>
                    </>
                )}

                {/* Divider */}
                {type === 'divider' && (
                    <div className="ts-field">
                        <label className="ts-label" htmlFor="ts-div-style">{t('Style')}</label>
                        <select
                            id="ts-div-style"
                            title={t('Divider style')}
                            className="ts-select"
                            value={(dp?.style as string) || 'solid'}
                            onChange={e => updateProp(bid, 'divider_props', 'style', e.target.value)}
                        >
                            <option value="solid">Solid ─────</option>
                            <option value="dashed">Dashed - - - -</option>
                            <option value="dotted">Dotted · · · · ·</option>
                            <option value="double">Double ═════</option>
                        </select>
                    </div>
                )}

                {/* Barcode / QR */}
                {(type === 'qr_barcode' || type === 'barcode') && (
                    <>
                        <div className="ts-field">
                            <label className="ts-label" htmlFor="ts-bc-src">{t('Data Source')}</label>
                            <input id="ts-bc-src" type="text" className="ts-input" style={{ fontFamily: 'monospace' }} value={(bp?.data_source as string) || ''} onChange={e => updateProp(bid, 'barcode_props', 'data_source', e.target.value)} />
                        </div>
                        <div className="ts-field">
                            <label className="ts-label" htmlFor="ts-bc-format">{t('Format')}</label>
                            <select id="ts-bc-format" title={t('Barcode format')} className="ts-select" value={(bp?.format as string) || 'CODE128'} onChange={e => updateProp(bid, 'barcode_props', 'format', e.target.value)}>
                                <option value="CODE128">CODE128</option>
                                <option value="QR">QR Code</option>
                                <option value="EAN13">EAN-13</option>
                                <option value="UPC">UPC-A</option>
                            </select>
                        </div>
                    </>
                )}

                {/* Image */}
                {(type === 'image' || type === 'logo') && (
                    <>
                        <div className="ts-field">
                            <label className="ts-label" htmlFor="ts-img-url">{t('Image URL')}</label>
                            <input id="ts-img-url" type="text" className="ts-input" value={(ip?.url as string) || ''} onChange={e => updateProp(bid, type === 'logo' ? 'image_props' : 'image_props', 'url', e.target.value)} placeholder="https://..." />
                        </div>
                        <div className="ts-grid-2">
                            <div className="ts-field">
                                <label className="ts-label" htmlFor="ts-img-w">{t('Width')}</label>
                                <input id="ts-img-w" type="number" min={20} max={576} className="ts-input" value={Number(ip?.width || 180)} onChange={e => updateProp(bid, 'image_props', 'width', Number(e.target.value))} />
                            </div>
                            <div className="ts-field">
                                <label className="ts-label" htmlFor="ts-img-align">{t('Align')}</label>
                                <select id="ts-img-align" title={t('Alignment')} className="ts-select" value={(ip?.alignment as string) || 'center'} onChange={e => updateProp(bid, 'image_props', 'alignment', e.target.value)}>
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    /* ═══════════════════════════════════════════════════════════
       Render Helper: Conditional Panel
       ═══════════════════════════════════════════════════════════ */
    const renderConditionalPanel = () => {
        if (!selectedBlock) return <div className="ts-props-empty"><p style={{ fontSize: 13 }}>{t('Select a block first')}</p></div>;

        return (
            <div style={{ animation: 'ts-fadeIn 0.2s ease-out' }}>
                <div className="ts-field">
                    <div className="ts-checkbox-row">
                        <input type="checkbox" id="ts-gated" />
                        <label htmlFor="ts-gated" style={{ fontWeight: 600 }}>{t('Gated')}</label>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>
                        {t('Show this block only when conditions are met')}
                    </p>
                </div>

                <div className="ts-condition-row">
                    <div>
                        <div className="ts-condition-label">{t('Field')}</div>
                        <select title={t('Field')} className="ts-select" style={{ fontSize: 11 }}>
                            <option value="">Select...</option>
                            <option value="order.type">Order Type</option>
                            <option value="order.total">Order Total</option>
                            <option value="order.channel">Channel</option>
                            <option value="fiscal.enabled">Fiscal Enabled</option>
                        </select>
                    </div>
                    <div>
                        <div className="ts-condition-label">{t('Op')}</div>
                        <select title={t('Operator')} className="ts-select" style={{ fontSize: 11 }}>
                            <option value="eq">=</option>
                            <option value="ne">≠</option>
                            <option value="gt">&gt;</option>
                            <option value="lt">&lt;</option>
                            <option value="exists">exists</option>
                        </select>
                    </div>
                    <div>
                        <div className="ts-condition-label">{t('Value')}</div>
                        <input type="text" className="ts-input" style={{ fontSize: 11 }} placeholder="..." />
                    </div>
                </div>

                <div className="ts-row" style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>Sz 24 V</span>
                </div>
            </div>
        );
    };

    /* ═══════════════════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════════════════ */
    return (
        <div className="ts-root">
            {/* ── Top Header ─────────────────────────────────────── */}
            <div className="ts-header">
                <div className="ts-row" style={{ gap: 12 }}>
                    <button
                        onClick={() => navigate('/admin/templates')}
                        className="ts-zoom-btn"
                        title={t('Back to templates')}
                    >
                        <ChevronLeft style={{ width: 20, height: 20 }} />
                    </button>
                    <div>
                        <div className="ts-row" style={{ gap: 8 }}>
                            <LayoutTemplate style={{ width: 18, height: 18, color: 'hsl(267 100% 72%)' }} />
                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>
                                {t('Template Wizard')}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="ts-row" style={{ gap: 8 }}>
                    {templateStatus === 'active' && (
                        <span className="ts-type-chip active-chip" style={{ gap: 4 }}>
                            <CheckCircle style={{ width: 12, height: 12 }} />
                            {t('Published')}
                        </span>
                    )}
                    {!isNew && (
                        <button onClick={handlePreview} className="ts-btn ts-btn-ghost" title={t('Preview')}>
                            <Eye style={{ width: 16, height: 16 }} />
                            {t('Preview')}
                        </button>
                    )}
                    <button onClick={handleSave} disabled={saving} className="ts-btn ts-btn-save" title={t('Save Draft')}>
                        <Save style={{ width: 16, height: 16 }} />
                        {saving ? t('Saving...') : t('Save Draft')}
                    </button>
                    {canPublish && !isNew && (
                        <button onClick={handlePublish} disabled={publishing} className="ts-btn ts-btn-primary" title={t('Publish')}>
                            <Sparkles style={{ width: 16, height: 16 }} />
                            {publishing ? t('Publishing...') : t('Publish')}
                        </button>
                    )}
                    {!canPublish && !isNew && (
                        <div className="ts-type-chip" style={{ background: 'hsl(45 93% 47% / 0.1)', color: 'hsl(45 93% 47%)', border: '1px solid hsl(45 93% 47% / 0.2)', fontSize: 11 }}>
                            <AlertTriangle style={{ width: 12, height: 12 }} />
                            {t('GM/Owner can publish')}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Toolbar bar ────────────────────────────────────── */}
            <div className="ts-toolbar">
                {/* View tabs */}
                <div className="ts-toolbar-tabs">
                    <button className={`ts-toolbar-tab ${viewMode === 'canvas' ? 'active' : ''}`} onClick={() => setViewMode('canvas')}>
                        {t('Canvas')}
                    </button>
                    <button className={`ts-toolbar-tab ${viewMode === 'text' ? 'active' : ''}`} onClick={() => setViewMode('text')}>
                        {t('Text & Publish')}
                    </button>
                </div>

                <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 8px' }} />

                {/* Template name input */}
                <input
                    type="text"
                    className="ts-input"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder={t('Template name...')}
                    title={t('Template name')}
                    style={{ width: 200, background: 'transparent', border: 'none', fontWeight: 600, fontSize: 13 }}
                />

                <div style={{ flex: 1 }} />

                {/* Paper profile selector */}
                <select
                    className="ts-paper-select"
                    title={t('Paper profile')}
                    value={paperIdx}
                    onChange={e => changePaper(Number(e.target.value))}
                >
                    {PAPER_PROFILES.map((p, i) => (
                        <option key={p.width + i} value={i}>{p.label}</option>
                    ))}
                </select>

                {/* Template type */}
                <select
                    className="ts-paper-select"
                    title={t('Template type')}
                    value={templateType}
                    onChange={e => setTemplateType(e.target.value)}
                    style={{ marginLeft: 6 }}
                >
                    <option value="receipt">{t('Receipt')}</option>
                    <option value="kot">{t('Kitchen Order')}</option>
                    <option value="invoice">{t('Invoice')}</option>
                    <option value="report">{t('Report')}</option>
                    <option value="label">{t('Label')}</option>
                    <option value="custom">{t('Custom')}</option>
                </select>

                <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 8px' }} />

                {/* Zoom */}
                <div className="ts-zoom">
                    <button className="ts-zoom-btn" onClick={() => setZoom(z => Math.max(z - 10, 40))} title={t('Zoom out')}>
                        <ZoomOut style={{ width: 14, height: 14 }} />
                    </button>
                    <span style={{ minWidth: 32, textAlign: 'center' }}>{zoom}%</span>
                    <button className="ts-zoom-btn" onClick={() => setZoom(z => Math.min(z + 10, 200))} title={t('Zoom in')}>
                        <ZoomIn style={{ width: 14, height: 14 }} />
                    </button>
                </div>
            </div>

            {/* ── Body (3-Panel) ─────────────────────────────────── */}
            <div className="ts-body">
                {/* Left Sidebar */}
                <div className="ts-sidebar">
                    {/* Nav tabs */}
                    <div className="ts-sidebar-nav">
                        {SIDEBAR_TABS.map(tab => (
                            <button
                                key={tab.id}
                                className={`ts-sidebar-nav-item ${sidebarTab === tab.id ? 'active' : ''}`}
                                onClick={() => setSidebarTab(tab.id)}
                            >
                                {tab.icon}
                                <span>{t(tab.label)}</span>
                            </button>
                        ))}
                    </div>

                    {/* Block palette (only when on templates tab) */}
                    {sidebarTab === 'templates' && (
                        <div className="ts-blocks-panel">
                            {BLOCK_CATEGORIES.map(cat => (
                                <div key={cat.title} className="ts-block-category">
                                    <div className="ts-block-category-title">{t(cat.title)}</div>
                                    {cat.blocks.map(bt => (
                                        <button
                                            key={bt.type}
                                            className="ts-block-item"
                                            onClick={() => addBlock(bt)}
                                            title={t(`Add ${bt.label} block`)}
                                        >
                                            {bt.icon}
                                            <span>{t(bt.label)}</span>
                                        </button>
                                    ))}
                                </div>
                            ))}
                            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textAlign: 'center', marginTop: 12, opacity: 0.6 }}>
                                {t('Drag blocks to build your template')}
                            </div>
                        </div>
                    )}

                    {/* Paper Profiles tab */}
                    {sidebarTab === 'paper' && (
                        <div className="ts-blocks-panel">
                            <div className="ts-block-category-title">{t('Paper Profiles')}</div>
                            {PAPER_PROFILES.map((p, i) => (
                                <button
                                    key={p.width + i}
                                    className={`ts-block-item ${paperIdx === i ? 'active' : ''}`}
                                    onClick={() => changePaper(i)}
                                    style={paperIdx === i ? { background: 'hsl(267 100% 64% / 0.12)', color: 'hsl(267 100% 72%)', borderColor: 'hsl(267 100% 64% / 0.3)' } : {}}
                                >
                                    <FileText className="icon" />
                                    <span>{p.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Other tabs — placeholder */}
                    {!['templates', 'paper'].includes(sidebarTab) && (
                        <div className="ts-blocks-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
                            <p style={{ fontSize: 12, textAlign: 'center' }}>{t(`${SIDEBAR_TABS.find(t2 => t2.id === sidebarTab)?.label || ''} — Coming Soon`)}</p>
                        </div>
                    )}
                </div>

                {/* Center: Canvas */}
                <div className="ts-canvas-area">
                    <div className="ts-paper" style={{ width: paperWidthPx }}>
                        {/* Top tear */}
                        <div className="ts-paper-tear" />

                        {/* Paper content */}
                        <div className="ts-paper-content" style={{
                            paddingLeft: paperProfile.margin_left * 2,
                            paddingRight: paperProfile.margin_right * 2,
                            paddingTop: paperProfile.margin_top * 2,
                            paddingBottom: paperProfile.margin_bottom * 2,
                            fontSize: `${Math.round(12 * (zoom / 100))}px`
                        }}>
                            {blocks.length === 0 ? (
                                <div className="ts-canvas-empty">
                                    <LayoutTemplate className="icon" />
                                    <p>{t('Drag blocks to build your template')}</p>
                                </div>
                            ) : blocks.map(block => (
                                <div
                                    key={block.id as string}
                                    className={`ts-canvas-block ${block.id === selectedBlockId ? 'selected' : ''}`}
                                    onClick={() => setSelectedBlockId(block.id as string)}
                                >
                                    {renderBlockOnCanvas(block)}

                                    {/* Hover actions */}
                                    <div className="ts-canvas-block-actions">
                                        <button className="ts-canvas-block-action" title={t('Move up')} onClick={e => { e.stopPropagation(); moveBlock(block.id as string, 'up'); }}>
                                            <ChevronUp style={{ width: 12, height: 12 }} />
                                        </button>
                                        <button className="ts-canvas-block-action" title={t('Move down')} onClick={e => { e.stopPropagation(); moveBlock(block.id as string, 'down'); }}>
                                            <ChevronDown style={{ width: 12, height: 12 }} />
                                        </button>
                                        <button className="ts-canvas-block-action delete" title={t('Remove block')} onClick={e => { e.stopPropagation(); removeBlock(block.id as string); }}>
                                            <Trash2 style={{ width: 12, height: 12 }} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bottom tear */}
                        <div className="ts-paper-tear" />
                    </div>
                </div>

                {/* Right: Properties Panel */}
                <div className="ts-props-panel">
                    <div className="ts-props-tabs">
                        <button
                            className={`ts-props-tab ${propsTab === 'properties' ? 'active' : ''}`}
                            onClick={() => setPropsTab('properties')}
                        >
                            {t('Properties')}
                        </button>
                        <button
                            className={`ts-props-tab ${propsTab === 'conditional' ? 'active' : ''}`}
                            onClick={() => setPropsTab('conditional')}
                        >
                            {t('Conditional')}
                        </button>
                    </div>
                    <div className="ts-props-content">
                        {propsTab === 'properties' ? renderPropertiesPanel() : renderConditionalPanel()}
                    </div>
                </div>
            </div>

            {/* ── Preview Modal ──────────────────────────────────── */}
            {showPreview && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 50,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)'
                }}>
                    <div style={{
                        background: 'var(--card)', border: '1px solid var(--border)',
                        borderRadius: 16, maxWidth: 640, width: '100%',
                        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                            <div className="ts-row" style={{ gap: 8 }}>
                                <Eye style={{ width: 18, height: 18, color: 'hsl(267 100% 72%)' }} />
                                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>{t('Preview')}</span>
                            </div>
                            <div className="ts-row" style={{ gap: 6 }}>
                                <button
                                    className={`ts-toolbar-tab ${showThermal ? 'active' : ''}`}
                                    onClick={() => setShowThermal(!showThermal)}
                                    style={{ padding: '4px 12px', borderRadius: 6 }}
                                >
                                    {t('Thermal')}
                                </button>
                                <button className="ts-zoom-btn" onClick={() => setShowPreview(false)} title={t('Close')}>✕</button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', justifyContent: 'center', background: 'hsl(240 5% 12%)' }}>
                            <div
                                className={showThermal ? 'ts-paper' : ''}
                                style={{
                                    background: '#fff', width: currentPaper.widthPx,
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                                    filter: showThermal ? 'grayscale(100%) contrast(180%)' : 'none'
                                }}
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
