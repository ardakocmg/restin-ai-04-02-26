/**
 * UserSettingsContext - Personal user preferences
 * @module context/UserSettingsContext
 * 
 * Handles personal preferences, 2FA, notifications, display settings
 */
import { createContext,ReactNode,useContext,useEffect,useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import api from '../lib/api';
import { logger } from '../lib/logger';

export type MfaMethod = 'google_authenticator' | 'sms' | 'email' | null;
export type FontSize = 'small' | 'medium' | 'large';

export interface UserSettings {
    // Display
    theme: 'light' | 'dark';
    language: string;
    fontSize: FontSize;
    compactMode: boolean;

    // Notifications
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;

    // Security
    mfaEnabled: boolean;
    mfaMethod: MfaMethod;
    backupCodes: string[];

    // Privacy
    showOnlineStatus: boolean;
    allowAnalytics: boolean;

    // Accessibility
    highContrast: boolean;
    reducedMotion: boolean;
    keyboardShortcuts: boolean;

    // Password
    hasPassword: boolean;
}

export interface Enable2FAResult {
    success: boolean;
    qrCode?: string;
    secret?: string;
    backupCodes?: string[];
    error?: string;
}

export interface Verify2FAResult {
    success: boolean;
    error?: string;
}

export interface UserSettingsContextValue {
    settings: UserSettings;
    updateSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
    enable2FA: (method?: MfaMethod) => Promise<Enable2FAResult>;
    verify2FA: (token: string) => Promise<Verify2FAResult>;
    disable2FA: (password: string) => Promise<Verify2FAResult>;
    loading: boolean;
    refreshSettings: () => Promise<void>;
}

const defaultSettings: UserSettings = {
    theme: 'light',
    language: 'en',
    fontSize: 'medium',
    compactMode: false,
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    mfaEnabled: false,
    mfaMethod: null,
    backupCodes: [],
    showOnlineStatus: true,
    allowAnalytics: true,
    highContrast: false,
    reducedMotion: false,
    keyboardShortcuts: true,
    hasPassword: false
};

const UserSettingsContext = createContext<UserSettingsContextValue | undefined>(undefined);

interface UserSettingsProviderProps {
    children: ReactNode;
}

export function UserSettingsProvider({ children }: UserSettingsProviderProps): JSX.Element {
    const { user } = useAuth();
    const userId = user?.id || null;
    const [settings, setSettings] = useState<UserSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUserSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const loadUserSettings = async (): Promise<void> => {
        try {
            if (!userId) {
                setLoading(false);
                return;
            }

            const response = await api.get(`/users/${userId}/settings`);
            if (response.data) {
                setSettings(prev => ({ ...prev, ...response.data }));
            }
        } catch (error) {
            logger.error('Failed to load user settings', { error });
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (updates: Partial<UserSettings>): Promise<boolean> => {
        try {
            if (!userId) return false;

            await api.patch(`/users/${userId}/settings`, updates);

            setSettings(prev => ({ ...prev, ...updates }));
            return true;
        } catch (error) {
            logger.error('Failed to update settings', { error });
            return false;
        }
    };

    const enable2FA = async (method: MfaMethod = 'google_authenticator'): Promise<Enable2FAResult> => {
        try {
            if (!userId) return { success: false, error: 'Not authenticated' };
            const response = await api.post(`/users/${userId}/2fa/enable`, { method });

            return {
                success: true,
                qrCode: response.data.qrCode,
                secret: response.data.secret,
                backupCodes: response.data.backupCodes
            };
        } catch (error) {
            const err = error as Error;
            logger.error('Failed to enable 2FA', { error: err.message });
            return { success: false, error: err.message };
        }
    };

    const verify2FA = async (token: string): Promise<Verify2FAResult> => {
        try {
            if (!userId) return { success: false, error: 'Not authenticated' };
            const response = await api.post(`/users/${userId}/2fa/verify`, { token });

            if (response.data.verified) {
                setSettings(prev => ({ ...prev, mfaEnabled: true }));
                return { success: true };
            }
            return { success: false, error: 'Invalid token' };
        } catch (error) {
            const err = error as Error;
            logger.error('Failed to verify 2FA', { error: err.message });
            return { success: false, error: err.message };
        }
    };

    const disable2FA = async (password: string): Promise<Verify2FAResult> => {
        try {
            if (!userId) return { success: false, error: 'Not authenticated' };
            await api.post(`/users/${userId}/2fa/disable`, { password });

            setSettings(prev => ({ ...prev, mfaEnabled: false, mfaMethod: null }));
            return { success: true };
        } catch (error) {
            const err = error as Error;
            logger.error('Failed to disable 2FA', { error: err.message });
            return { success: false, error: err.message };
        }
    };

    const value: UserSettingsContextValue = {
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

export function useUserSettings(): UserSettingsContextValue {
    const context = useContext(UserSettingsContext);
    if (!context) {
        throw new Error('useUserSettings must be used within UserSettingsProvider');
    }
    return context;
}
