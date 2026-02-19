import api from '../../../lib/api';

/**
 * 💳 Fintech Service (Pillar 8)
 * Handles Payments, Split Bills, and Kiosk Mode.
 */
export const fintechService = {
    /**
     * Toggle Kiosk Mode
     */
    toggleKiosk: async (venueId: string, enabled: boolean) => {
        return api.post(`/fintech/kiosk/config?venue_id=${venueId}`, { enabled });
    },

    /**
     * Get Kiosk Config
     */
    getKioskConfig: async (venueId: string) => {
        const res = await api.get(`/fintech/kiosk/config?venue_id=${venueId}`);
        return res.data;
    },

    /**
     * Split Order
     */
    splitOrder: async (venueId: string, orderId: string, totalCents: number, splitCount: number) => {
        return api.post(`/fintech/split?venue_id=${venueId}`, {
            order_id: orderId,
            method: 'equal',
            split_count: splitCount,
            total_cents: totalCents,
        });
    },

    /**
     * Process Payment
     */
    processPayment: async (amountCents: number, method: 'CARD' | 'CASH' | 'QR') => {
        return api.post(`/pay/transaction`, { amountCents, method });
    },
};
