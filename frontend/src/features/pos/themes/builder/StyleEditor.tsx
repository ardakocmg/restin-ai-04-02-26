/**
 * StyleEditor — Right panel for customizing theme visual properties
 * 
 * Provides color pickers, font selection, radius controls, and
 * per-zone config fields generated from the zone's configSchema.
 */
import React, { useState } from 'react';
import { Settings, Paintbrush, Type as TypeIcon, Box, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ZoneConfig, ZoneConfigField } from './themeZoneTypes';
import { getComponentDef } from './themeZoneTypes';

// ─── Style Types ──────────────────────────────────────────────────

export interface ThemeStyleValues {
    rootBg: string;
    topBarBg: string;
    sidebarBg: string;
    accentColor: string;
    accentColorHover: string;
    textPrimary: string;
    textSecondary: string;
    tileRadius: number;
    tileBg: string;
    orderPanelBg: string;
    fontFamily: string;
}

const DEFAULT_STYLES: ThemeStyleValues = {
    rootBg: '#000000',
    topBarBg: '#1a1a1a',
    sidebarBg: '#111111',
    accentColor: '#2A9D8F',
    accentColorHover: '#34B5A5',
    textPrimary: '#ffffff',
    textSecondary: '#888888',
    tileRadius: 12,
    tileBg: '#333333',
    orderPanelBg: '#0d0d0d',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
};

