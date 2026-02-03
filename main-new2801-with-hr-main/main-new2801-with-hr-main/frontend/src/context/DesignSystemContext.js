import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

/**
 * Comprehensive Design System Context
 * - Theme (Light/Dark mode)
 * - Brand colors (restin.ai: white + red)
 * - Currency symbols & formatting
 * - Venue-level customization
 * - User preferences
 */

const DesignSystemContext = createContext();

export const BRAND_CONFIG = {
  name: 'restin.ai',
  logo: {
    restin: { text: 'restin', color: '#FFFFFF' },
    ai: { text: '.ai', color: '#E53935' }
  },
  colors: {
    brand: '#E53935',        // Red for .ai
    brandHover: '#C62828',
    brandLight: '#FFEBEE',
    white: '#FFFFFF'         // White for restin
  }
};

export const THEME_MODES = {
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

export const CURRENCY_CONFIGS = {
  EUR: { symbol: '€', name: 'Euro', position: 'after', decimals: 2 },
  USD: { symbol: '$', name: 'US Dollar', position: 'before', decimals: 2 },
  GBP: { symbol: '£', name: 'British Pound', position: 'before', decimals: 2 },
  TRY: { symbol: '₺', name: 'Turkish Lira', position: 'after', decimals: 2 },
  AED: { symbol: 'د.إ', name: 'UAE Dirham', position: 'before', decimals: 2 },
  SAR: { symbol: 'ر.س', name: 'Saudi Riyal', position: 'before', decimals: 2 }
};

export function DesignSystemProvider({ children }) {
  const [themeMode, setThemeMode] = useState('light');
  const [currency, setCurrency] = useState('EUR');
  const [venueColors, setVenueColors] = useState(null);
  const [userPreferences, setUserPreferences] = useState({
    fontSize: 'medium',
    compactMode: false,
    sidebarCollapsed: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDesignSettings();
  }, []);

  const loadDesignSettings = async () => {
    try {
      // Load from localStorage first
      const savedTheme = localStorage.getItem('restin_theme_mode');
      if (savedTheme) {
        setThemeMode(savedTheme);
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
      console.error('Failed to load design settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
    localStorage.setItem('restin_theme_mode', newMode);
    applyTheme(newMode);
  };

  const applyTheme = (mode) => {
    const theme = THEME_MODES[mode];
    const root = document.documentElement;

    // Remove previous theme class
    root.classList.remove('light', 'dark');
    root.classList.add(mode);

    // Apply CSS variables
    Object.entries(theme).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'name') {
        root.style.setProperty(`--${key}`, value);
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

  const updateUserPreferences = (prefs) => {
    const updated = { ...userPreferences, ...prefs };
    setUserPreferences(updated);
    localStorage.setItem('restin_user_preferences', JSON.stringify(updated));
  };

  const formatCurrency = (amount, currencyCode = currency) => {
    const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS.EUR;
    const formatted = amount.toFixed(config.decimals);
    
    if (config.position === 'before') {
      return `${config.symbol}${formatted}`;
    }
    return `${formatted} ${config.symbol}`;
  };

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode, venueColors]);

  const value = {
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

export function useDesignSystem() {
  const context = useContext(DesignSystemContext);
  if (!context) {
    throw new Error('useDesignSystem must be used within DesignSystemProvider');
  }
  return context;
}
