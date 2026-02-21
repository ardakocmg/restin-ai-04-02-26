/**
 * Unified Loyalty Service Hook
 * 
 * Shared data layer for POS Loyalty Config + CRM Loyalty pages.
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { logger } from '../../lib/logger';

export interface LoyaltyConfig {
    id?: string;
    venue_id: string;
    enabled: boolean;
    points_per_euro: number;
    redemption_rate: number;
    welcome_bonus: number;
    tiers: LoyaltyTier[];
}

export interface LoyaltyTier {
    name: string;
    min_points: number;
    multiplier: number;
    perks: string[];
}

interface UseLoyaltyServiceOptions {
    venueId: string;
    enabled?: boolean;
}

export function useLoyaltyService(options: UseLoyaltyServiceOptions) {
    const { venueId, enabled = true } = options;

    const [config, setConfig] = useState<LoyaltyConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchConfig = useCallback(async () => {
        if (!venueId || !enabled) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/venues/${venueId}/loyalty/config`);
            setConfig(res.data);
        } catch (err) {
            logger.error('Failed to fetch loyalty config:', err as /**/any);
            setError('Failed to load loyalty configuration');
            setConfig(null);
        } finally {
            setLoading(false);
        }
    }, [venueId, enabled]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const updateConfig = useCallback(
        async (updates: Partial<LoyaltyConfig>) => {
            if (!venueId) return;
            try {
                const res = await api.put(`/venues/${venueId}/loyalty/config`, updates);
                setConfig(res.data);
                return res.data;
            } catch (err) {
                logger.error('Failed to update loyalty config:', err as /**/any);
                throw err;
            }
        },
        [venueId]
    );

    return { config, loading, error, refetch: fetchConfig, updateConfig };
}

export default useLoyaltyService;
