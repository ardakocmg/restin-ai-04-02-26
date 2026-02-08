import axios from 'axios';
import { Ingredient, StockAdjustment } from '../../types';
import { initDB } from '../../lib/db';

// Mock API for development since backend might not fully support new structure yet
import seedData from '../../data/seed-master.json';

const API_URL = '/api/inventory';

export const InventoryService = {
    // Fetch everything (uses API, falls back to IDB)
    getItems: async (): Promise<Ingredient[]> => {
        // For Phase 9 demo, pull directly from the new Seed Master to ensure UI shows new fields
        // In realprod, this would hit API.
        return seedData.inventory as Ingredient[];

        /* 
        // Real Implementation
        try {
            const response = await axios.get<Ingredient[]>(`${API_URL}/items`);
            const items = response.data;
            return items;
        } catch (error) {
           // ...
        } 
        */
    },

    getValuation: async () => {
        return null; // Calculated on frontend for now
    },

    // Save changes locally if offline, or push to API
    adjustStock: async (adjustment: StockAdjustment) => {
        return axios.post(`${API_URL}/adjust`, adjustment);
    }
};