const FONT_OPTIONS = [
    { label: 'System Default', value: '-apple-system, BlinkMacSystemFont, sans-serif' },
    { label: 'Inter', value: "'Inter', sans-serif" },
    { label: 'Roboto', value: "'Roboto', sans-serif" },
    { label: 'Outfit', value: "'Outfit', sans-serif" },
    { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
];

// ─── Color Swatch Input ──────────────────────────────────────────

function ColorInput({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-muted-foreground truncate flex-1">{label}</label>
            <div className="flex items-center gap-2 flex-shrink-0">
                <div className="relative">
                    <input aria-label="Input"
                        type="color"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-7 h-7 rounded-md border border-border cursor-pointer bg-transparent"
                    />
                </div>
                <input aria-label="Input"
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-20 text-xs px-2 py-1 rounded bg-card border border-border text-secondary-foreground font-mono"
                />
            </div>
        </div>
    );
}

// ─── Config Field Renderer ───────────────────────────────────────

function ConfigFieldInput({
    field,
    value,
    onChange,
}: {
    field: ZoneConfigField;
    value: unknown;
    onChange: (key: string, val: unknown) => void;
}) {
    switch (field.type) {
        case 'boolean':
            return (
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="text-xs text-muted-foreground">{field.label}</span>
                    <button
                        onClick={() => onChange(field.key, !value)}
                        className={cn(
                            "w-9 h-5 rounded-full transition-colors relative",
                            value ? "bg-teal-500" : "bg-zinc-700"
                        )}
                    >
                        <div
                            className={cn(
                                "w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform",
                                value ? "translate-x-4.5 left-[1px]" : "left-[3px]"
                            )}
                            style={{ transform: value ? 'translateX(16px)' : 'translateX(0)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                        />
                    </button>
                </label>
            );
        case 'select':
            return (
                <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-muted-foreground truncate flex-1">{field.label}</label>
                    <select aria-label="Input"
                        value={String(value ?? field.defaultValue)}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        className="text-xs px-2 py-1 rounded bg-card border border-border text-secondary-foreground flex-shrink-0"
                    >
                        {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            );
        case 'color':
            return (
                <ColorInput
                    label={field.label}
                    value={String(value ?? field.defaultValue)}
                    onChange={(v) => onChange(field.key, v)}
                />
            );
        case 'number':
            return (
                <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-muted-foreground">{field.label}</label>
                    <input aria-label="Input"
                        type="number"
                        value={Number(value ?? field.defaultValue)}
                        onChange={(e) => onChange(field.key, Number(e.target.value))}
                        className="w-16 text-xs px-2 py-1 rounded bg-card border border-border text-secondary-foreground text-center"
                    />
                </div>
            );
        default:
            return (
                <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-muted-foreground">{field.label}</label>
                    <input aria-label="Input"
                        type="text"
                        value={String(value ?? field.defaultValue ?? '')}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        className="flex-1 max-w-[140px] text-xs px-2 py-1 rounded bg-card border border-border text-secondary-foreground"
                    />
                </div>
            );
    }
}

// ─── Style Editor Main ──────────────────────────────────────────

interface StyleEditorProps {
    styles: ThemeStyleValues;
    onStyleChange: (styles: ThemeStyleValues) => void;
    selectedZone: ZoneConfig | null;
    onZoneConfigChange: (zoneId: string, config: /**/any) => void;
}

export default function StyleEditor({
    styles,
    onStyleChange,
    selectedZone,
    onZoneConfigChange,
}: StyleEditorProps) {
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        colors: true,
        typography: true,
        spacing: true,
        zone: true,
    });

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const updateStyle = <K extends keyof ThemeStyleValues>(key: K, value: ThemeStyleValues[K]) => {
        onStyleChange({ ...styles, [key]: value });
    };

    const zoneDef = selectedZone ? getComponentDef(selectedZone.component) : null;

    return (
        <div className="space-y-4 text-sm">
            {/* ── Colors Section ─── */}
            <div>
                <button
                    onClick={() => toggleSection('colors')}
                    className="flex items-center gap-2 w-full text-left mb-2"
                >
                    {openSections.colors ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    <Paintbrush className="h-3.5 w-3.5 text-teal-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colors</span>
                </button>
                {openSections.colors && (
                    <div className="space-y-2.5 pl-6">
                        <ColorInput label="Root Background" value={styles.rootBg} onChange={(v) => updateStyle('rootBg', v)} />
                        <ColorInput label="Top Bar" value={styles.topBarBg} onChange={(v) => updateStyle('topBarBg', v)} />
                        <ColorInput label="Sidebar" value={styles.sidebarBg} onChange={(v) => updateStyle('sidebarBg', v)} />
                        <ColorInput label="Accent" value={styles.accentColor} onChange={(v) => updateStyle('accentColor', v)} />
                        <ColorInput label="Accent Hover" value={styles.accentColorHover} onChange={(v) => updateStyle('accentColorHover', v)} />
                        <ColorInput label="Text Primary" value={styles.textPrimary} onChange={(v) => updateStyle('textPrimary', v)} />
                        <ColorInput label="Text Secondary" value={styles.textSecondary} onChange={(v) => updateStyle('textSecondary', v)} />
                        <ColorInput label="Tile Background" value={styles.tileBg} onChange={(v) => updateStyle('tileBg', v)} />
                        <ColorInput label="Order Panel" value={styles.orderPanelBg} onChange={(v) => updateStyle('orderPanelBg', v)} />
                    </div>
                )}
            </div>

            {/* ── Typography Section ─── */}
            <div>
                <button
                    onClick={() => toggleSection('typography')}
                    className="flex items-center gap-2 w-full text-left mb-2"
                >
                    {openSections.typography ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    <TypeIcon className="h-3.5 w-3.5 text-teal-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Typography</span>
                </button>
                {openSections.typography && (
                    <div className="space-y-2.5 pl-6">
                        <div className="flex items-center justify-between gap-2">
                            <label className="text-xs text-muted-foreground">Font Family</label>
                            <select aria-label="Input"
                                value={styles.fontFamily}
                                onChange={(e) => updateStyle('fontFamily', e.target.value)}
                                className="text-xs px-2 py-1 rounded bg-card border border-border text-secondary-foreground max-w-40"
                            >
                                {FONT_OPTIONS.map((f) => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Spacing & Shape ─── */}
            <div>
                <button
                    onClick={() => toggleSection('spacing')}
                    className="flex items-center gap-2 w-full text-left mb-2"
                >
                    {openSections.spacing ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    <Box className="h-3.5 w-3.5 text-teal-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shape</span>
                </button>
                {openSections.spacing && (
                    <div className="space-y-2.5 pl-6">
                        <div className="flex items-center justify-between gap-2">
                            <label className="text-xs text-muted-foreground">Tile Radius</label>
                            <div className="flex items-center gap-2">
                                <input aria-label="Input"
                                    type="range"
                                    min={0}
                                    max={24}
                                    value={styles.tileRadius}
                                    onChange={(e) => updateStyle('tileRadius', Number(e.target.value))}
                                    className="w-20 accent-teal-500"
                                />
                                <span className="text-xs text-muted-foreground w-8 text-right">{styles.tileRadius}px</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Selected Zone Config ─── */}
            {selectedZone && zoneDef && zoneDef.configSchema.length > 0 && (
                <div>
                    <button
                        onClick={() => toggleSection('zone')}
                        className="flex items-center gap-2 w-full text-left mb-2"
                    >
                        {openSections.zone ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        <Settings className="h-3.5 w-3.5 text-teal-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {zoneDef.name} Settings
                        </span>
                    </button>
                    {openSections.zone && (
                        <div className="space-y-2.5 pl-6">
                            {zoneDef.configSchema.map((field) => (
                                <ConfigFieldInput
                                    key={field.key}
                                    field={field}
                                    value={selectedZone.config[field.key]}
                                    onChange={(key, val) => {
                                        onZoneConfigChange(selectedZone.id, {
                                            ...selectedZone.config,
                                            [key]: val,
                                        });
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export { DEFAULT_STYLES };
export type { ThemeStyleValues as StyleValues };
