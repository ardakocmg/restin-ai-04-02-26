/**
 * usePOSTheme — Theme hook for POS layouts
 * 
 * Supports 3 themes:
 * - 'restin'  : Current desktop layout (3-column: categories | items | order)
 * - 'pro'     : iPad full-service layout (order | categories | items) with courses/seats
 * - 'express' : Quick service layout (items top | categories + pay bottom) with auto-send
 * 
 * Theme is read from:
 * 1. Venue settings (pos.theme) — server-side per-venue default
 * 2. User localStorage preference — per-user override
 * 3. Falls back to 'restin'
 */
import { useCallback,useEffect,useState } from 'react';

export type POSTheme = 'restin' | 'pro' | 'express' | 'k-series' | 'l-series';

const STORAGE_KEY = 'restin_pos_theme';
const VALID_THEMES: POSTheme[] = ['restin', 'pro', 'express', 'k-series', 'l-series'];

function isValidTheme(value: unknown): value is POSTheme {
    return typeof value === 'string' && VALID_THEMES.includes(value as POSTheme);
}

interface UsePOSThemeOptions {
    /** Theme from venue settings (pos.theme) — used as venue-level default */
    venueDefault?: string;
}

interface UsePOSThemeReturn {
    /** Current active theme */
    theme: POSTheme;
    /** Set and persist theme */
    setTheme: (theme: POSTheme) => void;
    /** All available themes with metadata */
    themes: ThemeMeta[];
    /** Whether user has a custom override (vs using venue default) */
    isUserOverride: boolean;
    /** Reset to venue default */
    resetToDefault: () => void;
}

export interface ThemeMeta {
    id: POSTheme;
    name: string;
    description: string;
    icon: string; // emoji
    target: string;
}

const THEME_META: ThemeMeta[] = [
    {
        id: 'restin',
        name: 'Classic',
        description: 'Desktop full-service layout with sidebar categories',
        icon: '🖥️',
        target: 'Desktop / Large Screen',
    },
    {
        id: 'pro',
        name: 'Pro',
        description: 'iPad-optimized with course firing and seat ordering',
        icon: '📱',
        target: 'iPad / Full-Service',
    },
    {
        id: 'express',
        name: 'Express',
        description: 'Quick service with auto-send payment at counter',
        icon: '⚡',
        target: 'Counter / Quick Service',
    },
    {
        id: 'k-series',
        name: 'K-Series',
        description: 'Kitchen-focused layout with integrated KDS and course management',
        icon: '🔥',
        target: 'Full-Service / Kitchen',
    },
    {
        id: 'l-series',
        name: 'L-Series',
        description: 'Dark professional iPad-optimized layout with left sidebar tools and color-coded categories',
        icon: '✨',
        target: 'iPad / Full-Service',
    },
];

export function usePOSTheme(options: UsePOSThemeOptions = {}): UsePOSThemeReturn {
    const { venueDefault } = options;

    // Read initial theme: pos_layout (Theme Engine) > localStorage > venueDefault > 'restin'
    const [theme, setThemeState] = useState<POSTheme>(() => {
        try {
            // Priority 1: Theme Engine layout (set by POSThemeRouter)
            const engineLayout = localStorage.getItem('pos_layout');
            if (isValidTheme(engineLayout)) return engineLayout;
            // Priority 2: User override
            const stored = localStorage.getItem(STORAGE_KEY);
            if (isValidTheme(stored)) return stored;
        } catch {
            // localStorage not available
        }
        if (isValidTheme(venueDefault)) return venueDefault;
        return 'restin';
    });

    // Track if user has a custom override
    const [isUserOverride, setIsUserOverride] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) !== null;
        } catch {
            return false;
        }
    });

    // Sync when venue default changes (only if no user override)
    useEffect(() => {
        if (!isUserOverride && isValidTheme(venueDefault)) {
            setThemeState(venueDefault);
        }
    }, [venueDefault, isUserOverride]);

    const setTheme = useCallback((newTheme: POSTheme) => {
        if (!isValidTheme(newTheme)) return;
        setThemeState(newTheme);
        setIsUserOverride(true);
        try {
            localStorage.setItem(STORAGE_KEY, newTheme);
        } catch {
            // localStorage not available
        }
    }, []);

    const resetToDefault = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // noop
        }
        setIsUserOverride(false);
        setThemeState(isValidTheme(venueDefault) ? venueDefault : 'restin');
    }, [venueDefault]);

    return {
        theme,
        setTheme,
        themes: THEME_META,
        isUserOverride,
        resetToDefault,
    };
}
