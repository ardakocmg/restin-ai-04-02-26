import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

/**
 * User Settings Context
 * - Personal preferences
 * - 2FA settings
 * - Notification preferences
 * - Display settings
 */

const UserSettingsContext = createContext();

export function UserSettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    // Display
    theme: 'light',
    language: 'en',
    fontSize: 'medium',
    compactMode: false,
    
    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    
    // Security
    mfaEnabled: false,
    mfaMethod: null, // 'google_authenticator', 'sms', 'email'
    backupCodes: [],
    
    // Privacy
    showOnlineStatus: true,
    allowAnalytics: true,
    
    // Accessibility
    highContrast: false,
    reducedMotion: false,
    keyboardShortcuts: true
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const userId = localStorage.getItem('restin_user_id');
      if (!userId) {
        setLoading(false);
        return;
      }

      const response = await api.get(`/users/${userId}/settings`);
      if (response.data) {
        setSettings(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates) => {
    try {
      const userId = localStorage.getItem('restin_user_id');
      if (!userId) return false;

      const response = await api.patch(`/users/${userId}/settings`, updates);
      
      setSettings(prev => ({ ...prev, ...updates }));
      return true;
    } catch (error) {
      console.error('Failed to update settings:', error);
      return false;
    }
  };

  const enable2FA = async (method = 'google_authenticator') => {
    try {
      const userId = localStorage.getItem('restin_user_id');
      const response = await api.post(`/users/${userId}/2fa/enable`, { method });
      
      return {
        success: true,
        qrCode: response.data.qrCode,
        secret: response.data.secret,
        backupCodes: response.data.backupCodes
      };
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      return { success: false, error: error.message };
    }
  };

  const verify2FA = async (token) => {
    try {
      const userId = localStorage.getItem('restin_user_id');
      const response = await api.post(`/users/${userId}/2fa/verify`, { token });
      
      if (response.data.verified) {
        setSettings(prev => ({ ...prev, mfaEnabled: true }));
        return { success: true };
      }
      return { success: false, error: 'Invalid token' };
    } catch (error) {
      console.error('Failed to verify 2FA:', error);
      return { success: false, error: error.message };
    }
  };

  const disable2FA = async (password) => {
    try {
      const userId = localStorage.getItem('restin_user_id');
      await api.post(`/users/${userId}/2fa/disable`, { password });
      
      setSettings(prev => ({ ...prev, mfaEnabled: false, mfaMethod: null }));
      return { success: true };
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    settings,
    updateSettings,
    enable2FA,
    verify2FA,
    disable2FA,
    loading,
    refreshSettings: loadUserSettings
  };

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error('useUserSettings must be used within UserSettingsProvider');
  }
  return context;
}
