/**
 * useNotifications - Production hook for real-time notification badge counts.
 * Fetches from GET /api/notifications/badge-counts and polls every 30s.
 */
import { useAuth } from '@/features/auth/AuthContext';
import api from '@/lib/api';
import { useCallback,useEffect,useRef,useState } from 'react';

interface BadgeCounts {
    /** Per-domain badge counts (e.g., pos: 2, hr: 5) */
    badges: Record<string, number>;
    /** Per-page badge counts (e.g., /manager/hr/approvals: 3) */
    items: Record<string, number>;
    /** Total unread/pending count across all domains */
    total: number;
}

const EMPTY: BadgeCounts = { badges: {}, items: {}, total: 0 };
const POLL_INTERVAL = 30_000; // 30 seconds

export function useNotifications() {
    const { user } = useAuth();
    const [data, setData] = useState<BadgeCounts>(EMPTY);
    const [loading, setLoading] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchBadges = useCallback(async () => {
        if (!user?.venueId) return;
        try {
            setLoading(true);
            const res = await api.get(`notifications/badge-counts?venue_id=${user.venueId}`);
            if (res.data?.ok) {
                setData({
                    badges: res.data.badges ?? {},
                    items: res.data.items ?? {},
                    total: res.data.total ?? 0,
                });
            }
        } catch {
            // Silently fail — badges will show 0
        } finally {
            setLoading(false);
        }
    }, [user?.venueId]);

    // Initial fetch + polling
    useEffect(() => {
        fetchBadges();

        intervalRef.current = setInterval(fetchBadges, POLL_INTERVAL);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchBadges]);

    return {
        /** Per-domain badge counts for sidebar domains */
        domainBadges: data.badges,
        /** Per-page badge counts for individual menu items */
        itemBadges: data.items,
        /** Total count for header bell icon */
        totalCount: data.total,
        /** Whether a fetch is in progress */
        loading,
        /** Manually trigger a refresh */
        refresh: fetchBadges,
    };
}
