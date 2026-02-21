// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import axios from 'axios';
import { logger } from '../lib/logger';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

export interface Venue {
    id: string;
    name: string;
    address?: string;
    [key: string]: unknown;
}

export interface VenueContextValue {
    venues: Venue[];
    activeVenue: Venue | null;
    activeVenueId: string | null;
    loading: boolean;
    selectVenue: (venue: Venue) => void;
    refreshVenues: () => void;
}

const VenueContext = createContext<VenueContextValue | null>(null);

export const useVenue = (): VenueContextValue => {
    const context = useContext(VenueContext);
    if (!context) {
        throw new Error('useVenue must be used within VenueProvider');
    }
    return context;
};

interface VenueProviderProps {
    children: ReactNode;
}

export const VenueProvider: React.FC<VenueProviderProps> = ({ children }) => {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [activeVenue, setActiveVenue] = useState<Venue | null>(null);
    const [activeVenueId, setActiveVenueId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const fetchingRef = useRef(false);

    const loadVenues = async (): Promise<void> => {
        if (fetchingRef.current) return; // Dedup: skip if already fetching
        fetchingRef.current = true;
        try {
            const response = await axios.get(`${API}/venues`);
            setVenues(response.data);

            // Auto-select first venue if none selected
            if (!activeVenue && response.data.length > 0) {
                const storedVenue = localStorage.getItem('restin_active_venue');
                if (!storedVenue) {
                    selectVenue(response.data[0]);
                }
            }
        } catch (error) {
            logger.error('Failed to load venues', { error });
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    };

    const selectVenue = (venue: Venue): void => {
        setActiveVenue(venue);
        setActiveVenueId(venue.id);
        localStorage.setItem('restin_active_venue', JSON.stringify(venue));
        localStorage.setItem('activeVenueId', venue.id);
        localStorage.setItem('currentVenueId', venue.id); // For compatibility
    };

    const refreshVenues = (): void => {
        loadVenues();
    };

    useEffect(() => {
        loadVenues();

        // Load stored active venue ID or object
        const storedVenueId = localStorage.getItem('activeVenueId');
        const storedVenue = localStorage.getItem('restin_active_venue');

        if (storedVenueId) {
            setActiveVenueId(storedVenueId);
        }

        if (storedVenue) {
            try {
                const venue = JSON.parse(storedVenue) as Venue;
                setActiveVenue(venue);
                setActiveVenueId(venue.id);
                // Ensure compatibility with components using 'currentVenueId'
                if (!localStorage.getItem('currentVenueId')) {
                    localStorage.setItem('currentVenueId', venue.id);
                }
            } catch {
                logger.warn('Failed to parse stored venue');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value: VenueContextValue = {
        venues,
        activeVenue,
        activeVenueId,
        loading,
        selectVenue,
        refreshVenues
    };

    return (
        <VenueContext.Provider value={value}>
            {children}
        </VenueContext.Provider>
    );
};
