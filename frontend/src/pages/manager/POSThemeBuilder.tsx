// @ts-nocheck
/**
 * POSThemeBuilder — Premium drag-and-drop theme builder page
 * 
 * 3-panel layout:
 *   LEFT (w-64): Zone palette — draggable components
 *   CENTER (flex-1): Live preview canvas with drop zones, resize, context menu
 *   RIGHT (w-72): Style editor — colors, fonts, zone config
 * 
 * Supports both POS and KDS layout types.
 * Can preload built-in templates as editable copies.
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Save, Eye, Monitor, Tablet, Smartphone,
    RotateCcw, Loader2, Palette, Info, AlertTriangle,
    AlertCircle, CheckCircle2, ChevronDown, X
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

import ZonePalette from '@/features/pos/themes/builder/ZonePalette';
import BuilderCanvas from '@/features/pos/themes/builder/BuilderCanvas';
import StyleEditor, { DEFAULT_STYLES } from '@/features/pos/themes/builder/StyleEditor';
import type { ThemeStyleValues } from '@/features/pos/themes/builder/StyleEditor';
import type { ZoneConfig, ZoneComponentDef, LayoutType, ZonePosition } from '@/features/pos/themes/builder/themeZoneTypes';
import { BUILTIN_THEMES } from '@/features/pos/themes/builtinThemes';
import { validateLayout, getValidationSummary, canSaveLayout, type ValidationResult, type ValidationSeverity } from '@/features/pos/themes/builder/builderValidation';

// ─── Default zone presets ────────────────────────────────────────

const DEFAULT_POS_ZONES: ZoneConfig[] = [
    { id: 'topbar-default', component: 'TopBar', position: 'top', order: 0, visible: true, config: { showSearch: true, showUser: true, showOrderNumber: true } },
    { id: 'side-tools-default', component: 'SideTools', position: 'left', width: '56px', order: 0, visible: true, config: {} },
    { id: 'category-bar', component: 'CategoryBar', position: 'left', width: '192px', order: 1, visible: true, config: { style: 'sidebar' } },
    { id: 'item-grid', component: 'ItemGrid', position: 'center', order: 0, visible: true, config: { columns: 3, size: 'medium', showPrices: true, showImages: true } },
    { id: 'order-panel', component: 'OrderPanel', position: 'right', width: '320px', order: 0, visible: true, config: { courses: false, seats: false } },
    { id: 'send-kitchen', component: 'SendButton', variant: 'kitchen', position: 'right', order: 1, visible: true, config: { variant: 'kitchen', destination: 'all' } },
    { id: 'totals-default', component: 'TotalsDisplay', position: 'right', order: 2, visible: true, config: { showTax: true } },
    { id: 'pay-cash', component: 'PayCash', position: 'bottom', order: 0, visible: true, config: { showSmartAmounts: true, buttonColor: '#10b981' } },
    { id: 'pay-card', component: 'PayCard', position: 'bottom', order: 1, visible: true, config: { buttonColor: '#3b82f6' } },
    { id: 'send-options', component: 'SendOptions', position: 'right', order: 3, visible: true, config: { showPrint: true, showKDS: true, showStock: false } },
    { id: 'table-select', component: 'TableSelect', position: 'left', order: 2, visible: true, config: {} },
    { id: 'clear-order', component: 'ClearOrder', position: 'right', order: 4, visible: true, config: { requireConfirm: true, buttonColor: '#ef4444' } },
];

const DEFAULT_KDS_ZONES: ZoneConfig[] = [
    { id: 'header', component: 'KDSHeader', position: 'top', order: 0, visible: true, config: { showTimer: true, showFilters: true } },
    { id: 'order-columns', component: 'KDSOrderColumns', position: 'center', order: 0, visible: true, config: { columns: 4, cardStyle: 'standard' } },
    { id: 'summary-panel', component: 'KDSSummary', position: 'right', width: '280px', order: 0, visible: true, config: {} },
    { id: 'status-bar', component: 'KDSStatusBar', position: 'bottom', order: 0, visible: true, config: { showAlerts: true } },
];

// ─── Built-in template zone presets ──────────────────────────────

const BUILTIN_ZONE_PRESETS: Record<string, ZoneConfig[]> = {
    'theme-lseries': [
        { id: 'topbar-ls', component: 'TopBar', position: 'top', order: 0, visible: true, config: { showSearch: true, showUser: true, showOrderNumber: true } },
        { id: 'sidetools-ls', component: 'SideTools', position: 'left', width: '56px', order: 0, visible: true, config: {} },
        { id: 'catbar-ls', component: 'CategoryBar', position: 'left', width: '192px', order: 1, visible: true, config: { style: 'sidebar' } },
        { id: 'itemgrid-ls', component: 'ItemGrid', position: 'center', order: 0, visible: true, config: { columns: 3, size: 'medium', showPrices: true, showImages: true } },
        { id: 'orderpanel-ls', component: 'OrderPanel', position: 'right', width: '320px', order: 0, visible: true, config: { courses: false } },
        { id: 'send-kitchen-ls', component: 'SendButton', variant: 'kitchen', position: 'right', order: 1, visible: true, config: { variant: 'kitchen' } },
        { id: 'totals-ls', component: 'TotalsDisplay', position: 'right', order: 2, visible: true, config: { showTax: true } },
        { id: 'pay-cash-ls', component: 'PayCash', position: 'bottom', order: 0, visible: true, config: { showSmartAmounts: true } },
        { id: 'pay-card-ls', component: 'PayCard', position: 'bottom', order: 1, visible: true, config: {} },
        { id: 'table-ls', component: 'TableSelect', position: 'left', order: 2, visible: true, config: {} },
        { id: 'footer-ls', component: 'Footer', position: 'bottom', order: 2, visible: true, config: {} },
    ],
    'theme-restin': [
        { id: 'catbar-res', component: 'CategoryBar', position: 'left', width: '192px', order: 0, visible: true, config: { style: 'sidebar' } },
        { id: 'itemgrid-res', component: 'ItemGrid', position: 'center', order: 0, visible: true, config: { columns: 3, size: 'medium', showPrices: true } },
        { id: 'orderpanel-res', component: 'OrderPanel', position: 'right', width: '320px', order: 0, visible: true, config: { courses: false, seats: false } },
        { id: 'send-kitchen-res', component: 'SendButton', variant: 'kitchen', position: 'right', order: 1, visible: true, config: { variant: 'kitchen' } },
        { id: 'totals-res', component: 'TotalsDisplay', position: 'right', order: 2, visible: true, config: { showTax: true } },
        { id: 'pay-cash-res', component: 'PayCash', position: 'bottom', order: 0, visible: true, config: { showSmartAmounts: true } },
        { id: 'pay-card-res', component: 'PayCard', position: 'bottom', order: 1, visible: true, config: {} },
        { id: 'table-res', component: 'TableSelect', position: 'left', order: 1, visible: true, config: {} },
        { id: 'clear-res', component: 'ClearOrder', position: 'right', order: 3, visible: true, config: { requireConfirm: true } },
    ],
    'theme-pro': [
        { id: 'topbar-pro', component: 'TopBar', position: 'top', order: 0, visible: true, config: { showSearch: true, showUser: true, showOrderNumber: true } },
        { id: 'orderpanel-pro', component: 'OrderPanel', position: 'left', width: '320px', order: 0, visible: true, config: { courses: true, seats: true } },
        { id: 'catbar-pro', component: 'CategoryBar', position: 'center', order: 0, visible: true, config: { style: 'tabs' } },
        { id: 'itemgrid-pro', component: 'ItemGrid', position: 'center', order: 1, visible: true, config: { columns: 4, size: 'medium' } },
        { id: 'send-kitchen-pro', component: 'SendButton', variant: 'kitchen', position: 'bottom', order: 0, visible: true, config: { variant: 'kitchen' } },
        { id: 'send-bar-pro', component: 'SendButton', variant: 'bar', position: 'bottom', order: 1, visible: true, config: { variant: 'bar' } },
        { id: 'totals-pro', component: 'TotalsDisplay', position: 'left', order: 1, visible: true, config: { showTax: true } },
        { id: 'pay-cash-pro', component: 'PayCash', position: 'bottom', order: 2, visible: true, config: {} },
        { id: 'pay-card-pro', component: 'PayCard', position: 'bottom', order: 3, visible: true, config: {} },
        { id: 'pay-split-pro', component: 'PaySplit', position: 'bottom', order: 4, visible: true, config: {} },
        { id: 'table-pro', component: 'TableSelect', variant: 'floorplan', position: 'left', order: 1, visible: true, config: {} },
    ],
    'theme-express': [
        { id: 'catbar-exp', component: 'CategoryBar', position: 'top', order: 0, visible: true, config: { style: 'strip' } },
        { id: 'itemgrid-exp', component: 'ItemGrid', position: 'center', order: 0, visible: true, config: { columns: 3, size: 'large', showPrices: true, showImages: true } },
        { id: 'orderpanel-exp', component: 'OrderPanel', variant: 'compact', position: 'right', width: '240px', order: 0, visible: true, config: { compact: true } },
        { id: 'send-punch-exp', component: 'SendButton', variant: 'punch', position: 'right', order: 1, visible: true, config: { variant: 'punch', autoClose: true } },
        { id: 'totals-exp', component: 'TotalsDisplay', variant: 'compact', position: 'right', order: 2, visible: true, config: { showTax: false } },
        { id: 'quickpay-exp', component: 'QuickPay', position: 'bottom', order: 0, visible: true, config: {} },
        { id: 'counter-exp', component: 'CounterDisplay', position: 'top', order: 1, visible: true, config: {} },
    ],
};

// ─── Validation Item Sub-Component ───────────────────────────────

const SEVERITY_CONFIG: Record<ValidationSeverity, { icon: typeof AlertCircle; color: string; bg: string }> = {
    error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
};

function ValidationItem({ result }: { result: ValidationResult }) {
    const config = SEVERITY_CONFIG[result.severity];
    const Icon = config.icon;

    return (
        <div className={cn("flex items-start gap-2 px-2.5 py-2 rounded-md border text-xs", config.bg)}>
            <Icon className={cn("h-3.5 w-3.5 flex-shrink-0 mt-0.5", config.color)} />
            <div className="min-w-0 flex-1">
                <p className="text-secondary-foreground leading-snug">{result.message}</p>
                {result.suggestion && (
                    <p className="text-muted-foreground text-[10px] mt-0.5 leading-snug">{result.suggestion}</p>
                )}
            </div>
        </div>
    );
}

export default function POSThemeBuilder() {
    const navigate = useNavigate();
    const { id: themeId } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const layoutTypeParam = (searchParams.get('type') || 'pos') as LayoutType;

    // ─── State ────────────────────────────────────────────────────

    const [layoutType, setLayoutType] = useState<LayoutType>(layoutTypeParam);
    const [themeName, setThemeName] = useState(layoutType === 'pos' ? 'Custom POS Theme' : 'Custom KDS Theme');
    const [themeDescription, setThemeDescription] = useState('');
    const [zones, setZones] = useState<ZoneConfig[]>(layoutType === 'pos' ? DEFAULT_POS_ZONES : DEFAULT_KDS_ZONES);
    const [styles, setStyles] = useState<ThemeStyleValues>({ ...DEFAULT_STYLES });
    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [builtinSource, setBuiltinSource] = useState<string | null>(null); // tracks if loaded from built-in

    const selectedZone = zones.find(z => z.id === selectedZoneId) || null;

    // ─── Load existing theme (API or built-in) ───────────────────

    useEffect(() => {
        if (!themeId || themeId === 'new') return;

        // Check if it's a built-in template ID
        const builtIn = BUILTIN_THEMES.find(t => t.id === themeId);
        if (builtIn) {
            // Preload built-in as editable copy
            setThemeName(`${builtIn.meta.name} (Copy)`);
            setThemeDescription(builtIn.meta.description);
            setLayoutType('pos');
            setBuiltinSource(builtIn.meta.name);

            // Map ThemeStyles → ThemeStyleValues (drop categoryColors)
            const { categoryColors: _cc, ...styleValues } = builtIn.styles;
            setStyles({ ...DEFAULT_STYLES, ...styleValues });

            // Load zone preset for this engine
            const preset = BUILTIN_ZONE_PRESETS[builtIn.id];
            if (preset) setZones([...preset]);

            setHasUnsavedChanges(true);
            return;
        }

        // Otherwise load from API
        setLoading(true);
        api.get<{ meta?: { name?: string; description?: string }; layout_type?: LayoutType; zones?: ZoneConfig[]; styles?: Partial<ThemeStyleValues> }>(`/api/pos-themes/${themeId}`)
            .then((res) => {
                const theme = res.data;
                setThemeName(theme.meta?.name || 'Custom Theme');
                setThemeDescription(theme.meta?.description || '');
                setLayoutType(theme.layout_type || 'pos');
                if (theme.zones?.length) setZones(theme.zones);
                if (theme.styles) setStyles({ ...DEFAULT_STYLES, ...theme.styles });
            })
            .catch((err) => {
                logger.error('Failed to load theme', err);
                toast.error('Failed to load theme');
            })
            .finally(() => setLoading(false));
    }, [themeId]);

    // ─── Track changes ────────────────────────────────────────────

    useEffect(() => {
        setHasUnsavedChanges(true);
    }, [zones, styles, themeName, themeDescription]);

    // ─── Zone Operations ──────────────────────────────────────────

    const addZone = useCallback((def: ZoneComponentDef, variant?: string) => {
        const existingCount = zones.filter(z => z.component === def.id).length;
        if (existingCount >= def.maxInstances) {
            toast.error(`Maximum ${def.maxInstances} ${def.name} zone(s) allowed`);
            return;
        }
        const newZone: ZoneConfig = {
            id: `${def.id.toLowerCase()}-${variant || ''}-${Date.now()}`,
            component: def.id,
            position: def.defaultPosition,
            width: def.defaultWidth,
            order: zones.filter(z => z.position === def.defaultPosition).length,
            visible: true,
            variant: variant || undefined,
            config: { ...def.defaultConfig, ...(variant ? { variant } : {}) },
        };
        setZones(prev => [...prev, newZone]);
        setSelectedZoneId(newZone.id);
    }, [zones]);

    const handleDropZone = useCallback((def: ZoneComponentDef, position: string) => {
        const existingCount = zones.filter(z => z.component === def.id).length;
        if (existingCount >= def.maxInstances) {
            toast.error(`Maximum ${def.maxInstances} ${def.name} zone(s) allowed`);
            return;
        }

        const newZone: ZoneConfig = {
            id: `${def.id.toLowerCase()}-${Date.now()}`,
            component: def.id,
            position: position as ZoneConfig['position'],
            width: def.defaultWidth,
            order: zones.filter(z => z.position === position).length,
            visible: true,
            config: { ...def.defaultConfig },
        };
        setZones(prev => [...prev, newZone]);
        setSelectedZoneId(newZone.id);
    }, [zones]);

    const removeZone = useCallback((id: string) => {
        setZones(prev => prev.filter(z => z.id !== id));
        if (selectedZoneId === id) setSelectedZoneId(null);
    }, [selectedZoneId]);

    const toggleZoneVisibility = useCallback((id: string) => {
        setZones(prev => prev.map(z => z.id === id ? { ...z, visible: !z.visible } : z));
    }, []);

    const updateZoneConfig = useCallback((zoneId: string, config: Record<string, unknown>) => {
        setZones(prev => prev.map(z => z.id === zoneId ? { ...z, config } : z));
    }, []);

    const reorderZone = useCallback((zoneId: string, direction: 'up' | 'down') => {
        setZones(prev => {
            const zone = prev.find(z => z.id === zoneId);
            if (!zone) return prev;
            const samePosition = prev.filter(z => z.position === zone.position).sort((a, b) => a.order - b.order);
            const idx = samePosition.findIndex(z => z.id === zoneId);
            const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (targetIdx < 0 || targetIdx >= samePosition.length) return prev;

            const swapZone = samePosition[targetIdx];
            return prev.map(z => {
                if (z.id === zoneId) return { ...z, order: swapZone.order };
                if (z.id === swapZone.id) return { ...z, order: zone.order };
                return z;
            });
        });
    }, []);

    const duplicateZone = useCallback((zoneId: string) => {
        setZones(prev => {
            const zone = prev.find(z => z.id === zoneId);
            if (!zone) return prev;
            const clone: ZoneConfig = {
                ...zone,
                id: `${zone.component.toLowerCase()}-${Date.now()}`,
                order: prev.filter(z => z.position === zone.position).length,
                config: { ...zone.config },
            };
            return [...prev, clone];
        });
        toast.success('Zone duplicated');
    }, []);

    const moveZoneTo = useCallback((zoneId: string, newPosition: ZonePosition) => {
        setZones(prev => prev.map(z =>
            z.id === zoneId
                ? { ...z, position: newPosition, order: prev.filter(pz => pz.position === newPosition).length }
                : z
        ));
    }, []);

    const updateZoneWidth = useCallback((zoneId: string, width: string) => {
        setZones(prev => prev.map(z => z.id === zoneId ? { ...z, width } : z));
    }, []);

    const resetToDefaults = useCallback(() => {
        setZones(layoutType === 'pos' ? [...DEFAULT_POS_ZONES] : [...DEFAULT_KDS_ZONES]);
        setStyles({ ...DEFAULT_STYLES });
        setSelectedZoneId(null);
        setBuiltinSource(null);
        toast.info('Reset to defaults');
    }, [layoutType]);

    // ─── Save ─────────────────────────────────────────────────────

    // ─── Live Validation ───────────────────────────────────────────

    const validationResults = useMemo(() => {
        // Detect theme context from builtin source or themeId
        let themeContext: string | undefined;
        if (builtinSource?.toLowerCase().includes('express') || themeId === 'theme-express') themeContext = 'express';
        else if (builtinSource?.toLowerCase().includes('pro') || themeId === 'theme-pro') themeContext = 'pro';
        else if (builtinSource?.toLowerCase().includes('restin') || themeId === 'theme-restin') themeContext = 'restin';
        return validateLayout(zones, layoutType, themeContext);
    }, [zones, layoutType, builtinSource, themeId]);

    const validationSummary = useMemo(() => getValidationSummary(validationResults), [validationResults]);
    const [showValidation, setShowValidation] = useState(true);

    const handleSave = async () => {
        if (!themeName.trim()) {
            toast.error('Theme name is required');
            return;
        }

        if (!canSaveLayout(validationResults)) {
            toast.error(`Cannot save — ${validationSummary.errors} error(s) must be fixed first`);
            setShowValidation(true);
            return;
        }

        setSaving(true);
        try {
            const payload = {
                layout_type: layoutType,
                engine: 'custom',
                meta: {
                    name: themeName,
                    description: themeDescription,
                    tags: [layoutType, 'custom'],
                    businessType: [],
                },
                styles,
                zones,
            };

            // If loaded from built-in, always create new (never overwrite built-in)
            const isNewTheme = !themeId || themeId === 'new' || builtinSource;

            if (!isNewTheme) {
                await api.put(`/api/pos-themes/${themeId}`, payload);
                toast.success('Theme updated!');
            } else {
                const res = await api.post<{ id: string }>('/api/pos-themes', payload);
                toast.success('Theme created!');
                setBuiltinSource(null);
                navigate(`/manager/pos-themes/builder/${res.data.id}`, { replace: true });
            }
            setHasUnsavedChanges(false);
        } catch (err: unknown) {
            logger.error('Failed to save theme', { error: err instanceof Error ? err.message : String(err) });
            toast.error('Failed to save theme');
        } finally {
            setSaving(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <Loader2 className="h-8 w-8 text-teal-600 dark:text-teal-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
            {/* ── Top Toolbar ─── */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/manager/pos-themes')}
                        className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                        title="Back to Theme Gallery"
                    >
                        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                    </button>

                    <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4 text-teal-400" />
                        <input
                            type="text"
                            value={themeName}
                            onChange={(e) => setThemeName(e.target.value)}
                            className="bg-transparent text-sm font-semibold text-foreground border-none outline-none focus:bg-secondary rounded px-2 py-1 min-w-[200px]"
                            placeholder="Theme Name..."
                        />
                    </div>

                    {/* Layout type toggle */}
                    <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5 ml-4">
                        <button
                            onClick={() => {
                                setLayoutType('pos');
                                if (!themeId || themeId === 'new') {
                                    setZones([...DEFAULT_POS_ZONES]);
                                }
                            }}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-medium transition-all",
                                layoutType === 'pos' ? "bg-teal-600 text-foreground" : "text-muted-foreground hover:text-secondary-foreground"
                            )}
                        >
                            POS
                        </button>
                        <button
                            onClick={() => {
                                setLayoutType('kds');
                                if (!themeId || themeId === 'new') {
                                    setZones([...DEFAULT_KDS_ZONES]);
                                }
                            }}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-medium transition-all",
                                layoutType === 'kds' ? "bg-teal-600 text-foreground" : "text-muted-foreground hover:text-secondary-foreground"
                            )}
                        >
                            KDS
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Device preview */}
                    <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5 mr-2">
                        {([['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]] as const).map(([device, Icon]) => (
                            <button
                                key={device}
                                onClick={() => setPreviewDevice(device)}
                                title={`Preview ${device}`}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    previewDevice === device ? "bg-zinc-700 text-teal-400" : "text-muted-foreground hover:text-secondary-foreground"
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={resetToDefaults}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-secondary-foreground hover:bg-secondary transition-all"
                    >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 relative",
                            validationSummary.hasErrors
                                ? "bg-zinc-700 hover:bg-zinc-600 text-secondary-foreground"
                                : "bg-teal-600 hover:bg-teal-500 text-foreground"
                        )}
                    >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        {saving ? 'Saving...' : builtinSource ? 'Save as New' : 'Save Theme'}
                        {validationSummary.hasErrors && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center text-foreground">
                                {validationSummary.errors}
                            </span>
                        )}
                    </button>

                    {hasUnsavedChanges && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="Unsaved changes" />
                    )}
                </div>
            </div>

            {/* Built-in template banner */}
            {builtinSource && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-teal-900/30 border-b border-teal-800/40 px-4 py-2 flex items-center gap-2"
                >
                    <Info className="h-3.5 w-3.5 text-teal-400 flex-shrink-0" />
                    <p className="text-xs text-teal-300">
                        Editing a copy of <strong>{builtinSource}</strong>. Changes will be saved as a new custom theme.
                    </p>
                </motion.div>
            )}

            {/* ── Main 3-Panel Layout ─── */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Zone Palette */}
                <div className="w-64 border-r border-border bg-card/40 flex flex-col flex-shrink-0">
                    {/* Palette */}
                    <div className="flex-1 p-3 overflow-y-auto">
                        <ZonePalette
                            layoutType={layoutType}
                            zones={zones}
                            onAddZone={addZone}
                        />
                    </div>

                    {/* Validation Panel */}
                    {validationResults.length > 0 && (
                        <div className="border-t border-border flex-shrink-0">
                            <button
                                onClick={() => setShowValidation(!showValidation)}
                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    {validationSummary.hasErrors ? (
                                        <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                                    ) : validationSummary.warnings > 0 ? (
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                    ) : (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                    )}
                                    <span className="text-xs font-medium text-secondary-foreground">
                                        {validationSummary.hasErrors
                                            ? `${validationSummary.errors} Error${validationSummary.errors > 1 ? 's' : ''}`
                                            : validationSummary.warnings > 0
                                                ? `${validationSummary.warnings} Warning${validationSummary.warnings > 1 ? 's' : ''}`
                                                : 'Layout Valid'
                                        }
                                    </span>
                                </div>
                                <ChevronDown className={cn(
                                    "h-3 w-3 text-muted-foreground transition-transform",
                                    showValidation && "rotate-180"
                                )} />
                            </button>

                            <AnimatePresence>
                                {showValidation && (
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        exit={{ height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-3 pb-3 space-y-1.5 max-h-[200px] overflow-y-auto">
                                            {validationResults.map((result) => (
                                                <ValidationItem key={result.id} result={result} />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Center: Canvas */}
                <div
                    className={cn(
                        "flex-1 p-4 overflow-auto",
                        previewDevice === 'tablet' && "max-w-[768px] mx-auto",
                        previewDevice === 'mobile' && "max-w-[375px] mx-auto",
                    )}
                >
                    <BuilderCanvas
                        zones={zones}
                        styles={styles}
                        selectedZoneId={selectedZoneId}
                        onSelectZone={setSelectedZoneId}
                        onRemoveZone={removeZone}
                        onToggleVisibility={toggleZoneVisibility}
                        onDropZone={handleDropZone}
                        onReorderZone={reorderZone}
                        onDuplicateZone={duplicateZone}
                        onMoveZoneTo={moveZoneTo}
                        onUpdateZoneWidth={updateZoneWidth}
                    />
                </div>

                {/* Right Panel: Style Editor */}
                <div className="w-72 border-l border-border bg-card/40 p-3 overflow-y-auto flex-shrink-0">
                    <StyleEditor
                        styles={styles}
                        onStyleChange={setStyles}
                        selectedZone={selectedZone}
                        onZoneConfigChange={updateZoneConfig}
                    />
                </div>
            </div>
        </div>
    );
}
