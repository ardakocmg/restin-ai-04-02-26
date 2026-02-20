/**
 * Unified Guest Service Hook
 * 
 * Shared data layer for POS + CRM modules.
 * Fetches guest profiles with order history and loyalty points.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../lib/api';
import { logger } from '../../lib/logger';

export interface GuestProfile {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    venue_id: string;
    loyalty_points?: number;
    total_visits?: number;
    total_spent?: number;
    last_visit?: string;
    tags?: string[];
    preferences?: Record<string, unknown>;
    notes?: string;
    created_at?: string;
}

interface UseGuestServiceOptions {
    venueId: string;
    search?: string;
    enabled?: boolean;
}

export function useGuestService(options: UseGuestServiceOptions) {
    const { venueId, search, enabled = true } = options;

    const [guests, setGuests] = useState<GuestProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGuests = useCallback(async () => {
        if (!venueId || !enabled) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            const res = await api.get(`/venues/${venueId}/guests?${params.toString()}`);
            const data = res.data?.guests || res.data || [];
            setGuests(Array.isArray(data) ? data : []);
        } catch (err) {
            logger.error('Failed to fetch guests:', err as Record<string, unknown>);
            setError('Failed to load guest profiles');
            setGuests([]);
        } finally {
            setLoading(false);
        }
    }, [venueId, search, enabled]);

    useEffect(() => {
        fetchGuests();
    }, [fetchGuests]);

    const getGuestDetail = useCallback(
        async (guestId: string) => {
            try {
                const res = await api.get(`/guests/${guestId}`);
                return res.data;
            } catch (err) {
                logger.error('Failed to fetch guest detail:', err as Record<string, unknown>);
                return null;
            }
        },
        []
    );

    const vipGuests = useMemo(
        () => guests.filter((g) => (g.total_spent || 0) > 500 || (g.total_visits || 0) > 20),
        [guests]
    );

    return {
        guests,
        vipGuests,
        loading,
        error,
        refetch: fetchGuests,
        getGuestDetail,
    };
}

export default useGuestService;
