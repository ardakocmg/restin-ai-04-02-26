import api from '../../../lib/api';

/**
 * 🎨 Studio Service (Pillar 5)
 * Manages Media Assets, AI Content Generation, and Brand Identity.
 * Connected to /api/studio/* backend routes.
 */
export const studioService = {
    /**
     * List Assets
     */
    listAssets: async (venueId: string) => {
        try {
            const res = await api.get(`/studio/assets?venue_id=${venueId}`);
            return Array.isArray(res.data) ? res.data : (res.data?.assets || []);
        } catch {
            return [];
        }
    },

    /**
     * Generate Content (Reality-First Pipeline)
     * 1. Checks existing product images (zero cost)
     * 2. Checks media library (zero cost)
     * 3. Last resort: AI generation (billable)
     */
    generateAsset: async (venueId: string, prompt: string, type: 'IMAGE' | 'VIDEO' | 'caption' | 'description' | 'social_post' = 'IMAGE') => {
        const res = await api.post(`/studio/generate?venue_id=${venueId}`, { prompt, type });
        return res.data;
    },

    /**
     * List previous generations
     */
    listGenerations: async (venueId: string) => {
        try {
            const res = await api.get(`/studio/generations?venue_id=${venueId}`);
            return Array.isArray(res.data) ? res.data : [];
        } catch {
            return [];
        }
    },

    /**
     * Get Brand Identity
     */
    getBrand: async (venueId: string) => {
        try {
            const res = await api.get(`/studio/brand?venue_id=${venueId}`);
            return res.data;
        } catch {
            return null;
        }
    },

    /**
     * Update Brand Identity
     */
    updateBrand: async (venueId: string, brand: Record<string, unknown>) => {
        const res = await api.post(`/studio/brand?venue_id=${venueId}`, brand);
        return res.data;
    },

    /**
     * Get Studio Stats
     */
    getStats: async (venueId: string) => {
        try {
            const res = await api.get(`/studio/stats?venue_id=${venueId}`);
            return res.data;
        } catch {
            return { total_generations: 0, total_assets: 0, ai_generated: 0, local_generated: 0 };
        }
    },

    /**
     * Upload Asset (Metadata)
     */
    uploadAsset: async (venueId: string, asset: Record<string, unknown>) => {
        const res = await api.post(`/studio/assets?venue_id=${venueId}`, asset);
        return res.data;
    }
};
