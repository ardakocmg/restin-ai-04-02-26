import api from '../../../lib/api';

/**
 * 📞 Voice Service (Pillar 4)
 * Manages Voice AI configuration, call logs, knowledge base, and simulation.
 * All endpoints backed by /api/voice/* routes.
 */
export const voiceService = {
    // === CONFIG ===
    getConfig: async (venueId: string) => {
        const { data } = await api.get(`/voice/config?venue_id=${venueId}`);
        return data;
    },

    updateConfig: async (venueId: string, config: Record<string, unknown>) => {
        const { data } = await api.post(`/voice/config?venue_id=${venueId}`, config);
        return data;
    },

    // === CALL LOGS ===
    getLogs: async (venueId: string, limit = 50) => {
        const { data } = await api.get(`/voice/logs?venue_id=${venueId}&limit=${limit}`);
        return data;
    },

    // === SIMULATION ===
    simulateCall: async (venueId: string, transcript: string) => {
        const { data } = await api.post(`/voice/call/simulate?venue_id=${venueId}`, { transcript });
        return data;
    },

    // === KNOWLEDGE BASE ===
    getKnowledge: async (venueId: string) => {
        const { data } = await api.get(`/voice/knowledge?venue_id=${venueId}`);
        return data;
    },

    uploadKnowledge: async (venueId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post(`/voice/knowledge/upload?venue_id=${venueId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data;
    },

    deleteKnowledge: async (docId: string) => {
        const { data } = await api.delete(`/voice/knowledge/${docId}`);
        return data;
    },

    // === ANALYTICS ===
    getStats: async (venueId: string) => {
        const { data } = await api.get(`/voice/stats?venue_id=${venueId}`);
        return data;
    },

    // === SEED DATA ===
    seedData: async (venueId: string) => {
        const { data } = await api.post(`/voice/seed?venue_id=${venueId}`);
        return data;
    },
};
