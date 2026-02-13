import api from '../../../lib/api';

/**
 * 🎨 Studio Service (Pillar 5)
 * Manages Media Assets and AI Generation.
 */
export const studioService = {
    /**
     * List Assets
     */
    listAssets: async (venueId: string) => {
        const res = await api.get(`/media/assets?venue_id=${venueId}`);
        return Array.isArray(res.data) ? res.data : (res.data?.assets || []);
    },

    /**
     * Generate Asset (Imagen 3)
     */
    generateAsset: async (venueId: string, prompt: string, type: 'IMAGE' | 'VIDEO' = 'IMAGE') => {
        return api.post(`/media/generate?venue_id=${venueId}`, { prompt, type });
    },

    /**
     * Upload Asset (Metadata)
     */
    uploadAsset: async (venueId: string, asset: any) => {
        return api.post(`/media/upload?venue_id=${venueId}`, asset);
    }
};
