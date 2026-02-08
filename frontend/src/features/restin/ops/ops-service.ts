import api from '../../../lib/api';

/**
 * 🚚 Aggregator Service (Pillar 7)
 * Manages Delivery Integrations (Wolt, Uber, Bolt).
 */
export const aggregatorService = {
    /**
     * Get Aggregator Status (Online/Offline)
     */
    /**
     * Get Aggregator Status (Online/Offline)
     */
    getStatus: async (venueId: string) => {
        const response = await api.get(`/aggregators/status?venue_id=${venueId}`);
        return response.data;
    },
};

/**
 * ⚙️ Ops Service (Pillar 7)
 * Manages Labor Cost & Operational Metrics.
 */
export const opsService = {
    /**
     * Get Ops KPIs
     */
    getMetrics: async (venueId: string) => {
        const response = await api.get(`/ops/metrics?venue_id=${venueId}`);
        return response.data;
    },

    /**
     * Get Live Logs
     */
    getLogs: async (venueId: string) => {
        const response = await api.get(`/ops/logs?venue_id=${venueId}`);
        return response.data;
    }
};
