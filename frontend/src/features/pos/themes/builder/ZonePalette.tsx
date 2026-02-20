/**
 * ZonePalette — Draggable POS/KDS zone components for the builder
 * 
 * Phase 4: Grouped by category (Layout / Actions / Display),
 * shows variant badges, required indicators, and "Added" states.
 */
import React, { useState } from 'react';
import {
    PanelTop, SidebarOpen, LayoutList, LayoutGrid, Receipt,
    CreditCard, PanelBottom, Clock, Columns, BarChart3,
    GripVertical, Send, ChefHat, Wine, Flame, Zap, Banknote,
    Split, Wallet, Grid3x3, Trash2, LogOut, Settings2,
    Calculator, Hash, Palette, Map, List, ListOrdered,
    ChevronDown, Check, AlertTriangle, CircleDot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LayoutType, ZoneComponentDef, ZoneConfig, ZoneCategory, ZoneVariant } from './themeZoneTypes';
import { getComponentsByCategory, getComponentDef } from './themeZoneTypes';

// ─── Icon mapping ────────────────────────────────────────────────

const ZONE_ICON_MAP: Record<string, React.ElementType> = {
    PanelTop, SidebarOpen, LayoutList, LayoutGrid, Receipt,
    CreditCard, PanelBottom, Clock, Columns, BarChart3,
    Send, ChefHat, Wine, Flame, Zap, Banknote, Split,
    Wallet, Grid3x3, Trash2, LogOut, Settings2, Calculator,
    Hash, Palette, Map, List, ListOrdered, CircleDot,
};

// ─── Category labels & colors ────────────────────────────────────

const CATEGORY_META: Record<ZoneCategory, { label: string; color: string; icon: React.ElementType }> = {
    layout: { label: 'Layout', color: 'text-teal-400', icon: LayoutGrid },
    action: { label: 'Action Buttons', color: 'text-amber-400', icon: Zap },
    display: { label: 'Display', color: 'text-blue-400', icon: Calculator },
    dialog: { label: 'Dialogs', color: 'text-purple-400', icon: PanelTop },
};

// ─── Variant color mapping ───────────────────────────────────────

const VARIANT_COLOR_MAP: Record<string, string> = {
    teal: 'bg-teal-500/20 text-teal-400 border-teal-600/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-600/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-600/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-600/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-600/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-600/30',
    red: 'bg-red-500/20 text-red-400 border-red-600/30',
    zinc: 'bg-zinc-500/20 text-muted-foreground border-zinc-600/30',
};

// ─── Props ───────────────────────────────────────────────────────

interface ZonePaletteProps {
    layoutType: LayoutType;
    zones: ZoneConfig[];
    onAddZone: (def: ZoneComponentDef, variant?: string) => void;
}

// ─── Main Component ──────────────────────────────────────────────

