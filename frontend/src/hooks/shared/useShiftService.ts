/**
 * Unified Shift Service Hook
 * 
 * Shared data layer for POS + HR shift scheduling.
 * Provides weekly grid view, CRUD, and check-in/out.
 */
import { useCallback,useEffect,useState } from 'react';
import api from '../../lib/api';
import { logger } from '../../lib/logger';

export interface ShiftEntry {
    id: string;
    venue_id: string;
    user_id: string;
    user_name?: string;
    user_role?: string;
    start_time: string;
    end_time: string;
    role?: string;
    status?: string;
    source?: string;
    checked_in?: boolean;
    checked_in_at?: string;
    checked_out?: boolean;
    checked_out_at?: string;
}

export interface WeeklyGrid {
    week_start: string;
    week_end: string;
    shifts: ShiftEntry[];
    staff: { id: string; name: string; role: string }[];
}

interface UseShiftServiceOptions {
    venueId: string;
    weekOffset?: number;
    userId?: string;
    date?: string;
    enabled?: boolean;
}

export function useShiftService(options: UseShiftServiceOptions) {
    const { venueId, weekOffset = 0, userId, date, enabled = true } = options;

    const [shifts, setShifts] = useState<ShiftEntry[]>([]);
    const [weeklyGrid, setWeeklyGrid] = useState<WeeklyGrid | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch shifts list
    const fetchShifts = useCallback(async () => {
        if (!venueId || !enabled) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (userId) params.append('user_id', userId);
            if (date) params.append('date', date);
            const res = await api.get(`/venues/${venueId}/shifts?${params.toString()}`);
            setShifts(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            logger.error('Failed to fetch shifts:', err as /**/any);
            setError('Failed to load shifts');
            setShifts([]);
        } finally {
            setLoading(false);
        }
    }, [venueId, userId, date, enabled]);

    // Fetch weekly grid (staff × day matrix)
    const fetchWeeklyGrid = useCallback(async () => {
        if (!venueId || !enabled) return;
        setLoading(true);
        try {
            const res = await api.get(
                `/venues/${venueId}/shifts/weekly?week_offset=${weekOffset}`
            );
            setWeeklyGrid(res.data);
        } catch (err) {
            logger.error('Failed to fetch weekly grid:', err as /**/any);
            setWeeklyGrid(null);
        } finally {
            setLoading(false);
        }
    }, [venueId, weekOffset, enabled]);

    useEffect(() => {
        fetchShifts();
    }, [fetchShifts]);

    // CRUD
    const createShift = useCallback(
        async (shiftData: Partial<ShiftEntry>) => {
            if (!venueId) return null;
            try {
                const res = await api.post(`/venues/${venueId}/shifts`, {
                    ...shiftData,
                    venue_id: venueId,
                    source: shiftData.source || 'pos',
                });
                await fetchShifts();
                return res.data;
            } catch (err) {
                logger.error('Failed to create shift:', err as /**/any);
                throw err;
            }
        },
        [venueId, fetchShifts]
    );

    const checkIn = useCallback(
        async (shiftId: string) => {
            if (!venueId) return;
            try {
                await api.post(`/venues/${venueId}/shifts/${shiftId}/check-in`);
                await fetchShifts();
            } catch (err) {
                logger.error('Failed to check in:', err as /**/any);
                throw err;
            }
        },
        [venueId, fetchShifts]
    );

    const checkOut = useCallback(
        async (shiftId: string) => {
            if (!venueId) return;
            try {
                await api.post(`/venues/${venueId}/shifts/${shiftId}/check-out`);
                await fetchShifts();
            } catch (err) {
                logger.error('Failed to check out:', err as /**/any);
                throw err;
            }
        },
        [venueId, fetchShifts]
    );

    const getActiveShifts = useCallback(async () => {
        if (!venueId) return [];
        try {
            const res = await api.get(`/venues/${venueId}/shifts/active`);
            return res.data || [];
        } catch (err) {
            logger.error('Failed to fetch active shifts:', err as /**/any);
            return [];
        }
    }, [venueId]);

    return {
        shifts,
        weeklyGrid,
        loading,
        error,
        refetch: fetchShifts,
        fetchWeeklyGrid,
        createShift,
        checkIn,
        checkOut,
        getActiveShifts,
    };
}

export default useShiftService;
