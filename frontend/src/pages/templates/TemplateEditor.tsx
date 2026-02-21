import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Save, Eye, ChevronLeft, Trash2, ChevronUp, ChevronDown,
    Type, Image, Table, Minus, Barcode, QrCode, Shield, Layers,
    Settings2, Sparkles, LayoutTemplate, CheckCircle, AlertTriangle,
    FileText, Bookmark, Building2, Receipt, ListOrdered, Package,
    StickyNote, Percent, CreditCard, Heart, Scale, PenLine,
    ZoomIn, ZoomOut, Printer, Upload, History, GripVertical,
    Download, Copy, Plus, Wifi, WifiOff, Clock, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import './template-studio.css';
import CanvasBlockRenderer from './CanvasBlockRenderer';
import PropertiesPanel from './PropertiesPanel';
import ConditionalPanel from './ConditionalPanel';

/* ═══════════════════════════════════════════════════════════
   Block Type Categories (Matching Reference Design)
   ═══════════════════════════════════════════════════════════ */

interface BlockDef {
    type: string;
    label: string;
    icon: React.ReactNode;
    defaultProps: /**/any;
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
    const [blocks, setBlocks] = useState</**/any[]>([]);
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

    /* ── Drag & Drop state ─────────────────────────────────── */
    const [draggingBlockType, setDraggingBlockType] = useState<BlockDef | null>(null);
    const [draggingCanvasId, setDraggingCanvasId] = useState<string | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

    /* ── Sidebar tab data ──────────────────────────────────── */
    const [assets, setAssets] = useState<Array<{ id: string; name: string; url: string }>>([]);
    const [versions, setVersions] = useState<Array<{ version: number; published_at: string; notes: string }>>([]);
    const [auditLog, setAuditLog] = useState<Array<{ action: string; user: string; timestamp: string }>>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const assetInputRef = useRef<HTMLInputElement>(null);

