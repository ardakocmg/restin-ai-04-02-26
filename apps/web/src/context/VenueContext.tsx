'use client';

import React, { createContext, useContext, useState } from 'react';

type VenueContextType = {
    activeVenueId: string;
    setActiveVenueId: (id: string) => void;
};

const VenueContext = createContext<VenueContextType>({
    activeVenueId: 'venue_123',
    setActiveVenueId: () => { },
});

export const VenueProvider = ({ children }: { children: React.ReactNode }) => {
    const [activeVenueId, setActiveVenueId] = useState('venue_123');

    return (
        <VenueContext.Provider value={{ activeVenueId, setActiveVenueId }}>
            {children}
        </VenueContext.Provider>
    );
};

export const useVenue = () => useContext(VenueContext);
