/**
 * LabelDesigner — Template-based label printing for inventory
 * Apicbase parity: shelf-life labels, allergen stickers, barcode labels, prep container labels
 * NOTE: Uses the Receipt Templates system for actual print template management
 */
import React, { useState, useMemo, useCallback } from 'react';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    Tag, Printer, QrCode, AlertTriangle, Clock, Barcode,
    Search, Plus, Edit, Trash2, Copy, Eye, Download,
    Calendar, Thermometer, Shield, Utensils, ChevronRight,
    Package, LayoutTemplate, Settings, BookTemplate,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/* ────────────────────────── Types ────────────────── */
interface LabelTemplate {
    _id: string;
    name: string;
    type: 'shelf-life' | 'allergen' | 'barcode' | 'prep' | 'custom';
    sizeW: number;
    sizeH: number;
    sizeUnit: 'mm' | 'in';
    fields: LabelField[];
    createdAt: string;
    isSystem: boolean;
}

interface LabelField {
    id: string;
    type: 'text' | 'barcode' | 'qr' | 'date' | 'allergen-icons' | 'logo' | 'line';
    label: string;
    value: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    align?: 'left' | 'center' | 'right';
}

interface PrintJob {
    _id: string;
    templateId: string;
    templateName: string;
    itemName: string;
    quantity: number;
    printedAt: string;
    printedBy: string;
    status: 'printed' | 'queued' | 'failed';
}

/* ──────────────────────────── Demo Templates ────────────────── */
const TEMPLATES: LabelTemplate[] = [
    {
        _id: 't1', name: 'Shelf-Life Standard', type: 'shelf-life', sizeW: 76, sizeH: 51, sizeUnit: 'mm',
        isSystem: true, createdAt: '2025-01-15',
        fields: [
            { id: 'f1', type: 'text', label: 'Product Name', value: '{{product.name}}', x: 5, y: 5, width: 66, height: 12, fontSize: 14, fontWeight: 'bold', align: 'center' },
            { id: 'f2', type: 'line', label: 'Divider', value: '', x: 5, y: 18, width: 66, height: 1 },
            { id: 'f3', type: 'date', label: 'Prepared', value: '{{date.prepared}}', x: 5, y: 22, width: 32, height: 8, fontSize: 9 },
            { id: 'f4', type: 'date', label: 'Use By', value: '{{date.useBy}}', x: 39, y: 22, width: 32, height: 8, fontSize: 9, fontWeight: 'bold' },
            { id: 'f5', type: 'text', label: 'Prepared By', value: '{{staff.name}}', x: 5, y: 32, width: 66, height: 8, fontSize: 8 },
            { id: 'f6', type: 'barcode', label: 'Batch Code', value: '{{batch.code}}', x: 15, y: 40, width: 46, height: 8 },
        ],
    },
    {
        _id: 't2', name: 'Allergen Warning Sticker', type: 'allergen', sizeW: 51, sizeH: 51, sizeUnit: 'mm',
        isSystem: true, createdAt: '2025-01-15',
        fields: [
            { id: 'f1', type: 'text', label: 'ALLERGEN INFO', value: 'ALLERGEN INFO', x: 3, y: 3, width: 45, height: 8, fontSize: 10, fontWeight: 'bold', align: 'center' },
            { id: 'f2', type: 'allergen-icons', label: 'Icons', value: '{{product.allergens}}', x: 3, y: 13, width: 45, height: 20 },
            { id: 'f3', type: 'text', label: 'Contains', value: '{{product.allergenList}}', x: 3, y: 35, width: 45, height: 12, fontSize: 7 },
        ],
    },
    {
        _id: 't3', name: 'Barcode Label (Small)', type: 'barcode', sizeW: 57, sizeH: 32, sizeUnit: 'mm',
        isSystem: true, createdAt: '2025-01-15',
        fields: [
            { id: 'f1', type: 'text', label: 'Product', value: '{{product.name}}', x: 3, y: 2, width: 51, height: 8, fontSize: 9, fontWeight: 'bold' },
            { id: 'f2', type: 'barcode', label: 'EAN13', value: '{{product.barcode}}', x: 5, y: 11, width: 47, height: 12 },
            { id: 'f3', type: 'text', label: 'SKU', value: '{{product.sku}}', x: 3, y: 24, width: 51, height: 6, fontSize: 7, align: 'center' },
        ],
    },
    {
        _id: 't4', name: 'Prep Container Label', type: 'prep', sizeW: 76, sizeH: 76, sizeUnit: 'mm',
        isSystem: true, createdAt: '2025-01-15',
        fields: [
            { id: 'f1', type: 'text', label: 'Recipe Name', value: '{{recipe.name}}', x: 5, y: 5, width: 66, height: 14, fontSize: 16, fontWeight: 'bold', align: 'center' },
            { id: 'f2', type: 'line', label: 'Divider', value: '', x: 5, y: 20, width: 66, height: 1 },
            { id: 'f3', type: 'text', label: 'Batch #', value: 'Batch: {{batch.code}}', x: 5, y: 23, width: 66, height: 8, fontSize: 9 },
            { id: 'f4', type: 'date', label: 'Prepared', value: '{{date.prepared}}', x: 5, y: 32, width: 32, height: 8, fontSize: 9 },
            { id: 'f5', type: 'date', label: 'Expires', value: '{{date.expires}}', x: 39, y: 32, width: 32, height: 8, fontSize: 9, fontWeight: 'bold' },
            { id: 'f6', type: 'text', label: 'Storage', value: '{{storage.temp}}', x: 5, y: 42, width: 66, height: 8, fontSize: 9 },
            { id: 'f7', type: 'allergen-icons', label: 'Allergens', value: '{{recipe.allergens}}', x: 5, y: 52, width: 66, height: 12 },
            { id: 'f8', type: 'qr', label: 'QR Code', value: '{{recipe.url}}', x: 55, y: 52, width: 16, height: 16 },
        ],
    },
    {
        _id: 't5', name: 'Custom Label', type: 'custom', sizeW: 100, sizeH: 50, sizeUnit: 'mm',
        isSystem: false, createdAt: '2025-02-10',
        fields: [
            { id: 'f1', type: 'logo', label: 'Restaurant Logo', value: '{{venue.logo}}', x: 5, y: 5, width: 20, height: 15 },
            { id: 'f2', type: 'text', label: 'Item Name', value: '{{product.name}}', x: 28, y: 5, width: 67, height: 10, fontSize: 12, fontWeight: 'bold' },
            { id: 'f3', type: 'text', label: 'Price', value: '€{{product.price}}', x: 28, y: 16, width: 30, height: 8, fontSize: 10, fontWeight: 'bold' },
            { id: 'f4', type: 'qr', label: 'QR', value: '{{product.url}}', x: 75, y: 22, width: 20, height: 20 },
            { id: 'f5', type: 'barcode', label: 'Barcode', value: '{{product.barcode}}', x: 5, y: 32, width: 65, height: 12 },
        ],
    },
];

