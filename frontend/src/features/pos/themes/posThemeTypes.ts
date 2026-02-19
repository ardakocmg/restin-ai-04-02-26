/**
 * POS Theme System — Type Definitions
 * 
 * Each POS theme is a JSON config that describes:
 * - Which layout component to render (legacy wrapper approach)
 * - Visual styles (colors, fonts, spacing)
 * - Zone configuration (what goes where)
 * - Metadata (name, description, thumbnail)
 */

/** Supported POS layout engines */
export type POSLayoutEngine =
    | 'l-series'    // POSRuntimeEnhanced.jsx — Lightspeed clone
    | 'k-series'    // POSRuntimeEnhanced.jsx — K-Series (same runtime as L-Series)
    | 'restin'      // POSLayoutRestin.jsx — Classic Restin.AI
    | 'pro'         // POSLayoutPro.jsx — iPad full-service
    | 'express'     // POSLayoutExpress.jsx — Quick service / counter
    | 'custom';     // Future: fully JSON-driven layout

/** Visual style tokens for a theme */
export interface ThemeStyles {
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
    categoryColors: Record<string, string>;
}

/** Theme metadata */
export interface ThemeMeta {
    name: string;
    description: string;
    thumbnail: string;
    author: string;
    version: string;
    tags: string[];
    businessType: string[]; // 'full-service' | 'counter' | 'cafe' | 'bar' | 'food-truck'
}

/** Full POS Theme Configuration */
export interface POSThemeConfig {
    id: string;
    engine: POSLayoutEngine;
    meta: ThemeMeta;
    styles: ThemeStyles;
    isBuiltIn: boolean;
    isActive: boolean;
    venueId?: string;
    brandId?: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

/** Theme list item for gallery display */
export interface ThemeListItem {
    id: string;
    engine: POSLayoutEngine;
    meta: ThemeMeta;
    isBuiltIn: boolean;
    isActive: boolean;
}

/** Default styles per engine */
export const DEFAULT_ENGINE_STYLES: Record<POSLayoutEngine, ThemeStyles> = {
    'l-series': {
        rootBg: '#000000',
        topBarBg: '#1a1a1a',
        sidebarBg: '#111111',
        accentColor: '#2A9D8F',
        accentColorHover: '#34B5A5',
        textPrimary: '#ffffff',
        textSecondary: '#888888',
        tileRadius: 12,
        tileBg: '#E07A5F',
        orderPanelBg: '#0d0d0d',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        categoryColors: {
            drinks: '#5B8DEF',
            starters: '#E8947A',
            mains: '#E07A5F',
            desserts: '#C77DBA',
            sides: '#81B29A',
            steaks: '#D4534B',
        },
    },
    'k-series': {
        rootBg: '#000000',
        topBarBg: '#1a1a1a',
        sidebarBg: '#111111',
        accentColor: '#F97316',
        accentColorHover: '#FB923C',
        textPrimary: '#ffffff',
        textSecondary: '#888888',
        tileRadius: 12,
        tileBg: '#E07A5F',
        orderPanelBg: '#0d0d0d',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        categoryColors: {
            drinks: '#5B8DEF',
            starters: '#E8947A',
            mains: '#E07A5F',
            desserts: '#C77DBA',
            sides: '#81B29A',
            steaks: '#D4534B',
        },
    },
    'restin': {
        rootBg: '#0f172a',
        topBarBg: '#1e293b',
        sidebarBg: '#1e293b',
        accentColor: '#3b82f6',
        accentColorHover: '#60a5fa',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        tileRadius: 8,
        tileBg: '#334155',
        orderPanelBg: '#1e293b',
        fontFamily: "Inter, system-ui, sans-serif",
        categoryColors: {},
    },
    'pro': {
        rootBg: '#09090b',
        topBarBg: '#18181b',
        sidebarBg: '#18181b',
        accentColor: '#2A9D8F',
        accentColorHover: '#34B5A5',
        textPrimary: '#fafafa',
        textSecondary: '#a1a1aa',
        tileRadius: 10,
        tileBg: '#27272a',
        orderPanelBg: '#18181b',
        fontFamily: "Inter, system-ui, sans-serif",
        categoryColors: {},
    },
    'express': {
        rootBg: '#000000',
        topBarBg: '#111111',
        sidebarBg: '#111111',
        accentColor: '#22c55e',
        accentColorHover: '#4ade80',
        textPrimary: '#ffffff',
        textSecondary: '#999999',
        tileRadius: 14,
        tileBg: '#1a1a1a',
        orderPanelBg: '#111111',
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        categoryColors: {},
    },
    'custom': {
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
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        categoryColors: {},
    },
};
