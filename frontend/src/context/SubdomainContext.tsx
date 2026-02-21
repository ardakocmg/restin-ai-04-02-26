/**
 * SubdomainContext - Hybrid Multi-Tenant Architecture
 * @module context/SubdomainContext
 * 
 * Detects venue and module from subdomain
 * Pattern: {venueSlug}-{module}.domain.com
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import { logger } from '../lib/logger';

export const SUPPORTED_MODULES = [
    'pos',
    'kds',
    'admin',
    'management',
    'inventory',
    'accounting',
    'finance',
    'hr',
    'workforce',
    'analytics',
    'reports',
    'crm',
    'reputation',
    'loyalty',
    'system',
    'integrations',
    'reservations'
] as const;

export type SupportedModule = typeof SUPPORTED_MODULES[number];

export interface SubdomainContextState {
    isSubdomain: boolean;
    venueSlug: string | null;
    module: SupportedModule | null;
    venue: /**/any | null;
    group: /**/any | null;
    loading: boolean;
}

export interface SubdomainContextValue extends SubdomainContextState {
    switchVenue: (venueSlug: string, module: SupportedModule) => void;
    refreshContext: () => Promise<void>;
}

const SubdomainContext = createContext<SubdomainContextValue | undefined>(undefined);

interface SubdomainProviderProps {
    children: ReactNode;
}

export function SubdomainProvider({ children }: SubdomainProviderProps): JSX.Element {
    const [context, setContext] = useState<SubdomainContextState>({
        isSubdomain: false,
        venueSlug: null,
        module: null,
        venue: null,
        group: null,
        loading: true
    });

    useEffect(() => {
        detectSubdomain();
    }, []);

    const detectSubdomain = async (): Promise<void> => {
        try {
            const hostname = window.location.hostname;

            // Skip localhost and IP addresses
            if (hostname === 'localhost' || hostname.startsWith('192.168') || hostname === '127.0.0.1') {
                setContext(prev => ({ ...prev, loading: false }));
                return;
            }

            // Parse subdomain
            const parts = hostname.split('.');
            if (parts.length < 3) {
                setContext(prev => ({ ...prev, loading: false }));
                return;
            }

            const subdomain = parts[0];
            const match = subdomain.match(/^([a-z0-9\-]+)-([a-z]+)$/);

            if (!match) {
                setContext(prev => ({ ...prev, loading: false }));
                return;
            }

            const venueSlug = match[1];
            const module = match[2] as SupportedModule;

            // Validate module
            if (!SUPPORTED_MODULES.includes(module)) {
                logger.warn(`Unsupported module: ${module}`);
                setContext(prev => ({ ...prev, loading: false }));
                return;
            }

            // Fetch venue and group data
            const response = await api.get('/venue-groups/context/current');

            setContext({
                isSubdomain: true,
                venueSlug,
                module,
                venue: response.data.venue || null,
                group: response.data.group || null,
                loading: false
            });

        } catch (error) {
            logger.error('Failed to detect subdomain', { error });
            setContext(prev => ({ ...prev, loading: false }));
        }
    };

    const switchVenue = (venueSlug: string, module: SupportedModule): void => {
        // Build new subdomain URL
        const hostname = window.location.hostname;
        const baseDomain = hostname.split('.').slice(1).join('.');
        const newHostname = `${venueSlug}-${module}.${baseDomain}`;
        const newUrl = `${window.location.protocol}//${newHostname}${window.location.pathname}`;

        // Navigate to new venue
        window.location.href = newUrl;
    };

    const value: SubdomainContextValue = {
        ...context,
        switchVenue,
        refreshContext: detectSubdomain
    };

    return (
        <SubdomainContext.Provider value={value}>
            {children}
        </SubdomainContext.Provider>
    );
}

export function useSubdomain(): SubdomainContextValue {
    const context = useContext(SubdomainContext);
    if (!context) {
        throw new Error('useSubdomain must be used within SubdomainProvider');
    }
    return context;
}