    const selectedBlock = useMemo(
        () => blocks.find((b: /**/any) => b.id === selectedBlockId) || null,
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
                setBlocks(Array.isArray(d.blocks) ? d.blocks : []);
                if (d.paper_profile) setPaperProfile(d.paper_profile);
            }).catch(() => toast.error(t('Failed to load template')));
        }
    }, [isNew, id, t]);

    /* ── Load sidebar data when tabs change ─────────────────── */
    useEffect(() => {
        if (!id || isNew) return;
        if (sidebarTab === 'assets') {
            api.get(`/templates/${id}/assets`).then(r => setAssets(Array.isArray(r.data) ? r.data : [])).catch(() => setAssets([]));
        } else if (sidebarTab === 'audit') {
            api.get(`/templates/${id}/audit`).then(r => setAuditLog(Array.isArray(r.data) ? r.data : [])).catch(() => setAuditLog([]));
        }
    }, [sidebarTab, id, isNew]);

    useEffect(() => {
        if (!id || isNew) return;
        if (viewMode === 'text') {
            api.get(`/templates/${id}/versions`).then(r => setVersions(Array.isArray(r.data) ? r.data : [])).catch(() => setVersions([]));
        }
    }, [viewMode, id, isNew]);

    /* ── Block Actions ──────────────────────────────────────── */
    const addBlock = useCallback((bt: BlockDef) => {
        const b: /**/any = {
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
            b.id !== bid ? b : { ...b, [pk]: { ...((b[pk] as /**/any) || {}), [f]: v } }
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

    /* ── Drag & Drop ────────────────────────────────────────── */
    const handlePaletteDragStart = useCallback((e: React.DragEvent, bt: BlockDef) => {
        setDraggingBlockType(bt);
        e.dataTransfer.effectAllowed = 'copy';
    }, []);

    const handleCanvasDragStart = useCallback((e: React.DragEvent, blockId: string) => {
        setDraggingCanvasId(blockId);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleCanvasDragOver = useCallback((e: React.DragEvent, idx: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = draggingBlockType ? 'copy' : 'move';
        setDragOverIdx(idx);
    }, [draggingBlockType]);

    const handleCanvasDrop = useCallback((e: React.DragEvent, targetIdx: number) => {
        e.preventDefault();
        if (draggingBlockType) {
            const b: /**/any = {
                id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                type: draggingBlockType.type,
                label: draggingBlockType.label,
                order: targetIdx,
                section: draggingBlockType.type === 'logo' || draggingBlockType.type === 'venue_info' || draggingBlockType.type === 'document_title' ? 'header'
                    : draggingBlockType.type === 'thank_you' || draggingBlockType.type === 'legal_footer' || draggingBlockType.type === 'signature_line' ? 'footer' : 'body',
                show_if: null,
                block_width: 100,
                ...draggingBlockType.defaultProps
            };
            setBlocks(prev => {
                const arr = [...prev];
                arr.splice(targetIdx, 0, b);
                return arr.map((bl, i) => ({ ...bl, order: i }));
            });
            setSelectedBlockId(b.id as string);
        } else if (draggingCanvasId) {
            setBlocks(prev => {
                const fromIdx = prev.findIndex(b => b.id === draggingCanvasId);
                if (fromIdx < 0) return prev;
                const arr = [...prev];
                const [moved] = arr.splice(fromIdx, 1);
                const insertAt = targetIdx > fromIdx ? targetIdx - 1 : targetIdx;
                arr.splice(insertAt, 0, moved);
                return arr.map((bl, i) => ({ ...bl, order: i }));
            });
        }
        setDraggingBlockType(null);
        setDraggingCanvasId(null);
        setDragOverIdx(null);
    }, [draggingBlockType, draggingCanvasId]);

    const handleDragEnd = useCallback(() => {
        setDraggingBlockType(null);
        setDraggingCanvasId(null);
        setDragOverIdx(null);
    }, []);

    /* ── Export / Import ────────────────────────────────────── */
    const exportTemplate = useCallback(() => {
        const data = { name: templateName, description: templateDesc, type: templateType, blocks, paper_profile: paperProfile };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${templateName.replace(/\s+/g, '_').toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t('Template exported'));
    }, [templateName, templateDesc, templateType, blocks, paperProfile, t]);

    const importTemplate = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (data.name) setTemplateName(data.name);
                if (data.description) setTemplateDesc(data.description);
                if (data.type) setTemplateType(data.type);
                if (data.blocks) setBlocks(data.blocks);
                if (data.paper_profile) setPaperProfile(data.paper_profile);
                toast.success(t('Template imported'));
            } catch { toast.error(t('Invalid template file')); }
        };
        reader.readAsText(file);
        e.target.value = '';
    }, [t]);

    const handleAssetUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await api.post(`/templates/${id}/assets`, fd);
            setAssets(prev => [...prev, res.data]);
            toast.success(t('Asset uploaded'));
        } catch { toast.error(t('Upload failed')); }
        e.target.value = '';
    }, [id, t]);

    /* ── Save / Publish / Preview ───────────────────────────── */
    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { venue_id: venueId, name: templateName, description: templateDesc, type: templateType, blocks, paper_profile: paperProfile, tags: [] };
            if (isNew) {
                const res = await api.post('/templates', payload);
                toast.success(t('Template created'));
                navigate(`/manager/templates/${res.data.id}`, { replace: true });
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
            setPreviewHtml(res.data?.html || '<p>{"No "}preview</p>');
            setShowPreview(true);
        } catch { toast.error(t('Preview failed')); }
    };

    /* ── Render helpers extracted to separate components ── */

    /* ═══════════════════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════════════════ */
    return (
        <div className="ts-root">
            {/* ── Top Header ─────────────────────────────────────── */}
            <div className="ts-header">
                <div className="ts-row" style={{ gap: 12  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                    <button
                        onClick={() => navigate('/manager/templates')}
                        className="ts-zoom-btn"
                        title={t('Back to templates')}
                    >
                        <ChevronLeft style={{ width: 20, height: 20  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                    </button>
                    <div>
                        <div className="ts-row" style={{ gap: 8  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                            <LayoutTemplate style={{ width: 18, height: 18, color: 'hsl(267 100% 72%)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                {t('Template Wizard')}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="ts-row" style={{ gap: 8  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                    {templateStatus === 'active' && (
                        <span className="ts-type-chip active-chip" style={{ gap: 4  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                            <CheckCircle style={{ width: 12, height: 12  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                            {t('Published')}
                        </span>
                    )}
                    {!isNew && (
                        <button onClick={handlePreview} className="ts-btn ts-btn-ghost" title={t('Preview')}>
                            <Eye style={{ width: 16, height: 16  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                            {t('Preview')}
                        </button>
                    )}
                    <button onClick={handleSave} disabled={saving} className="ts-btn ts-btn-save" title={t('Save Draft')}>
                        <Save style={{ width: 16, height: 16  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                        {saving ? t('Saving...') : t('Save Draft')}
                    </button>
                    {canPublish && !isNew && (
                        <button onClick={handlePublish} disabled={publishing} className="ts-btn ts-btn-primary" title={t('Publish')}>
                            <Sparkles style={{ width: 16, height: 16  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                            {publishing ? t('Publishing...') : t('Publish')}
                        </button>
                    )}
                    {!canPublish && !isNew && (
                        <div className="ts-type-chip" style={{ background: 'hsl(45 93% 47% / 0.1)', color: 'hsl(45 93% 47%)', border: '1px solid hsl(45 93% 47% / 0.2)', fontSize: 11  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                            <AlertTriangle style={{ width: 12, height: 12  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
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

                <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 8px'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />

                {/* Template name input */}
                <input aria-label="Input"
                    type="text"
                    className="ts-input"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder={t('Template name...')}
                    title={t('Template name')}
                    style={{ width: 200, background: 'transparent', border: 'none', fontWeight: 600, fontSize: 13  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                />

                <div style={{ flex: 1  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />

                {/* Paper profile selector */}
                <select aria-label="Input"
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
                <select aria-label="Input"
                    className="ts-paper-select"
                    title={t('Template type')}
                    value={templateType}
                    onChange={e => setTemplateType(e.target.value)}
                    style={{ marginLeft: 6  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                >
                    <option value="receipt">{t('Receipt')}</option>
                    <option value="kot">{t('Kitchen Order')}</option>
                    <option value="invoice">{t('Invoice')}</option>
                    <option value="report">{t('Report')}</option>
                    <option value="label">{t('Label')}</option>
                    <option value="custom">{t('Custom')}</option>
                </select>

                <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 8px'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />

                {/* Zoom */}
                <div className="ts-zoom">
                    <button className="ts-zoom-btn" onClick={() => setZoom(z => Math.max(z - 10, 40))} title={t('Zoom out')}>
                        <ZoomOut style={{ width: 14, height: 14  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                    </button>
                    <span style={{ minWidth: 32, textAlign: 'center'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{zoom}%</span>
                    <button className="ts-zoom-btn" onClick={() => setZoom(z => Math.min(z + 10, 200))} title={t('Zoom in')}>
                        <ZoomIn style={{ width: 14, height: 14  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
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
                                            className={`ts-block-item ${draggingBlockType?.type === bt.type ? 'dragging' : ''}`}
                                            onClick={() => addBlock(bt)}
                                            title={t(`Add ${bt.label} block`)}
                                            draggable
                                            onDragStart={e => handlePaletteDragStart(e, bt)}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <GripVertical className="icon" style={{ width: 12, height: 12, opacity: 0.3  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                                            {bt.icon}
                                            <span>{t(bt.label)}</span>
                                        </button>
                                    ))}
                                </div>
                            ))}
                            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textAlign: 'center', marginTop: 12, opacity: 0.6  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
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

                    {/* Printer Routing tab */}
                    {sidebarTab === 'printer' && (
                        <div className="ts-blocks-panel">
                            <div className="ts-block-category-title">{t('Printer Routing')}</div>
                            {[
                                { name: 'Kitchen Printer', ip: '192.168.1.100', port: '9100', types: 'KOT', online: true },
                                { name: 'Bar Printer', ip: '192.168.1.101', port: '9100', types: 'KOT (Bar)', online: true },
                                { name: 'Receipt Printer', ip: '192.168.1.102', port: '9100', types: 'Receipt, Invoice', online: false },
                            ].map(pr => (
                                <div key={pr.name} className="ts-printer-card">
                                    <div className="ts-printer-card-header">
                                        <strong>{pr.name}</strong>
                                        <span className={`ts-printer-status ${pr.online ? 'online' : 'offline'}`}>
                                            {pr.online ? <><Wifi style={{ width: 10, height: 10  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ /> Online</> : <><WifiOff style={{ width: 10, height: 10  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ /> Offline</>}
                                        </span>
                                    </div>
                                    <div className="ts-printer-card-meta">
                                        <span>{pr.ip}:{pr.port}</span>
                                        <span>{pr.types}</span>
                                    </div>
                                </div>
                            ))}
                            <button className="ts-block-item" style={{ justifyContent: 'center', marginTop: 8  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                <Plus className="icon" />
                                <span>{t('Add Printer')}</span>
                            </button>
                        </div>
                    )}

                    {/* Assets tab */}
                    {sidebarTab === 'assets' && (
                        <div className="ts-blocks-panel">
                            <div className="ts-block-category-title">{t('Assets')}</div>
                            <div className="ts-asset-grid">
                                <div className="ts-asset-upload" onClick={() => assetInputRef.current?.click()}>
                                    <Upload className="icon" />
                                    <span>{t('Upload')}</span>
                                </div>
                                {assets.map(a => (
                                    <div key={a.id} className="ts-asset-card" onClick={() => { navigator.clipboard.writeText(a.url); toast.success(t('URL copied')); }}>
                                        <Image className="icon" style={{ width: 24, height: 24, color: 'var(--muted-foreground)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                                        <div className="ts-asset-overlay"><span>{a.name}</span></div>
                                    </div>
                                ))}
                            </div>
                            <input ref={assetInputRef} type="file" accept="image/*" onChange={handleAssetUpload} style={{ display: 'none'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */  aria-label="Input field" />
                        </div>
                    )}

                    {/* Import / Export tab */}
                    {sidebarTab === 'imports' && (
                        <div className="ts-blocks-panel">
                            <div className="ts-block-category-title">{t('Import / Export')}</div>
                            <button className="ts-export-btn" onClick={exportTemplate}>
                                <Download className="icon" />
                                <div>
                                    {t('Export as JSON')}
                                    <span className="ts-export-desc">{t('Download template configuration')}</span>
                                </div>
                            </button>
                            <button className="ts-export-btn" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="icon" />
                                <div>
                                    {t('Import from JSON')}
                                    <span className="ts-export-desc">{t('Load a saved template file')}</span>
                                </div>
                            </button>
                            <input ref={fileInputRef} type="file" accept=".json" onChange={importTemplate} style={{ display: 'none'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */  aria-label="Input field" />
                        </div>
                    )}

                    {/* Audit tab */}
                    {sidebarTab === 'audit' && (
                        <div className="ts-blocks-panel">
                            <div className="ts-block-category-title">{t('Audit Trail')}</div>
                            {auditLog.length === 0 ? (
                                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', textAlign: 'center', padding: '24px 0', opacity: 0.6  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                    {t('No audit entries yet')}
                                </div>
                            ) : auditLog.map((entry, i) => (
                                <div key={i} className="ts-audit-row">
                                    <div className="ts-audit-dot" />
                                    <div className="ts-audit-body">
                                        <strong>{entry.action}</strong>
                                        <small>{entry.user} · {new Date(entry.timestamp).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Center: Canvas or Text View */}
                {viewMode === 'canvas' ? (
                    <div className={`ts-canvas-area ${draggingBlockType || draggingCanvasId ? 'drag-active' : ''}`}
                        onDragOver={e => { e.preventDefault(); if (blocks.length === 0) setDragOverIdx(0); }}
                        onDrop={e => handleCanvasDrop(e, blocks.length)}
                    >
                        <div className="ts-paper" style={{ width: paperWidthPx  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                            {/* Top tear */}
                            <div className="ts-paper-tear" />

                            {/* Paper content */}
                            <div className="ts-paper-content" style={{ /* keep-inline */
                                paddingLeft: paperProfile.margin_left * 2,
                                paddingRight: paperProfile.margin_right * 2,
                                paddingTop: paperProfile.margin_top * 2,
                                paddingBottom: paperProfile.margin_bottom * 2,
                                fontSize: `${Math.round(12 * (zoom / 100))}px`
                             /* keep-inline */ }}>
                                {blocks.length === 0 ? (
                                    <div className="ts-canvas-empty"
                                        onDragOver={e => { e.preventDefault(); setDragOverIdx(0); }}
                                        onDrop={e => handleCanvasDrop(e, 0)}
                                    >
                                        <LayoutTemplate className="icon" />
                                        <p>{t('Drag blocks here to build your template')}</p>
                                        {dragOverIdx === 0 && <div className="ts-drop-indicator" />}
                                    </div>
                                ) : blocks.map((block, idx) => (
                                    <React.Fragment key={block.id as string}>
                                        {dragOverIdx === idx && <div className="ts-drop-indicator" />}
                                        <div
                                            className={`ts-canvas-block ${block.id === selectedBlockId ? 'selected' : ''} ${draggingCanvasId === block.id ? 'dragging' : ''}`}
                                            onClick={() => setSelectedBlockId(block.id as string)}
                                            draggable
                                            onDragStart={e => handleCanvasDragStart(e, block.id as string)}
                                            onDragOver={e => handleCanvasDragOver(e, idx)}
                                            onDrop={e => handleCanvasDrop(e, idx)}
                                            onDragEnd={handleDragEnd}
                                            style={{ width: `${Number(block.block_width || 100)}%`  /* keep-inline */ }}
                                        >
                                            <div className="ts-row" style={{ gap: 4  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                                <GripVertical style={{ width: 12, height: 12, color: '#bbb', cursor: 'grab', flexShrink: 0  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                                                <div style={{ flex: 1  /* keep-inline */ }} /* keep-inline */ /* keep-inline */><CanvasBlockRenderer block={block} /></div>
                                            </div>

                                            {/* Hover actions */}
                                            <div className="ts-canvas-block-actions">
                                                <button className="ts-canvas-block-action" title={t('Move up')} onClick={e => { e.stopPropagation(); moveBlock(block.id as string, 'up'); }}>
                                                    <ChevronUp style={{ width: 12, height: 12  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                                                </button>
                                                <button className="ts-canvas-block-action" title={t('Move down')} onClick={e => { e.stopPropagation(); moveBlock(block.id as string, 'down'); }}>
                                                    <ChevronDown style={{ width: 12, height: 12  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                                                </button>
                                                <button className="ts-canvas-block-action delete" title={t('Remove block')} onClick={e => { e.stopPropagation(); removeBlock(block.id as string); }}>
                                                    <Trash2 style={{ width: 12, height: 12  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                                                </button>
                                            </div>
                                        </div>
                                        {dragOverIdx === idx + 1 && idx === blocks.length - 1 && <div className="ts-drop-indicator" />}
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* Bottom tear */}
                            <div className="ts-paper-tear" />
                        </div>
                    </div>
                ) : (
                    /* Text & Publish View */
                    <div className="ts-canvas-area">
                        <div className="ts-text-view">
                            {/* Template Info */}
                            <div className="ts-text-section">
                                <div className="ts-text-section-title">
                                    <FileText className="icon" />
                                    {t('Template Info')}
                                </div>
                                <div className="ts-field">
                                    <label className="ts-label" htmlFor="tv-name">{t('Name')}</label>
                                    <input aria-label="Tv Name" id="tv-name" type="text" className="ts-input" value={templateName} onChange={e => setTemplateName(e.target.value)} />
                                </div>
                                <div className="ts-field">
                                    <label className="ts-label" htmlFor="tv-desc">{t('Description')}</label>
                                    <textarea aria-label="Tv Desc" id="tv-desc" className="ts-textarea" rows={3} value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} placeholder={t('Template description...')} />
                                </div>
                                <div className="ts-grid-2">
                                    <div className="ts-field">
                                        <label className="ts-label" htmlFor="tv-type">{t('Type')}</label>
                                        <select id="tv-type" title={t('Type')} className="ts-select" value={templateType} onChange={e => setTemplateType(e.target.value)}>
                                            <option value="receipt">{t('Receipt')}</option>
                                            <option value="kot">{t('Kitchen Order')}</option>
                                            <option value="invoice">{t('Invoice')}</option>
                                            <option value="report">{t('Report')}</option>
                                            <option value="label">{t('Label')}</option>
                                            <option value="custom">{t('Custom')}</option>
                                        </select>
                                    </div>
                                    <div className="ts-field">
                                        <label className="ts-label">{t('Status')}</label>
                                        <div className={`ts-type-chip ${templateStatus === 'active' ? 'active-chip' : 'normal'}`} style={{ marginTop: 4  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                            {templateStatus === 'active' ? <><CheckCircle style={{ width: 12, height: 12  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ /> {t('Published')}</> : t(templateStatus)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* JSON View */}
                            <div className="ts-text-section">
                                <div className="ts-text-section-title">
                                    <Layers className="icon" />
                                    {t('Block Structure')} ({blocks.length} {t('blocks')})
                                </div>
                                <pre className="ts-json-viewer">
                                    {JSON.stringify(blocks.map(b => ({ type: b.type, label: b.label, section: b.section, block_width: b.block_width || 100 })), null, 2)}
                                </pre>
                            </div>

                            {/* Version History */}
                            <div className="ts-text-section">
                                <div className="ts-text-section-title">
                                    <History className="icon" />
                                    {t('Version History')}
                                </div>
                                {versions.length === 0 ? (
                                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)', textAlign: 'center', padding: '16px 0'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                        {t('No published versions yet')}
                                    </div>
                                ) : versions.map((v, i) => (
                                    <div key={i} className="ts-version-row">
                                        <div className="ts-version-badge">v{v.version}</div>
                                        <div className="ts-version-meta">
                                            <span>{t('Version')} {v.version}</span>
                                            <small>{v.notes || t('No notes')} · {new Date(v.published_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Publish Section */}
                            {canPublish && !isNew && (
                                <div className="ts-text-section">
                                    <div className="ts-text-section-title">
                                        <Sparkles className="icon" />
                                        {t('Publish')}
                                    </div>
                                    <div className="ts-field">
                                        <label className="ts-label" htmlFor="tv-notes">{t('Publish Notes')}</label>
                                        <textarea aria-label="Tv Notes" id="tv-notes" className="ts-textarea" rows={2} placeholder={t('What changed in this version...')} />
                                    </div>
                                    <button onClick={handlePublish} disabled={publishing} className="ts-btn ts-btn-primary" style={{ width: '100%', justifyContent: 'center'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                        <Sparkles style={{ width: 16, height: 16  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                                        {publishing ? t('Publishing...') : t('Publish Template')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}


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
                        {propsTab === 'properties'
                            ? <PropertiesPanel selectedBlock={selectedBlock} updateProp={updateProp} setBlocks={setBlocks} />
                            : <ConditionalPanel selectedBlock={selectedBlock} />}
                    </div>
                </div>
            </div>

            {/* ── Preview Modal ──────────────────────────────────── */}
            {showPreview && (
                <div style={{ /* keep-inline */
                    position: 'fixed', inset: 0, zIndex: 50,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)'
                 /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                    <div style={{ /* keep-inline */
                        background: 'var(--card)', border: '1px solid var(--border)',
                        borderRadius: 16, maxWidth: 640, width: '100%',
                        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                     /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                            <div className="ts-row" style={{ gap: 8  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                <Eye style={{ width: 18, height: 18, color: 'hsl(267 100% 72%)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{t('Preview')}</span>
                            </div>
                            <div className="ts-row" style={{ gap: 6  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                <button
                                    className={`ts-toolbar-tab ${showThermal ? 'active' : ''}`}
                                    onClick={() => setShowThermal(!showThermal)}
                                    style={{ padding: '4px 12px', borderRadius: 6  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                                >
                                    {t('Thermal')}
                                </button>
                                <button className="ts-zoom-btn" onClick={() => setShowPreview(false)} title={t('Close')}>✕</button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', justifyContent: 'center', background: 'hsl(240 5% 12%)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                            <div
                                className={showThermal ? 'ts-paper' : ''}
                                style={{ /* keep-inline */
                                    background: '#fff', width: currentPaper.widthPx,
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                                    filter: showThermal ? 'grayscale(100%) contrast(180%)' : 'none'
                                 /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
