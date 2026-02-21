import api from '../../../lib/api';

/**
 * 🔬 Radar Service (Pillar 6)
 * Handles Competitive Intelligence & Yield Management.
 */
export const radarService = {
    /**
     * List Competitors
     */
    getCompetitors: async (venueId: string) => {
        try {
            const res = await api.get(`/radar/competitors?venue_id=${venueId}`);
            return Array.isArray(res.data) ? res.data : [];
        } catch {
            return [];
        }
    },

    /**
     * Get Yield Insights
     */
    getInsights: async (venueId: string) => {
        try {
            const res = await api.get(`/radar/insights?venue_id=${venueId}`);
            return res.data || null;
        } catch {
            return null;
        }
    },

    /**
     * Trigger Scan
     */
    scanMarket: async (venueId: string, city: string, cuisine: string) => {
        return api.post(`/radar/scan?venue_id=${venueId}`, { city, cuisine });
    },

    /**
     * Allergen Guard — scan menu for allergens
     */
    getAllergens: async (venueId: string) => {
        try {
            const res = await api.get(`/radar/allergens?venue_id=${venueId}`);
            return res.data || { total_scanned: 0, flagged_count: 0, items: [] };
        } catch {
            return { total_scanned: 0, flagged_count: 0, items: [] };
        }
    },

    /**
     * Yield Rules — list dynamic pricing rules
     */
    getYieldRules: async (venueId: string) => {
        try {
            const res = await api.get(`/radar/yield-rules?venue_id=${venueId}`);
            return Array.isArray(res.data) ? res.data : [];
        } catch {
            return [];
        }
    },

    /**
     * Yield Rules — create/update a rule
     */
    upsertYieldRule: async (venueId: string, rule: /**/any) => {
        return api.post(`/radar/yield-rules?venue_id=${venueId}`, rule);
    },
};
