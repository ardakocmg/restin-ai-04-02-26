import React, { createContext, useContext, useState, useEffect } from 'react';
import { startOfDay, endOfDay, subDays } from 'date-fns';

const POSFilterContext = createContext();

export const POSFilterProvider = ({ children }) => {
    // Try to load initial state from localStorage
    const getInitialState = () => {
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
            } catch (e) {
                console.error('Failed to revive POS filters:', e);
            }
        }
        return {
            dateRange: {
                from: startOfDay(new Date()),
                to: endOfDay(new Date()),
            },
            timeRange: [0, 23],
            activeShift: null, // 'breakfast', 'lunch', 'dinner'
            eventSettings: {
                enabled: false,
                start: "18:00",
                end: "22:00"
            },
            taxInclusive: true
        };
    };

    const [filters, setFilters] = useState(getInitialState);

    // Sync with localStorage
    useEffect(() => {
        localStorage.setItem('pos-filter-settings', JSON.stringify(filters));
    }, [filters]);

    const updateFilters = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    const resetFilters = () => {
        setFilters({
            dateRange: {
                from: startOfDay(new Date()),
                to: endOfDay(new Date()),
            },
            timeRange: [0, 23],
            activeShift: null,
            eventSettings: {
                enabled: false,
                start: "18:00",
                end: "22:00"
            },
            taxInclusive: true
        });
    };

    return (
        <POSFilterContext.Provider value={{ filters, updateFilters, resetFilters }}>
            {children}
        </POSFilterContext.Provider>
    );
};

export const usePOSFilters = () => {
    const context = useContext(POSFilterContext);
    if (!context) {
        throw new Error('usePOSFilters must be used within a POSFilterProvider');
    }
    return context;
};
