/**
 * RuntimeContext - App mode and navigation safety
 * @module context/RuntimeContext
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation, NavigateOptions } from 'react-router-dom';
import { logger } from '../lib/logger';

export type AppMode = 'ADMIN' | 'POS' | 'KDS' | 'PUBLIC';

export interface RuntimeContextValue {
    appMode: AppMode;
    safeMode: boolean;
    navigationLock: boolean;
    lastGoodRoute: string;
    setAppMode: (mode: AppMode) => void;
    setSafeMode: (active: boolean, reason?: string) => void;
    setNavigationLock: (locked: boolean) => void;
    safeNavigate: (navigate: (path: string, options?: NavigateOptions) => void, path: string, options?: NavigateOptions & { force?: boolean }) => boolean;
}

const defaultContext: RuntimeContextValue = {
    appMode: 'ADMIN',
    safeMode: false,
    navigationLock: false,
    lastGoodRoute: '/',
    setAppMode: () => { },
    setSafeMode: () => { },
    setNavigationLock: () => { },
    safeNavigate: () => true
};

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export const useRuntime = (): RuntimeContextValue => {
    const context = useContext(RuntimeContext);
    if (!context) {
        return defaultContext;
    }
    return context;
};

interface RuntimeProviderProps {
    children: ReactNode;
}

export const RuntimeProvider: React.FC<RuntimeProviderProps> = ({ children }) => {
    const [appMode, setAppMode] = useState<AppMode>('ADMIN');
    const [safeMode, setSafeModeState] = useState(false);
    const [navigationLock, setNavigationLock] = useState(false);
    const [lastGoodRoute, setLastGoodRoute] = useState('/');
    const location = useLocation();

    useEffect(() => {
        // Detect app mode from route
        if (location.pathname.startsWith('/pos')) {
            setAppMode('POS');
            setSafeModeState(true);
        } else if (location.pathname.startsWith('/kds')) {
            setAppMode('KDS');
            setSafeModeState(true);
        } else if (location.pathname.startsWith('/manager')) {
            setAppMode('ADMIN');
            setSafeModeState(false);
        } else {
            setAppMode('PUBLIC');
            setSafeModeState(false);
        }

        // Save last good route (not login/error pages)
        if (!location.pathname.includes('/login') && !location.pathname.includes('/error')) {
            setLastGoodRoute(location.pathname);
            localStorage.setItem('restin_last_route', location.pathname);
        }
    }, [location.pathname]);

    const setSafeMode = (active: boolean, reason?: string): void => {
        logger.info('SafeMode toggle', { active, reason: reason || '' });
        setSafeModeState(active);
    };

    const safeNavigate = (
        navigate: (path: string, options?: NavigateOptions) => void,
        path: string,
        options: NavigateOptions & { force?: boolean } = {}
    ): boolean => {
        if ((safeMode || navigationLock) && !options.force) {
            logger.warn('Navigation blocked', { path, safeMode, locked: navigationLock });
            return false;
        }
        navigate(path, options);
        return true;
    };

    const value: RuntimeContextValue = {
        appMode,
        safeMode,
        navigationLock,
        lastGoodRoute,
        setAppMode,
        setSafeMode,
        setNavigationLock,
        safeNavigate
    };

    return (
        <RuntimeContext.Provider value={value}>
            {children}
        </RuntimeContext.Provider>
    );
};
