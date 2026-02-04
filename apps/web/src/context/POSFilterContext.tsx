'use client';

import React, { createContext, useContext, useState } from 'react';

type POSFilters = {
    dateRange: { from: Date | undefined; to: Date | undefined };
    activeShift: string;
};

type POSFilterContextType = {
    filters: POSFilters;
    setFilters: (filters: POSFilters) => void;
};

const POSFilterContext = createContext<POSFilterContextType>({
    filters: { dateRange: { from: new Date(), to: new Date() }, activeShift: 'all' },
    setFilters: () => { },
});

export const POSFilterProvider = ({ children }: { children: React.ReactNode }) => {
    const [filters, setFilters] = useState<POSFilters>({
        dateRange: { from: new Date(), to: new Date() },
        activeShift: 'all',
    });

    return (
        <POSFilterContext.Provider value={{ filters, setFilters }}>
            {children}
        </POSFilterContext.Provider>
    );
};

export const usePOSFilters = () => useContext(POSFilterContext);