const PRINT_HISTORY: PrintJob[] = [
    { _id: 'p1', templateId: 't1', templateName: 'Shelf-Life Standard', itemName: 'Tomato Sauce (Batch B-2025-0214)', quantity: 24, printedAt: '2025-02-20T14:30:00', printedBy: 'Maria C.', status: 'printed' },
    { _id: 'p2', templateId: 't2', templateName: 'Allergen Warning Sticker', itemName: 'Caesar Dressing', quantity: 50, printedAt: '2025-02-20T12:15:00', printedBy: 'John D.', status: 'printed' },
    { _id: 'p3', templateId: 't3', templateName: 'Barcode Label (Small)', itemName: 'House Red Wine 750ml', quantity: 100, printedAt: '2025-02-20T10:00:00', printedBy: 'Chef Marco', status: 'printed' },
    { _id: 'p4', templateId: 't4', templateName: 'Prep Container Label', itemName: 'Carbonara Sauce', quantity: 12, printedAt: '2025-02-19T16:45:00', printedBy: 'Maria C.', status: 'printed' },
    { _id: 'p5', templateId: 't1', templateName: 'Shelf-Life Standard', itemName: 'Marinated Chicken', quantity: 8, printedAt: '2025-02-19T08:30:00', printedBy: 'John D.', status: 'failed' },
];

