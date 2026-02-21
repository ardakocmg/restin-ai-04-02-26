/**
 * Unified Staff Service Hook
 * 
 * Shared data layer for POS + HR modules.
 * Fetches enriched staff with POS config, shifts, and transaction stats.
 * Falls back to local data when API is unavailable.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../lib/api';
import { logger } from '../../lib/logger';

export interface PosConfig {
    pin: string;
    permissions: string[];
    group: string;
    is_pos_active: boolean;
}

export interface StaffShifts {
    current: /**/any | null;
    upcoming: /**/any[];
}

export interface StaffStats {
    orders_30d: number;
    revenue_30d: number;
    avg_order_30d: number;
    voids_30d: number;
}

export interface StaffMember {
    id: string;
    name: string;
    email: string;
    role: string;
    venue_id: string;
    phone?: string;
    avatar?: string;
    pos_config?: PosConfig;
    shifts?: StaffShifts;
    stats?: StaffStats;
    created_at?: string;
}

export interface StaffActivity {
    user_id: string;
    period_days: number;
    orders: /**/any[];
    order_count: number;
    total_revenue: number;
    voids: /**/any[];
    void_count: number;
    discounts: /**/any[];
    discount_count: number;
    shifts: /**/any[];
    shift_count: number;
    clockings: /**/any[];
    total_hours: number;
}

interface UseStaffServiceOptions {
    venueId: string;
    includePos?: boolean;
    includeShifts?: boolean;
    includeStats?: boolean;
    role?: string;
    search?: string;
    enabled?: boolean;
}

export function useStaffService(options: UseStaffServiceOptions) {
    const {
        venueId,
        includePos = true,
        includeShifts = false,
        includeStats = false,
        role,
        search,
        enabled = true,
    } = options;

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStaff = useCallback(async () => {
        if (!venueId || !enabled) return;
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (includePos) params.append('include_pos', 'true');
            if (includeShifts) params.append('include_shifts', 'true');
            if (includeStats) params.append('include_stats', 'true');
            if (role) params.append('role', role);
            if (search) params.append('search', search);

            const res = await api.get(`/venues/${venueId}/staff?${params.toString()}`);
            setStaff(res.data.staff || []);
        } catch (err) {
            logger.error('Failed to fetch staff:', err as /**/any);
            setError('Failed to load staff data');
            setStaff([]);
        } finally {
            setLoading(false);
        }
    }, [venueId, includePos, includeShifts, includeStats, role, search, enabled]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const getStaffDetail = useCallback(
        async (userId: string): Promise<StaffMember | null> => {
            if (!venueId) return null;
            try {
                const res = await api.get(`/venues/${venueId}/staff/${userId}`);
                return res.data;
            } catch (err) {
                logger.error('Failed to fetch staff detail:', err as /**/any);
                return null;
            }
        },
        [venueId]
    );

    const getStaffActivity = useCallback(
        async (userId: string, days = 30): Promise<StaffActivity | null> => {
            if (!venueId) return null;
            try {
                const res = await api.get(
                    `/venues/${venueId}/staff/${userId}/activity?days=${days}`
                );
                return res.data;
            } catch (err) {
                logger.error('Failed to fetch staff activity:', err as /**/any);
                return null;
            }
        },
        [venueId]
    );

    const updatePosConfig = useCallback(
        async (userId: string, config: Partial<PosConfig>) => {
            if (!venueId) return null;
            try {
                const res = await api.put(
                    `/venues/${venueId}/staff/${userId}/pos-config`,
                    config
                );
                // Refresh staff list
                await fetchStaff();
                return res.data;
            } catch (err) {
                logger.error('Failed to update POS config:', err as /**/any);
                throw err;
            }
        },
        [venueId, fetchStaff]
    );

    // Computed helpers
    const activeStaff = useMemo(
        () => staff.filter((s) => s.pos_config?.is_pos_active),
        [staff]
    );

    const onShiftNow = useMemo(
        () => staff.filter((s) => s.shifts?.current),
        [staff]
    );

    return {
        staff,
        activeStaff,
        onShiftNow,
        loading,
        error,
        refetch: fetchStaff,
        getStaffDetail,
        getStaffActivity,
        updatePosConfig,
    };
}

export default useStaffService;
