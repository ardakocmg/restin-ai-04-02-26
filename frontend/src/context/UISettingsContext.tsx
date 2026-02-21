/**
 * UISettingsContext - Debug mode and error copy settings
 * @module context/UISettingsContext
 */
import React,{ createContext,ReactNode,useContext,useEffect,useState } from 'react';

export interface ErrorCopy {
    genericTitle: string;
    genericBody: string;
    kitchenBody: string;
    staffBody: string;
}

export interface UISettingsContextValue {
    debugMode: boolean;
    setDebugMode: React.Dispatch<React.SetStateAction<boolean>>;
    locale: string;
    setLocale: React.Dispatch<React.SetStateAction<string>>;
    errorCopy: ErrorCopy;
    setErrorCopy: React.Dispatch<React.SetStateAction<ErrorCopy>>;
}

const defaultErrorCopy: ErrorCopy = {
    genericTitle: 'Something went wrong',
    genericBody: 'Please refresh the page. If this persists, contact your manager.',
    kitchenBody: 'Temporary system issue. Please retry.',
    staffBody: 'Temporary system issue. Please call your manager.'
};

const defaultContext: UISettingsContextValue = {
    debugMode: false,
    setDebugMode: () => { },
    locale: 'en',
    setLocale: () => { },
    errorCopy: defaultErrorCopy,
    setErrorCopy: () => { }
};

const UISettingsContext = createContext<UISettingsContextValue | null>(null);

export const useUISettings = (): UISettingsContextValue => {
    const ctx = useContext(UISettingsContext);
    if (!ctx) {
        return defaultContext;
    }
    return ctx;
};

interface UISettingsProviderProps {
    children: ReactNode;
}

export function UISettingsProvider({ children }: UISettingsProviderProps): JSX.Element {
    const [debugMode, setDebugMode] = useState(false);
    const [locale, setLocale] = useState('en');
    const [errorCopy, setErrorCopy] = useState<ErrorCopy>(defaultErrorCopy);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('restin_ui_settings');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (typeof parsed.debugMode === 'boolean') setDebugMode(parsed.debugMode);
                if (parsed.errorCopy) setErrorCopy(prev => ({ ...prev, ...parsed.errorCopy }));
                if (parsed.locale) setLocale(parsed.locale);
            }
        } catch {
            // Ignore parse errors
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        localStorage.setItem(
            'restin_ui_settings',
            JSON.stringify({ debugMode, locale, errorCopy })
        );
    }, [debugMode, locale, errorCopy]);

    const value: UISettingsContextValue = {
        debugMode,
        setDebugMode,
        locale,
        setLocale,
        errorCopy,
        setErrorCopy
    };

    return (
        <UISettingsContext.Provider value={value}>
            {children}
        </UISettingsContext.Provider>
    );
}