const ALLERGEN_ICONS: { code: string; emoji: string; name: string }[] = [
    { code: 'gluten', emoji: '🌾', name: 'Gluten' },
    { code: 'dairy', emoji: '🥛', name: 'Dairy' },
    { code: 'eggs', emoji: '🥚', name: 'Eggs' },
    { code: 'fish', emoji: '🐟', name: 'Fish' },
    { code: 'shellfish', emoji: '🦐', name: 'Shellfish' },
    { code: 'nuts', emoji: '🥜', name: 'Tree Nuts' },
    { code: 'peanuts', emoji: '🥜', name: 'Peanuts' },
    { code: 'soy', emoji: '🫘', name: 'Soy' },
    { code: 'celery', emoji: '🌿', name: 'Celery' },
    { code: 'mustard', emoji: '🟡', name: 'Mustard' },
    { code: 'sesame', emoji: '⚪', name: 'Sesame' },
    { code: 'sulphites', emoji: '🍷', name: 'Sulphites' },
    { code: 'lupin', emoji: '🌸', name: 'Lupin' },
    { code: 'molluscs', emoji: '🐚', name: 'Molluscs' },
];

/* ──────────────────────── Label Type Config ────────────────── */
const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    'shelf-life': { label: 'Shelf-Life', color: 'text-emerald-400', icon: Clock },
    'allergen': { label: 'Allergen', color: 'text-amber-400', icon: AlertTriangle },
    'barcode': { label: 'Barcode', color: 'text-blue-400', icon: Barcode },
    'prep': { label: 'Prep Container', color: 'text-purple-400', icon: Utensils },
    'custom': { label: 'Custom', color: 'text-cyan-400', icon: LayoutTemplate },
};

