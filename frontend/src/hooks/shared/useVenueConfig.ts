/**
 * Unified Venue Config Service Hook
 * 
 * Shared data layer for POS-specific configuration:
 * - Void reasons, Courses, Printing profiles, Receipt templates
 * - Order profiles, Service charges, Discounts
 * - Device configs, Floor plans
 */
import { useState, useCallback } from 'react';
import api from '../../lib/api';
import { logger } from '../../lib/logger';

type ConfigType =
    | 'void-reasons'
    | 'courses'
    | 'printing-profiles'
    | 'receipt-templates'
    | 'order-profiles'
    | 'service-charges'
    | 'discounts'
    | 'production-instructions'
    | 'item-tags'
    | 'kiosk-config'
    | 'display-config'
    | 'allergens'
    | 'production-centers'
    | 'tax-profiles'
    | 'payment-methods'
    | 'floor-plans'
    | 'loyalty-config'
    | 'accounting-groups';

interface UseVenueConfigOptions {
    venueId: string;
    configType: ConfigType;
    enabled?: boolean;
}

export function useVenueConfig<T = Record<string, unknown>>(options: UseVenueConfigOptions) {
    const { venueId, configType, enabled = true } = options;

    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchConfig = useCallback(async () => {
        if (!venueId || !enabled) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/venues/${venueId}/config/${configType}`);
            const result = res.data?.items || res.data || [];
            setData(Array.isArray(result) ? result : []);
        } catch (err) {
            logger.error(`Failed to fetch config ${configType}:`, err as Record<string, unknown>);
            setError(`Failed to load ${configType}`);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [venueId, configType, enabled]);

    const saveItem = useCallback(
        async (item: Partial<T & { id?: string }>) => {
            if (!venueId) return;
            try {
                const itemWithVenue = { ...item, venue_id: venueId };
                if ((item as { id?: string }).id) {
                    await api.put(
                        `/venues/${venueId}/config/${configType}/${(item as { id: string }).id}`,
                        itemWithVenue
                    );
                } else {
                    await api.post(`/venues/${venueId}/config/${configType}`, itemWithVenue);
                }
                await fetchConfig();
            } catch (err) {
                logger.error(`Failed to save ${configType}:`, err as Record<string, unknown>);
                throw err;
            }
        },
        [venueId, configType, fetchConfig]
    );

    const deleteItem = useCallback(
        async (itemId: string) => {
            if (!venueId) return;
            try {
                await api.delete(`/venues/${venueId}/config/${configType}/${itemId}`);
                await fetchConfig();
            } catch (err) {
                logger.error(`Failed to delete ${configType}:`, err as Record<string, unknown>);
                throw err;
            }
        },
        [venueId, configType, fetchConfig]
    );

    return {
        data,
        loading,
        error,
        refetch: fetchConfig,
        saveItem,
        deleteItem,
    };
}

export default useVenueConfig;
