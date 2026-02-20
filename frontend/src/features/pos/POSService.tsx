import axios from 'axios';
import { Order } from '../../types';
import { initDB } from '../../lib/db';
import { toast } from 'sonner';
import { logger } from '../../lib/logger';

const API_URL = '/api/pos';

export const POSService = {
    // Submit Order (Offline First Strategy)
    submitOrder: async (order: Omit<Order, 'id'>): Promise<boolean> => {
        try {
            // 1. Try to push to API directly
            await axios.post(`${API_URL}/orders`, order);
            toast.success("Order send to Kitchen!");
            return true;
        } catch (error: any) {
            logger.warn('API Offline, queuing order locally');

            // 2. Fallback to IndexedDB queue
            const db = await initDB();
            // Ensure ID is unique for queue
            const offlineOrder = { ...order, id: `off-${Date.now()}`, status: 'PENDING' as const, is_offline: true };

            await db.put('orders_queue', offlineOrder);
            toast.warning("Order saved offline. Will sync when online.");
            return false;
        }
    },

    // Get Orders for KDS (Uses API or Local if offline?)
    // For KDS, we generally need live data, but can show cached last known state
    getOrders: async (venueId: string): Promise<Order[]> => {
        try {
            const response = await axios.get(`${API_URL}/orders?venue_id=${venueId}`);
            return response.data;
        } catch (e: any) {
            logger.error('KDS Offline');
            return [];
        }
    },

    // Sync background worker (call this periodically)
    syncQueue: async () => {
        const db = await initDB();
        const queuedOrders = await db.getAll('orders_queue');

        if (queuedOrders.length === 0) return;

        logger.info('Attempting to sync offline orders', { count: queuedOrders.length });

        for (const order of queuedOrders) {
            try {
                // Strip offline-only ID if needed or let backend handle
                const { is_offline, ...orderData } = order;
                await axios.post(`${API_URL}/orders`, orderData);

                // Remove from queue on success
                await db.delete('orders_queue', order.id);
            } catch (e: any) {
                logger.error('Sync failed for order', { orderId: order.id });
            }
        }
    }
};