/* ──────────────────────── Label Preview Component ────────────────── */
function LabelPreview({ template, scale = 1 }: { template: LabelTemplate; scale?: number }) {
    const w = template.sizeW * scale * 2.5;
    const h = template.sizeH * scale * 2.5;

    return (
        <div className="bg-white rounded border border-border overflow-hidden relative" style={{ width: w, height: h }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
            {template.fields.map(field => {
                const fx = field.x * scale * 2.5;
                const fy = field.y * scale * 2.5;
                const fw = field.width * scale * 2.5;
                const fh = field.height * scale * 2.5;
                const fs = (field.fontSize ?? 10) * scale * 1.2;

                if (field.type === 'line') {
                    return <div key={field.id} className="absolute bg-zinc-800" style={{ left: fx, top: fy, width: fw, height: 1 }} />;
                }
                if (field.type === 'barcode') {
                    return (
                        <div key={field.id} className="absolute flex items-center justify-center" style={{ left: fx, top: fy, width: fw, height: fh }}>
                            <div className="flex gap-px items-end h-full w-full">
                                {Array.from({ length: Math.floor(fw / 2) }).map((_, i) => (
                                    <div key={i} className="bg-zinc-900 flex-1" style={{ height: `${50 + Math.random() * 50}%` }} />
                                ))}
                            </div>
                        </div>
                    );
                }
                if (field.type === 'qr') {
                    return (
                        <div key={field.id} className="absolute border border-border flex items-center justify-center" style={{ left: fx, top: fy, width: fw, height: fh }}>
                            <div className="grid grid-cols-5 grid-rows-5 gap-px w-3/4 h-3/4">
                                {Array.from({ length: 25 }).map((_, i) => (
                                    <div key={i} className={Math.random() > 0.4 ? 'bg-zinc-900' : 'bg-white'} />
                                ))}
                            </div>
                        </div>
                    );
                }
                if (field.type === 'allergen-icons') {
                    return (
                        <div key={field.id} className="absolute flex flex-wrap gap-0.5 items-start" style={{ left: fx, top: fy, width: fw, height: fh }}>
                            {ALLERGEN_ICONS.slice(0, 6).map(a => (
                                <span key={a.code} style={{ fontSize: fs * 0.8 }}>{a.emoji}</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            ))}
                        </div>
                    );
                }
                if (field.type === 'logo') {
                    return (
                        <div key={field.id} className="absolute bg-muted border border-border rounded flex items-center justify-center" style={{ left: fx, top: fy, width: fw, height: fh }}>
                            <span className="text-zinc-400" style={{ fontSize: fs * 0.6 }}>LOGO</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div>
                    );
                }
                // Text / Date
                return (
                    <div
                        key={field.id}
                        className="absolute text-foreground leading-tight overflow-hidden"
                        style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                            left: fx, top: fy, width: fw, height: fh,
                            fontSize: fs,
                            fontWeight: field.fontWeight ?? 'normal',
                            textAlign: field.align ?? 'left',
                        }}
                    >
                        {field.type === 'date' ? (
                            <span>{field.label}: <strong>20/02/2025</strong></span>
                        ) : (
                            <span>{field.value.replace(/\{\{.*?\}\}/g, field.label)}</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   ██  LABEL DESIGNER
   ═══════════════════════════════════════════════════════════════════ */
export default function LabelDesigner() {
    const { t } = useTranslation();

    /* ── State ── */
    const [activeTab, setActiveTab] = useState('templates');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [previewTemplate, setPreviewTemplate] = useState<LabelTemplate | null>(null);
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const [printTemplate, setPrintTemplate] = useState<LabelTemplate | null>(null);
    const [printQuantity, setPrintQuantity] = useState(1);
    const [printItemName, setPrintItemName] = useState('');

    /* ── Filtered Templates ── */
    const filteredTemplates = useMemo(() => {
        return TEMPLATES.filter(t => {
            if (selectedType !== 'all' && t.type !== selectedType) return false;
            if (search) {
                const q = search.toLowerCase();
                return t.name.toLowerCase().includes(q);
            }
            return true;
        });
    }, [selectedType, search]);

    /* ── Print ── */
    const handlePrint = useCallback(() => {
        if (!printTemplate) return;
        toast.success(`Queued ${printQuantity} × "${printItemName || printTemplate.name}" labels for printing`);
        setPrintDialogOpen(false);
        setPrintQuantity(1);
        setPrintItemName('');
    }, [printTemplate, printQuantity, printItemName]);

    /* ── KPI Strip ── */
    const kpis = useMemo(() => ({
        total: TEMPLATES.length,
        system: TEMPLATES.filter(t => t.isSystem).length,
        custom: TEMPLATES.filter(t => !t.isSystem).length,
        printedToday: PRINT_HISTORY.filter(p => p.printedAt.startsWith('2025-02-20') && p.status === 'printed').length,
        labelsPrintedToday: PRINT_HISTORY.filter(p => p.printedAt.startsWith('2025-02-20') && p.status === 'printed').reduce((sum, p) => sum + p.quantity, 0),
    }), []);

    return (
        <PageContainer
            title="Label Designer & Printing"
            description="Create and print shelf-life, allergen, barcode & prep labels — integrates with Receipt Templates"
            actions={
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.info('Navigate to Receipt Templates for full template editor')}>
                        <BookTemplate className="h-4 w-4 mr-1" /> Receipt Templates
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast.info('Template import coming via Receipt Templates')}>
                        <Settings className="h-4 w-4 mr-1" /> Label Settings
                    </Button>
                </div>
            }
        >
            {/* ── KPI Strip ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {[
                    { label: 'Total Templates', value: kpis.total, color: 'text-blue-400' },
                    { label: 'System Templates', value: kpis.system, color: 'text-emerald-400' },
                    { label: 'Custom Templates', value: kpis.custom, color: 'text-purple-400' },
                    { label: 'Print Jobs Today', value: kpis.printedToday, color: 'text-amber-400' },
                    { label: 'Labels Printed Today', value: kpis.labelsPrintedToday, color: 'text-cyan-400' },
                ].map(k => (
                    <Card key={k.label} className="border-white/5 bg-zinc-900/40">
                        <CardContent className="p-3">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
                            <p className={cn('text-xl font-bold mt-0.5', k.color)}>{k.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Tabs ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-zinc-900/60 border border-white/5 mb-4">
                    <TabsTrigger value="templates" className="text-xs">Label Templates</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs">Print History</TabsTrigger>
                    <TabsTrigger value="allergens" className="text-xs">Allergen Icons</TabsTrigger>
                </TabsList>

                {/* ═══ TAB: TEMPLATES ═══ */}
                <TabsContent value="templates">
                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9 h-8 text-xs" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Template Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredTemplates.map(tpl => {
                            const cfg = TYPE_CONFIG[tpl.type];
                            const Icon = cfg.icon;
                            return (
                                <Card key={tpl._id} className="border-white/5 bg-zinc-900/40 hover:border-white/10 transition-colors group">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Icon className={cn('h-4 w-4', cfg.color)} />
                                                <div>
                                                    <p className="text-sm font-medium">{tpl.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{tpl.sizeW}×{tpl.sizeH} {tpl.sizeUnit} • {tpl.fields.length} fields</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Badge variant="outline" className={cn('text-[9px]', cfg.color, `border-current/30`)}>{cfg.label}</Badge>
                                                {tpl.isSystem && <Badge variant="secondary" className="text-[9px]">System</Badge>}
                                            </div>
                                        </div>

                                        {/* Preview */}
                                        <div className="flex justify-center mb-3 p-3 bg-zinc-800/30 rounded-lg border border-white/5">
                                            <LabelPreview template={tpl} scale={0.7} />
                                        </div>

                                        {/* Fields */}
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {tpl.fields.map(f => (
                                                <Badge key={f.id} variant="outline" className="text-[8px] border-white/10">
                                                    {f.type === 'barcode' ? '▐▐▐' : f.type === 'qr' ? '▦' : f.type === 'allergen-icons' ? '⚠️' : f.type === 'logo' ? '🏷' : ''} {f.label}
                                                </Badge>
                                            ))}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-1.5">
                                            <Button variant="default" size="sm" className="flex-1 h-7 text-xs" onClick={() => { setPrintTemplate(tpl); setPrintDialogOpen(true); }}>
                                                <Printer className="h-3 w-3 mr-1" /> Print
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPreviewTemplate(tpl)}>
                                                <Eye className="h-3 w-3" />
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toast.info('Edit via Receipt Templates')}>
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toast.success('Template duplicated')}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* ═══ TAB: PRINT HISTORY ═══ */}
                <TabsContent value="history">
                    <Card className="border-white/5 bg-zinc-900/40">
                        <CardContent className="p-0">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="p-3 text-left font-medium">Item</th>
                                        <th className="p-3 text-left font-medium">Template</th>
                                        <th className="p-3 text-center font-medium">Qty</th>
                                        <th className="p-3 text-left font-medium">Printed By</th>
                                        <th className="p-3 text-left font-medium">Time</th>
                                        <th className="p-3 text-center font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {PRINT_HISTORY.map(job => (
                                        <tr key={job._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-3 font-medium">{job.itemName}</td>
                                            <td className="p-3 text-muted-foreground">{job.templateName}</td>
                                            <td className="p-3 text-center tabular-nums">{job.quantity}</td>
                                            <td className="p-3 text-muted-foreground">{job.printedBy}</td>
                                            <td className="p-3 text-muted-foreground">{new Date(job.printedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="p-3 text-center">
                                                <Badge variant="outline" className={cn('text-[9px]',
                                                    job.status === 'printed' ? 'text-emerald-400 border-emerald-500/30' :
                                                        job.status === 'queued' ? 'text-amber-400 border-amber-500/30' :
                                                            'text-red-400 border-red-500/30'
                                                )}>
                                                    {job.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ TAB: ALLERGEN ICONS ═══ */}
                <TabsContent value="allergens">
                    <Card className="border-white/5 bg-zinc-900/40">
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-400" /> EU 14 Major Allergens Reference
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                                {ALLERGEN_ICONS.map(a => (
                                    <div key={a.code} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-800/40 border border-white/5">
                                        <span className="text-2xl">{a.emoji}</span>
                                        <span className="text-xs font-medium">{a.name}</span>
                                        <span className="text-[9px] text-muted-foreground uppercase">{a.code}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ── Preview Dialog ── */}
            <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{previewTemplate?.name} — Full Preview</DialogTitle>
                        <DialogDescription>{previewTemplate?.sizeW}×{previewTemplate?.sizeH} {previewTemplate?.sizeUnit}</DialogDescription>
                    </DialogHeader>
                    {previewTemplate && (
                        <div className="flex justify-center py-6 bg-muted rounded-lg">
                            <LabelPreview template={previewTemplate} scale={1.2} />
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                        <p className="font-medium mb-1">Template Variables:</p>
                        <div className="flex flex-wrap gap-1">
                            {previewTemplate?.fields.map(f => (
                                <Badge key={f.id} variant="outline" className="text-[9px] font-mono">{f.value || f.label}</Badge>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Print Dialog ── */}
            <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Print Labels</DialogTitle>
                        <DialogDescription>Using template: {printTemplate?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs">Item / Product Name</Label>
                            <Input placeholder="e.g. Tomato Sauce (Batch B-2025-0220)" value={printItemName} onChange={e => setPrintItemName(e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-xs">Quantity</Label>
                            <Input type="number" value={printQuantity} onChange={e => setPrintQuantity(Math.max(1, Number(e.target.value)))} className="w-24" />
                        </div>
                        <div>
                            <Label className="text-xs">Printer</Label>
                            <Select defaultValue="default">
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Kitchen Label Printer (Brother QL-820)</SelectItem>
                                    <SelectItem value="bar">Bar Label Printer (Dymo 450)</SelectItem>
                                    <SelectItem value="office">Office Printer (PDF)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> Print {printQuantity} Labels</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
