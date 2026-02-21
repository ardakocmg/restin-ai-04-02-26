/**
 * i18n Configuration - Internationalization Setup
 * @module lib/i18n/config
 * 
 * Supports:
 * - English (en) - Default
 * - Maltese (mt) - Local language
 * - Kitchen vs Service language toggle (Rule #19)
 */
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enTranslations from '../../locales/en.json';
import mtTranslations from '../../locales/mt.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: enTranslations
            },
            mt: {
                translation: mtTranslations
            }
        },
        fallbackLng: 'en',
        debug: false,
        interpolation: {
            escapeValue: false // React already escapes
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'restin_language'
        }
    });

export default i18n;

// Helper for kitchen-specific translations (staff-facing)
export const getKitchenLanguage = (): string => {
    return localStorage.getItem('restin_kitchen_lang') || 'en';
};

export const setKitchenLanguage = (lang: string): void => {
    localStorage.setItem('restin_kitchen_lang', lang);
};

// Helper for service-specific translations (guest-facing)
export const getServiceLanguage = (): string => {
    return localStorage.getItem('restin_service_lang') || 'en';
};

export const setServiceLanguage = (lang: string): void => {
    localStorage.setItem('restin_service_lang', lang);
};

// Switch language globally
export const changeLanguage = (lang: 'en' | 'mt'): void => {
    i18n.changeLanguage(lang);
    localStorage.setItem('restin_language', lang);
};

// Get current language
export const getCurrentLanguage = (): string => {
    return i18n.language || 'en';
};
