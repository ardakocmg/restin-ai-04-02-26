// @ts-nocheck
/**
 * Built-in POS Theme Templates
 * 
 * These are the 4 factory themes that ship with Restin.AI.
 * Each wraps an existing layout component — NO layouts are deleted.
 */
import { POSThemeConfig, DEFAULT_ENGINE_STYLES } from './posThemeTypes';

export const BUILTIN_THEMES: POSThemeConfig[] = [
    {
        id: 'theme-lseries',
        engine: 'l-series',
        meta: {
            name: 'L-Series',
            description: 'Lightspeed L-Series style. Dark, professional, iPad-optimized layout with left sidebar tools, order panel, and color-coded category tabs.',
            thumbnail: '/themes/lseries-thumb.png',
            author: 'Restin.AI',
            version: '1.0.0',
            tags: ['dark', 'ipad', 'full-service', 'professional'],
            businessType: ['full-service', 'bar', 'fine-dining'],
        },
        styles: DEFAULT_ENGINE_STYLES['l-series'],
        isBuiltIn: true,
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        createdBy: 'system',
    },
    {
        id: 'theme-restin',
        engine: 'restin',
        meta: {
            name: 'Restin Classic',
            description: 'Original Restin.AI POS layout. 3-column design: category sidebar, item grid center, order panel right. Clean and intuitive.',
            thumbnail: '/themes/restin-thumb.png',
            author: 'Restin.AI',
            version: '1.0.0',
            tags: ['dark', 'classic', 'three-column'],
            businessType: ['full-service', 'casual-dining', 'cafe'],
        },
        styles: DEFAULT_ENGINE_STYLES['restin'],
        isBuiltIn: true,
        isActive: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        createdBy: 'system',
    },
    {
        id: 'theme-pro',
        engine: 'pro',
        meta: {
            name: 'Pro',
            description: 'iPad full-service pro layout. Course management, seat assignment, dark order panel with rich interactions. Built for efficiency.',
            thumbnail: '/themes/pro-thumb.png',
            author: 'Restin.AI',
            version: '1.0.0',
            tags: ['dark', 'ipad', 'full-service', 'courses', 'seats'],
            businessType: ['full-service', 'fine-dining', 'hotel'],
        },
        styles: DEFAULT_ENGINE_STYLES['pro'],
        isBuiltIn: true,
        isActive: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        createdBy: 'system',
    },
    {
        id: 'theme-express',
        engine: 'express',
        meta: {
            name: 'Express',
            description: 'Quick service counter layout. Large product grid with instant payment flow. Perfect for cafés, bars, food trucks.',
            thumbnail: '/themes/express-thumb.png',
            author: 'Restin.AI',
            version: '1.0.0',
            tags: ['dark', 'counter', 'quick-service', 'minimal'],
            businessType: ['counter', 'cafe', 'bar', 'food-truck'],
        },
        styles: DEFAULT_ENGINE_STYLES['express'],
        isBuiltIn: true,
        isActive: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        createdBy: 'system',
    },
];

/** Get the active theme (falls back to L-Series) */
export function getActiveTheme(): POSThemeConfig {
    const storedId = localStorage.getItem('pos_active_theme');
    if (storedId) {
        const found = BUILTIN_THEMES.find(t => t.id === storedId);
        if (found) return found;
    }
    return BUILTIN_THEMES[0]; // L-Series default
}

/** Set the active theme */
export function setActiveTheme(themeId: string): void {
    localStorage.setItem('pos_active_theme', themeId);
}
