/**
 * MultiVenueContext - Multi-venue support and switching
 * @module context/MultiVenueContext
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import { logger } from '../lib/logger';

export interface MultiVenue {
    id: string;
    name: string;
    [key: string]: unknown;
}

export interface MultiVenueContextValue {
    availableVenues: MultiVenue[];
    currentVenue: MultiVenue | null;
    loading: boolean;
    switchVenue: (venueId: string) => void;
    hasMultipleVenues: boolean;
}

const MultiVenueContext = createContext<MultiVenueContextValue | undefined>(undefined);

interface MultiVenueProviderProps {
    children: ReactNode;
}

export function MultiVenueProvider({ children }: MultiVenueProviderProps): JSX.Element {
    const [availableVenues, setAvailableVenues] = useState<MultiVenue[]>([]);
    const [currentVenue, setCurrentVenue] = useState<MultiVenue | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAvailableVenues();
    }, []);

    const loadAvailableVenues = async (): Promise<void> => {
        try {
            const userStr = localStorage.getItem('restin_user');
            const user = userStr ? JSON.parse(userStr) : {};
            const allowedVenueIds: string[] = user.allowedVenueIds || [user.venueId];

            // Load all venues user has access to
            const venuesRes = await api.get('/venues');
            logger.debug('Venues response full', { data: venuesRes.data });
            const data = venuesRes.data;

            let userVenues: MultiVenue[] = [];
            if (Array.isArray(data)) {
                userVenues = data.filter((v: MultiVenue) => allowedVenueIds.includes(v.id));
            } else if (data && Array.isArray(data.items)) {
                userVenues = data.items.filter((v: MultiVenue) => allowedVenueIds.includes(v.id));
            } else if (data && typeof data === 'object') {
                logger.debug('Data is object but not array, checking for single venue');
                if (data.id && allowedVenueIds.includes(data.id)) {
                    userVenues = [data];
                } else {
                    logger.warn('Data object does not look like a venue or list', { data });
                }
            } else {
                logger.error('Venues response data is missing or invalid type', { type: typeof data });
            }

            setAvailableVenues(userVenues);

            // Set current venue from localStorage or default
            const savedVenueId = localStorage.getItem('restin_venue');
            const currentV = userVenues.find(v => v.id === savedVenueId) || userVenues[0];
            setCurrentVenue(currentV || null);

        } catch (error) {
            const err = error as Error;
            logger.error('Failed to load venues', { error: err.message });
        } finally {
            setLoading(false);
        }
    };

    const switchVenue = (venueId: string): void => {
        const venue = availableVenues.find(v => v.id === venueId);
        if (venue) {
            setCurrentVenue(venue);
            localStorage.setItem('restin_venue', venueId);
            // Reload page to refresh all data for new venue
            window.location.reload();
        }
    };

    const value: MultiVenueContextValue = {
        availableVenues,
        currentVenue,
        loading,
        switchVenue,
        hasMultipleVenues: availableVenues.length > 1
    };

    return (
        <MultiVenueContext.Provider value={value}>
            {children}
        </MultiVenueContext.Provider>
    );
}

export function useMultiVenue(): MultiVenueContextValue {
    const context = useContext(MultiVenueContext);
    if (!context) {
        throw new Error('useMultiVenue must be used within MultiVenueProvider');
    }
    return context;
}
