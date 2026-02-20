// @ts-nocheck
/**
 * POSFilterContext - POS date/time/shift filtering
 * @module context/POSFilterContext
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { startOfDay, endOfDay } from 'date-fns';
import { logger } from '../lib/logger';

export type ShiftType = 'breakfast' | 'lunch' | 'dinner' | null;

export interface EventSettings {
    enabled: boolean;
    start: string;
    end: string;
}

export interface DateRange {
    from: Date;
    to: Date;
}

export interface POSFilters {
    dateRange: DateRange;
    timeRange: [number, number];
    activeShift: ShiftType;
    eventSettings: EventSettings;
    taxInclusive: boolean;
}

export interface POSFilterContextValue {
    filters: POSFilters;
    updateFilters: (newFilters: Partial<POSFilters>) => void;
    resetFilters: () => void;
}

const defaultFilters: POSFilters = {
    dateRange: {
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
    },
    timeRange: [0, 23],
    activeShift: null,
    eventSettings: {
        enabled: false,
        start: '18:00',
        end: '22:00'
    },
    taxInclusive: true
};

const POSFilterContext = createContext<POSFilterContextValue | undefined>(undefined);

interface POSFilterProviderProps {
    children: ReactNode;
}

export const POSFilterProvider: React.FC<POSFilterProviderProps> = ({ children }) => {
    const getInitialState = (): POSFilters => {
        const saved = localStorage.getItem('pos-filter-settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Revive dates
                return {
                    ...parsed,
                    dateRange: {
                        from: new Date(parsed.dateRange.from),
                        to: new Date(parsed.dateRange.to)
                    }
                };
            } catch (e: any) {
                logger.error('Failed to revive POS filters', { error: e });
            }
        }
        return defaultFilters;
    };

    const [filters, setFilters] = useState<POSFilters>(getInitialState);

    // Sync with localStorage
    useEffect(() => {
        localStorage.setItem('pos-filter-settings', JSON.stringify(filters));
    }, [filters]);

    const updateFilters = (newFilters: Partial<POSFilters>): void => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    const resetFilters = (): void => {
        setFilters(defaultFilters);
    };

    const value: POSFilterContextValue = {
        filters,
        updateFilters,
        resetFilters
    };

    return (
        <POSFilterContext.Provider value={value}>
            {children}
        </POSFilterContext.Provider>
    );
};

export const usePOSFilters = (): POSFilterContextValue => {
    const context = useContext(POSFilterContext);
    if (!context) {
        throw new Error('usePOSFilters must be used within a POSFilterProvider');
    }
    return context;
};
