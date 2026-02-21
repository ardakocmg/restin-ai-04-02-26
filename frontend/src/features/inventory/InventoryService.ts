import api from '../../lib/api';
import { initDB } from '../../lib/db';
import logger from '../../lib/logger';
import { Ingredient,StockAdjustment } from '../../types';

const API_URL = '/inventory';

export const InventoryService = {
    // Fetch everything from real API, fall back to IndexedDB
    getItems: async (): Promise<Ingredient[]> => {
        try {
            const venueId = localStorage.getItem('activeVenueId') || 'venue-caviar-bull';
            const response = await api.get<Ingredient[]>(`${API_URL}/items`, {
                params: { venue_id: venueId }
            });
            const items = response.data;

            // Cache in IndexedDB for offline use
            try {
                const db = await initDB();
                if (db && items.length > 0) {
                    const tx = db.transaction('inventory_items', 'readwrite');
                    for (const item of items) {
                        tx.store.put(item);
                    }
                    await tx.done;
                }
            } catch {
                // IndexedDB cache failure is non-critical
            }

            return items;
        } catch (error) {
            logger.error('Failed to fetch inventory from API, trying IndexedDB', error as /**/any);
            // Fallback to IndexedDB cache
            try {
                const db = await initDB();
                if (db) {
                    const cached = await db.getAll('inventory_items');
                    if (cached.length > 0) return cached as Ingredient[];
                }
            } catch {
                // IndexedDB also failed
            }
            return [];
        }
    },

    getValuation: async () => {
        return null; // Calculated on frontend for now
    },

    // Save changes locally if offline, or push to API
    adjustStock: async (adjustment: StockAdjustment) => {
        return api.post(`${API_URL}/adjust`, adjustment);
    }
};
