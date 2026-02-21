/**
 * SafeModeContext - Safety mode for POS/KDS critical operations
 * @module context/SafeModeContext
 */
import React,{ createContext,ReactNode,useContext,useEffect,useState } from 'react';
import { NavigateOptions,useLocation } from 'react-router-dom';
import { logger } from '../lib/logger';

export interface SafeModeContextValue {
    isSafeMode: boolean;
    isKDSRoute: boolean;
    isPOSRoute: boolean;
    setSafeMode: (active: boolean, reason?: string) => void;
    setOrderActive: (active: boolean) => void;
    setSendInProgress: (inProgress: boolean) => void;
    sendInProgress: boolean;
    safeNavigate: (navigate: (path: string, options?: NavigateOptions) => void, path: string, options?: NavigateOptions & { force?: boolean }) => boolean;
}

const defaultContext: SafeModeContextValue = {
    isSafeMode: false,
    isKDSRoute: false,
    isPOSRoute: false,
    setSafeMode: () => { },
    setOrderActive: () => { },
    setSendInProgress: () => { },
    sendInProgress: false,
    safeNavigate: () => true
};

const SafeModeContext = createContext<SafeModeContextValue | null>(null);

export const useSafeMode = (): SafeModeContextValue => {
    const context = useContext(SafeModeContext);
    if (!context) {
        return defaultContext;
    }
    return context;
};

interface SafeModeProviderProps {
    children: ReactNode;
}

export const SafeModeProvider: React.FC<SafeModeProviderProps> = ({ children }) => {
    const [isSafeMode, setIsSafeModeState] = useState(false);
    const [hasActiveOrder, setHasActiveOrder] = useState(false);
    const [sendInProgress, setSendInProgressState] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // Auto-detect safe mode based on route
        const isPOSRoute = location.pathname.startsWith('/pos');
        const isKDSRoute = location.pathname.startsWith('/kds');
        const shouldBeSafe = isPOSRoute || isKDSRoute || hasActiveOrder || sendInProgress;

        if (shouldBeSafe !== isSafeMode) {
            setIsSafeModeState(shouldBeSafe);
        }
    }, [location.pathname, hasActiveOrder, sendInProgress, isSafeMode]);

    const setSafeMode = (active: boolean, reason?: string): void => {
        logger.info('SafeMode state change', { active, reason: reason || 'manual' });
        setIsSafeModeState(active);
    };

    const setOrderActive = (active: boolean): void => {
        setHasActiveOrder(active);
    };

    const setSendInProgress = (inProgress: boolean): void => {
        setSendInProgressState(inProgress);
    };

    const safeNavigate = (
        navigate: (path: string, options?: NavigateOptions) => void,
        path: string,
        options: NavigateOptions & { force?: boolean } = {}
    ): boolean => {
        if (isSafeMode && !options.force) {
            logger.warn('SafeMode navigation blocked', { path });
            return false;
        }
        navigate(path, options);
        return true;
    };

    const value: SafeModeContextValue = {
        isSafeMode,
        isKDSRoute: location.pathname.startsWith('/kds'),
        isPOSRoute: location.pathname.startsWith('/pos'),
        setSafeMode,
        setOrderActive,
        setSendInProgress,
        sendInProgress,
        safeNavigate
    };

    return (
        <SafeModeContext.Provider value={value}>
            {children}
        </SafeModeContext.Provider>
    );
};
