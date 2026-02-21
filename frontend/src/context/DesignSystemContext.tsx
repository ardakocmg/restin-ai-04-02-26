// @ts-nocheck
/**
 * DesignSystemContext - Comprehensive Design System
 * @module context/DesignSystemContext
 * 
 * Handles theme (Light/Dark), brand colors, currency formatting,
 * venue-level customization, and user preferences
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import { logger } from '../lib/logger';

export const BRAND_CONFIG = {
    name: 'restin.ai',
    logo: {
        restin: { text: 'restin', color: '#FFFFFF' },
        ai: { text: '.ai', color: '#E53935' }
    },
    colors: {
        brand: '#E53935',
        brandHover: '#C62828',
        brandLight: '#FFEBEE',
        white: '#FFFFFF'
    }
} as const;

export interface ThemeModeColors {
    id: string;
    name: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
    sidebar: string;
    sidebarBorder: string;
    sidebarText: string;
    sidebarActive: string;
    sidebarActiveText: string;
}

export const THEME_MODES: Record<'light' | 'dark', ThemeModeColors> = {
    light: {
        id: 'light',
        name: 'Light Mode',
        background: '#FFFFFF',
        foreground: '#09090B',
        card: '#F8F9FA',
        cardForeground: '#09090B',
        popover: '#FFFFFF',
        popoverForeground: '#09090B',
        primary: '#E53935',
        primaryForeground: '#FFFFFF',
        secondary: '#F1F5F9',
        secondaryForeground: '#0F172A',
        muted: '#F1F5F9',
        mutedForeground: '#64748B',
        accent: '#F1F5F9',
        accentForeground: '#0F172A',
        destructive: '#EF4444',
        destructiveForeground: '#FFFFFF',
        border: '#E2E8F0',
        input: '#E2E8F0',
        ring: '#E53935',
        sidebar: '#FFFFFF',
        sidebarBorder: '#E2E8F0',
        sidebarText: '#334155',
        sidebarActive: '#FEF2F2',
        sidebarActiveText: '#E53935'
    },
    dark: {
        id: 'dark',
        name: 'Dark Mode',
        background: '#09090B',
        foreground: '#F8FAFC',
        card: '#18181B',
        cardForeground: '#F8FAFC',
        popover: '#18181B',
        popoverForeground: '#F8FAFC',
        primary: '#E53935',
        primaryForeground: '#FFFFFF',
        secondary: '#27272A',
        secondaryForeground: '#F8FAFC',
        muted: '#27272A',
        mutedForeground: '#94A3B8',
        accent: '#27272A',
        accentForeground: '#F8FAFC',
        destructive: '#EF4444',
        destructiveForeground: '#FFFFFF',
        border: '#27272A',
        input: '#27272A',
        ring: '#E53935',
        sidebar: '#18181B',
        sidebarBorder: '#27272A',
        sidebarText: '#CBD5E1',
        sidebarActive: '#450A0A',
        sidebarActiveText: '#E53935'
    }
};

export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'TRY' | 'AED' | 'SAR';
export type CurrencyPosition = 'before' | 'after';

export interface CurrencyConfig {
    symbol: string;
    name: string;
    position: CurrencyPosition;
    decimals: number;
}

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
    EUR: { symbol: '€', name: 'Euro', position: 'after', decimals: 2 },
    USD: { symbol: '$', name: 'US Dollar', position: 'before', decimals: 2 },
    GBP: { symbol: '£', name: 'British Pound', position: 'before', decimals: 2 },
    TRY: { symbol: '₺', name: 'Turkish Lira', position: 'after', decimals: 2 },
    AED: { symbol: 'د.إ', name: 'UAE Dirham', position: 'before', decimals: 2 },
    SAR: { symbol: 'ر.س', name: 'Saudi Riyal', position: 'before', decimals: 2 }
};

export type FontSize = 'small' | 'medium' | 'large';

export interface UserPreferences {
    fontSize: FontSize;
    compactMode: boolean;
    sidebarCollapsed: boolean;
}

export interface DesignSystemContextValue {
    // Theme
    themeMode: 'light' | 'dark';
    setThemeMode: (mode: 'light' | 'dark') => void;
    toggleTheme: () => void;
    isDarkMode: boolean;

    // Currency
    currency: CurrencyCode;
    setCurrency: (code: CurrencyCode) => void;
    currencyConfig: CurrencyConfig;
    formatCurrency: (amount: number, currencyCode?: CurrencyCode) => string;

    // Venue customization
    venueColors: Record<string, string> | null;
    setVenueColors: (colors: Record<string, string> | null) => void;

    // User preferences
    userPreferences: UserPreferences;
    updateUserPreferences: (prefs: Partial<UserPreferences>) => void;

    // Brand config
    brand: typeof BRAND_CONFIG;

    loading: boolean;
}

const DesignSystemContext = createContext<DesignSystemContextValue | undefined>(undefined);

interface DesignSystemProviderProps {
    children: ReactNode;
}

export function DesignSystemProvider({ children }: DesignSystemProviderProps): JSX.Element {
    const [themeMode, setThemeModeState] = useState<'light' | 'dark'>('dark');
    const [currency, setCurrency] = useState<CurrencyCode>('EUR');
    const [venueColors, setVenueColors] = useState<Record<string, string> | null>(null);
    const [userPreferences, setUserPreferences] = useState<UserPreferences>({
        fontSize: 'medium',
        compactMode: false,
        sidebarCollapsed: false
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDesignSettings();
    }, []);

    const loadDesignSettings = async (): Promise<void> => {
        try {
            // Load from localStorage first - validate it's actually 'light' or 'dark'
            const savedTheme = localStorage.getItem('restin_theme_mode');
            if (savedTheme === 'light' || savedTheme === 'dark') {
                setThemeModeState(savedTheme);
            } else if (savedTheme) {
                // Invalid value in localStorage, clean it up
                localStorage.removeItem('restin_theme_mode');
            }

            const savedPrefs = localStorage.getItem('restin_user_preferences');
            if (savedPrefs) {
                setUserPreferences(JSON.parse(savedPrefs));
            }

            // Load venue settings
            const venueId = localStorage.getItem('restin_venue');
            if (venueId) {
                const response = await api.get(`/venues/${venueId}/settings`);
                const settings = response.data.settings;

                if (settings?.ui?.currency) {
                    setCurrency(settings.ui.currency);
                }

                if (settings?.ui?.customColors) {
                    setVenueColors(settings.ui.customColors);
                }
            }
        } catch (error) {
            logger.error('Failed to load design settings', { error });
        } finally {
            setLoading(false);
        }
    };

    const setThemeMode = (mode: 'light' | 'dark'): void => {
        setThemeModeState(mode);
        localStorage.setItem('restin_theme_mode', mode);
        applyTheme(mode);
    };

    const toggleTheme = (): void => {
        const newMode = themeMode === 'light' ? 'dark' : 'light';
        setThemeMode(newMode);
    };

    const applyTheme = (mode: 'light' | 'dark'): void => {
        // Validate mode and always fall back to dark (matching CSS :root defaults)
        const safeMode = (mode === 'light' || mode === 'dark') ? mode : 'dark';
        const theme = THEME_MODES[safeMode];
        const root = document.documentElement;

        // Remove previous theme class
        root.classList.remove('light', 'dark');
        root.classList.add(safeMode);

        // Safety check - theme should always exist but guard just in case
        if (!theme || typeof theme !== 'object') return;

        // Apply CSS variables - convert camelCase keys to kebab-case
        Object.entries(theme).forEach(([key, value]) => {
            if (key !== 'id' && key !== 'name' && typeof value === 'string') {
                // Convert camelCase to kebab-case: cardForeground → card-foreground
                const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                root.style.setProperty(`--${cssKey}`, value);
            }
        });

        // Apply brand colors (always consistent)
        root.style.setProperty('--brand-primary', BRAND_CONFIG.colors.brand);
        root.style.setProperty('--brand-hover', BRAND_CONFIG.colors.brandHover);
        root.style.setProperty('--brand-light', BRAND_CONFIG.colors.brandLight);

        // Apply venue custom colors if available
        if (venueColors) {
            Object.entries(venueColors).forEach(([key, value]) => {
                root.style.setProperty(`--venue-${key}`, value);
            });
        }
    };

    const updateUserPreferences = (prefs: Partial<UserPreferences>): void => {
        const updated = { ...userPreferences, ...prefs };
        setUserPreferences(updated);
        localStorage.setItem('restin_user_preferences', JSON.stringify(updated));
    };

    const formatCurrency = (amount: number, currencyCode: CurrencyCode = currency): string => {
        const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS.EUR;
        const formatted = amount.toFixed(config.decimals);

        if (config.position === 'before') {
            return `${config.symbol}${formatted}`;
        }
        return `${formatted} ${config.symbol}`;
    };

    useEffect(() => {
        applyTheme(themeMode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [themeMode, venueColors]);

    const value: DesignSystemContextValue = {
        // Theme
        themeMode,
        setThemeMode,
        toggleTheme,
        isDarkMode: themeMode === 'dark',

        // Currency
        currency,
        setCurrency,
        currencyConfig: CURRENCY_CONFIGS[currency],
        formatCurrency,

        // Venue customization
        venueColors,
        setVenueColors,

        // User preferences
        userPreferences,
        updateUserPreferences,

        // Brand config
        brand: BRAND_CONFIG,

        loading
    };

    return (
        <DesignSystemContext.Provider value={value}>
            {children}
        </DesignSystemContext.Provider>
    );
}

export function useDesignSystem(): DesignSystemContextValue {
    const context = useContext(DesignSystemContext);
    if (!context) {
        throw new Error('useDesignSystem must be used within DesignSystemProvider');
    }
    return context;
}