export default function ZonePalette({ layoutType, zones, onAddZone }: ZonePaletteProps) {
    const grouped = getComponentsByCategory(layoutType);
    const [expandedVariants, setExpandedVariants] = useState<string | null>(null);

    const getUsedCount = (componentId: string) =>
        zones.filter(z => z.component === componentId).length;

    const isMaxReached = (componentId: string) => {
        const def = getComponentDef(componentId);
        if (!def) return false;
        return getUsedCount(componentId) >= def.maxInstances;
    };

    const handleAdd = (def: ZoneComponentDef) => {
        // If the component has variants, show the variant picker
        if (def.variants && def.variants.length > 0) {
            setExpandedVariants(expandedVariants === def.id ? null : def.id);
            return;
        }
        onAddZone(def);
    };

    const handleAddWithVariant = (def: ZoneComponentDef, variant: ZoneVariant) => {
        onAddZone(def, variant.id);
        setExpandedVariants(null);
    };

    const renderCategory = (category: ZoneCategory, components: ZoneComponentDef[]) => {
        if (components.length === 0) return null;
        const meta = CATEGORY_META[category];
        const CatIcon = meta.icon;

        return (
            <div key={category} className="space-y-1.5">
                {/* Category header */}
                <div className="flex items-center gap-2 px-1 pt-2 pb-1">
                    <CatIcon className={cn("h-3.5 w-3.5", meta.color)} />
                    <h3 className={cn("text-xs font-semibold uppercase tracking-wider", meta.color)}>
                        {meta.label}
                    </h3>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                        {components.length}
                    </span>
                </div>

                {/* Components */}
                {components.map((def) => {
                    const Icon = ZONE_ICON_MAP[def.icon] || LayoutGrid;
                    const maxReached = isMaxReached(def.id);
                    const usedCount = getUsedCount(def.id);
                    const isExpanded = expandedVariants === def.id;

                    return (
                        <div key={def.id}>
                            <button
                                disabled={maxReached}
                                onClick={() => handleAdd(def)}
                                draggable={!maxReached}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('zone-component', JSON.stringify(def));
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                                className={cn(
                                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all",
                                    "border",
                                    maxReached
                                        ? "opacity-40 cursor-not-allowed bg-card/30 border-border/50"
                                        : isExpanded
                                            ? "bg-secondary border-teal-700 ring-1 ring-teal-700/30"
                                            : "bg-card/60 border-border hover:bg-secondary hover:border-border cursor-grab active:cursor-grabbing"
                                )}
                            >
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <Icon className={cn("h-4 w-4 flex-shrink-0", meta.color)} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-medium text-secondary-foreground truncate text-[13px]">{def.name}</p>
                                        {def.required && usedCount === 0 && (
                                            <span title="Required">
                                                <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0" />
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground truncate">{def.description}</p>
                                </div>

                                {/* Status badges */}
                                {maxReached ? (
                                    <span className="flex-shrink-0 flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                        <Check className="h-2.5 w-2.5" />
                                        Added
                                    </span>
                                ) : usedCount > 0 && def.maxInstances > 1 ? (
                                    <span className="flex-shrink-0 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                        {usedCount}/{def.maxInstances}
                                    </span>
                                ) : def.variants && def.variants.length > 0 ? (
                                    <ChevronDown className={cn(
                                        "h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0",
                                        isExpanded && "rotate-180 text-teal-400"
                                    )} />
                                ) : null}
                            </button>

                            {/* Variant picker (expanded) */}
                            {isExpanded && def.variants && (
                                <div className="ml-6 mt-1 space-y-1 mb-2 border-l-2 border-border/50 pl-3">
                                    {def.variants.map((variant) => {
                                        const VIcon = ZONE_ICON_MAP[variant.icon] || CircleDot;
                                        const colorClass = VARIANT_COLOR_MAP[variant.color] || VARIANT_COLOR_MAP.zinc;

                                        // Check if this variant is already used
                                        const variantUsed = zones.some(
                                            z => z.component === def.id &&
                                                ((z.config?.variant === variant.id) || z.variant === variant.id)
                                        );

                                        return (
                                            <button
                                                key={variant.id}
                                                onClick={() => !variantUsed && handleAddWithVariant(def, variant)}
                                                disabled={variantUsed || maxReached}
                                                className={cn(
                                                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-xs transition-all border",
                                                    variantUsed
                                                        ? "opacity-40 cursor-not-allowed bg-card/30 border-border/50"
                                                        : cn(colorClass, "hover:brightness-125 cursor-pointer")
                                                )}
                                            >
                                                <VIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium truncate">{variant.label}</p>
                                                    <p className="text-[10px] opacity-60 truncate">{variant.description}</p>
                                                </div>
                                                {variantUsed && (
                                                    <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-1">
            {renderCategory('layout', grouped.layout)}
            {renderCategory('action', grouped.action)}
            {renderCategory('display', grouped.display)}
            {grouped.dialog.length > 0 && renderCategory('dialog', grouped.dialog)}
        </div>
    );
}
