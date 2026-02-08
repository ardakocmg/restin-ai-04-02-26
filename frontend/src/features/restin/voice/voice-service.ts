import api from '../../../lib/api';

/**
 * 📞 Voice Service (Pillar 4)
 * Manages Voice AI configuration and call logs.
 */
export const voiceService = {
    /**
     * Get Voice Configuration (Persona, Knowledge Base)
     */
    getConfig: async (venueId: string) => {
        return api.get(`/voice/config?venue_id=${venueId}`);
    },

    /**
     * Update settings
     */
    updateConfig: async (venueId: string, config: any) => {
        return api.post(`/voice/config?venue_id=${venueId}`, config);
    },

    /**
     * Fetch Call History
     */
    getLogs: async (venueId: string) => {
        return api.get(`/voice/logs?venue_id=${venueId}`);
    },

    /**
     * Simulate a call (Dev Mode)
     * Fetches RAG context for the AI Agent.
     */
    simulateCall: async (venueId: string, transcript: string) => {
        return api.post(`/voice/call/simulate?venue_id=${venueId}`, { transcript });
    }
};
