/**
 * ThemeContext - Venue-level theme customization
 * @module context/ThemeContext
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import { logger } from '../lib/logger';

export interface ThemeColors {
    id: string;
    name: string;
    primary: string;
    primaryHover: string;
    primaryLight: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
    sidebar: string;
    sidebarText: string;
    sidebarActive: string;
    sidebarActiveText: string;
}

export const PRESET_THEMES: Record<string, ThemeColors> = {
    professional_blue: {
        id: 'professional_blue',
        name: 'Professional Blue',
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        primaryLight: '#eff6ff',
        accent: '#60a5fa',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        sidebar: '#ffffff',
        sidebarText: '#374151',
        sidebarActive: '#eff6ff',
        sidebarActiveText: '#3b82f6'
    },
    elegant_purple: {
        id: 'elegant_purple',
        name: 'Elegant Purple',
        primary: '#a855f7',
        primaryHover: '#9333ea',
        primaryLight: '#faf5ff',
        accent: '#c084fc',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        sidebar: '#ffffff',
        sidebarText: '#374151',
        sidebarActive: '#faf5ff',
        sidebarActiveText: '#a855f7'
    },
    modern_green: {
        id: 'modern_green',
        name: 'Modern Green',
        primary: '#10b981',
        primaryHover: '#059669',
        primaryLight: '#ecfdf5',
        accent: '#34d399',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        sidebar: '#ffffff',
        sidebarText: '#374151',
        sidebarActive: '#ecfdf5',
        sidebarActiveText: '#10b981'
    },
    restaurant_red: {
        id: 'restaurant_red',
        name: 'Restaurant Red',
        primary: '#ef4444',
        primaryHover: '#dc2626',
        primaryLight: '#fef2f2',
        accent: '#f87171',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        sidebar: '#ffffff',
        sidebarText: '#374151',
        sidebarActive: '#fef2f2',
        sidebarActiveText: '#ef4444'
    },
    vibrant_orange: {
        id: 'vibrant_orange',
        name: 'Vibrant Orange',
        primary: '#f97316',
        primaryHover: '#ea580c',
        primaryLight: '#fff7ed',
        accent: '#fb923c',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        sidebar: '#ffffff',
        sidebarText: '#374151',
        sidebarActive: '#fff7ed',
        sidebarActiveText: '#f97316'
    },
    luxury_gold: {
        id: 'luxury_gold',
        name: 'Luxury Gold',
        primary: '#eab308',
        primaryHover: '#ca8a04',
        primaryLight: '#fefce8',
        accent: '#fbbf24',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        sidebar: '#ffffff',
        sidebarText: '#374151',
        sidebarActive: '#fefce8',
        sidebarActiveText: '#eab308'
    }
};

export interface ThemeContextValue {
    currentTheme: ThemeColors;
    presetThemes: Record<string, ThemeColors>;
    customColors: ThemeColors | null;
    setTheme: (theme: ThemeColors) => void;
    saveTheme: (themeId: string, customTheme?: ThemeColors | null) => Promise<boolean>;
    loading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
    const [currentTheme, setCurrentTheme] = useState<ThemeColors>(PRESET_THEMES.professional_blue);
    const [customColors, setCustomColors] = useState<ThemeColors | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadVenueTheme();
    }, []);

    const loadVenueTheme = async (): Promise<void> => {
        try {
            const venueId = localStorage.getItem('restin_venue');
            if (!venueId) {
                setLoading(false);
                return;
            }

            const response = await api.get(`/venues/${venueId}/settings`);
            const themeSettings = response.data.settings?.ui?.theme;

            if (themeSettings) {
                if (themeSettings.preset && PRESET_THEMES[themeSettings.preset]) {
                    setCurrentTheme(PRESET_THEMES[themeSettings.preset]);
                } else if (themeSettings.custom) {
                    setCustomColors(themeSettings.custom);
                    setCurrentTheme(themeSettings.custom);
                }
            }
        } catch (error) {
            logger.error('Failed to load theme', { error });
        } finally {
            setLoading(false);
        }
    };

    const applyTheme = (theme: ThemeColors): void => {
        setCurrentTheme(theme);

        // Apply CSS variables to root
        const root = document.documentElement;
        root.style.setProperty('--theme-primary', theme.primary);
        root.style.setProperty('--theme-primary-hover', theme.primaryHover);
        root.style.setProperty('--theme-primary-light', theme.primaryLight);
        root.style.setProperty('--theme-accent', theme.accent);
        root.style.setProperty('--theme-success', theme.success);
        root.style.setProperty('--theme-warning', theme.warning);
        root.style.setProperty('--theme-danger', theme.danger);
        root.style.setProperty('--theme-sidebar', theme.sidebar);
        root.style.setProperty('--theme-sidebar-text', theme.sidebarText);
        root.style.setProperty('--theme-sidebar-active', theme.sidebarActive);
        root.style.setProperty('--theme-sidebar-active-text', theme.sidebarActiveText);
    };

    const saveTheme = async (themeId: string, customTheme: ThemeColors | null = null): Promise<boolean> => {
        try {
            const venueId = localStorage.getItem('restin_venue');
            if (!venueId) return false;

            const themeData = customTheme ? {
                custom: customTheme
            } : {
                preset: themeId
            };

            await api.patch(`/venues/${venueId}/settings`, {
                ui: { theme: themeData }
            });

            const theme = customTheme || PRESET_THEMES[themeId];
            applyTheme(theme);

            return true;
        } catch (error) {
            logger.error('Failed to save theme', { error });
            return false;
        }
    };

    useEffect(() => {
        if (currentTheme) {
            applyTheme(currentTheme);
        }
    }, [currentTheme]);

    const value: ThemeContextValue = {
        currentTheme,
        presetThemes: PRESET_THEMES,
        customColors,
        setTheme: applyTheme,
        saveTheme,
        loading
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
