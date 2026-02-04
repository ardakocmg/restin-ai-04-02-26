import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

// Preset Themes - Vendor'lar bunlardan seçebilir
export const PRESET_THEMES = {
  professional_blue: {
    id: 'professional_blue',
    name: 'Professional Blue',
    primary: '#3b82f6',      // blue-500 (softer, more modern)
    primaryHover: '#2563eb', // blue-600
    primaryLight: '#eff6ff', // blue-50 (lighter)
    accent: '#60a5fa',       // blue-400 (brighter accent)
    success: '#10b981',      // emerald-500
    warning: '#f59e0b',      // amber-500
    danger: '#ef4444',       // red-500
    sidebar: '#ffffff',
    sidebarText: '#374151',  // gray-700 (softer text)
    sidebarActive: '#eff6ff',// blue-50 (lighter active state)
    sidebarActiveText: '#3b82f6'
  },
  elegant_purple: {
    id: 'elegant_purple',
    name: 'Elegant Purple',
    primary: '#a855f7',      // purple-500 (softer)
    primaryHover: '#9333ea', // purple-600
    primaryLight: '#faf5ff', // purple-50
    accent: '#c084fc',       // purple-400
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
    primary: '#10b981',      // emerald-500 (softer)
    primaryHover: '#059669', // emerald-600
    primaryLight: '#ecfdf5', // emerald-50
    accent: '#34d399',       // emerald-400
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
    primary: '#ef4444',      // red-500 (softer)
    primaryHover: '#dc2626', // red-600
    primaryLight: '#fef2f2', // red-50
    accent: '#f87171',       // red-400
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
    primary: '#f97316',      // orange-500 (softer)
    primaryHover: '#ea580c', // orange-600
    primaryLight: '#fff7ed', // orange-50
    accent: '#fb923c',       // orange-400
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
    primary: '#eab308',      // yellow-500 (brighter)
    primaryHover: '#ca8a04', // yellow-600
    primaryLight: '#fefce8', // yellow-50
    accent: '#fbbf24',       // yellow-400
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    sidebar: '#ffffff',
    sidebarText: '#374151',
    sidebarActive: '#fefce8',
    sidebarActiveText: '#eab308'
  }
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(PRESET_THEMES.professional_blue);
  const [customColors, setCustomColors] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenueTheme();
  }, []);

  const loadVenueTheme = async () => {
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
      console.error('Failed to load theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (theme) => {
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

  const saveTheme = async (themeId, customTheme = null) => {
    try {
      const venueId = localStorage.getItem('restin_venue');
      if (!venueId) return;

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
      console.error('Failed to save theme:', error);
      return false;
    }
  };

  useEffect(() => {
    if (currentTheme) {
      applyTheme(currentTheme);
    }
  }, [currentTheme]);

  const value = {
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

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
