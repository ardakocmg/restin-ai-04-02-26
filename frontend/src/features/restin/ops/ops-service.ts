import api from '../../../lib/api';

/**
 * 🚚 Aggregator Service (Pillar 7)
 * Manages Delivery Integrations (Wolt, Uber, Bolt).
 */
export const aggregatorService = {
    /**
     * Get Aggregator Config (Online/Offline, prep time, auto-accept)
     */
    getStatus: async (venueId: string) => {
        try {
            const response = await api.get(`/ops/aggregator/config?venue_id=${venueId}`);
            return Array.isArray(response.data) ? response.data : [];
        } catch {
            return [];
        }
    },

    /**
     * Update Aggregator Config
     */
    updateConfig: async (venueId: string, config: /**/any) => {
        return api.post(`/ops/aggregator/config?venue_id=${venueId}`, config);
    },

    /**
     * Inject External Order into KDS
     */
    injectOrder: async (venueId: string, platform: string, items: Array</**/any>) => {
        return api.post(`/ops/aggregator/inject?venue_id=${venueId}`, { platform, items });
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
    },

    /**
     * Get Labor Cost Alerts
     */
    getLaborAlerts: async (venueId: string) => {
        try {
            const response = await api.get(`/ops/labor-alerts?venue_id=${venueId}`);
            return response.data;
        } catch {
            return { labor_percentage: 0, alerts: [], threshold: 30 };
        }
    },
};
