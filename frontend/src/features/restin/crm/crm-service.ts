import api from '../../../lib/api';

/**
 * 🤖 CRM Service (Pillar 3)
 * Guest data, campaigns, Boomerang protocol, and CRM analytics.
 * All endpoints backed by /api/crm/* routes.
 */
export const crmService = {
    // === SUMMARY ===
    getSummary: async (venueId: string) => {
        const response = await api.get(`/crm/summary?venue_id=${venueId}`);
        return response.data;
    },

    // === GUESTS ===
    listGuests: async (venueId: string, segment?: string, query?: string) => {
        const params = new URLSearchParams({ venue_id: venueId });
        if (segment) params.append('segment', segment);
        if (query) params.append('q', query);
        const response = await api.get(`/crm/guests?${params.toString()}`);
        return response.data;
    },

    getGuest360: async (guestId: string) => {
        const response = await api.get(`/crm/guests/${guestId}/360`);
        return response.data;
    },

    updateGuestTags: async (guestId: string, tags: string[]) => {
        const response = await api.post(`/crm/guests/${guestId}/tags`, tags);
        return response.data;
    },

    // === CAMPAIGNS ===
    listCampaigns: async (venueId: string) => {
        const response = await api.get(`/crm/campaigns?venue_id=${venueId}`);
        return response.data;
    },

    createCampaign: async (venueId: string, campaign: Record<string, unknown>) => {
        const response = await api.post(`/crm/campaigns?venue_id=${venueId}`, campaign);
        return response.data;
    },

    // === BOOMERANG PROTOCOL ===
    runBoomerang: async (venueId: string) => {
        const response = await api.post('/crm/boomerang', { venue_id: venueId });
        return response.data;
    },

    // === SEED ===
    seedData: async (venueId: string) => {
        const response = await api.post(`/crm/seed?venue_id=${venueId}`);
        return response.data;
    },
};
