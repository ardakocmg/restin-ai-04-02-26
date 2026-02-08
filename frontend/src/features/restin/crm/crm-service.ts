import api from '../../../lib/api';

/**
 * 🤖 CRM Service (Pillar 3)
 * Handles guest data fetching and campaign connectivity.
 */
export const crmService = {
    /**
     * Fetch CRM Summary Metrics
     */
    /**
     * Fetch CRM Summary Metrics
     */
    getSummary: async (venueId: string) => {
        const response = await api.get(`/crm/summary?venue_id=${venueId}`);
        return response.data;
    },

    /**
     * List Guests with optional filtering
     */
    listGuests: async (venueId: string, segment?: string, query?: string) => {
        const params = new URLSearchParams({ venue_id: venueId });
        if (segment) params.append('segment', segment);
        if (query) params.append('q', query);

        const response = await api.get(`/crm/guests?${params.toString()}`);
        return response.data;
    },

    /**
     * Get 360 view of a guest
     */
    getGuest360: async (guestId: string) => {
        const response = await api.get(`/crm/guests/${guestId}/360`);
        return response.data;
    },

    /**
     * Update guest taste tags manually
     */
    updateGuestTags: async (guestId: string, tags: string[]) => {
        const response = await api.post(`/crm/guests/${guestId}/tags`, tags);
        return response.data;
    }
};
