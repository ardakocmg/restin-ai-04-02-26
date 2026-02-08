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
        return api.post(`/venues/${venueId}/finance/kiosk/toggle`, { enabled });
    },

    /**
     * Split Order
     */
    splitOrder: async (venueId: string, orderId: string, splitType: 'EQUAL' | 'ITEM') => {
        return api.post(`/venues/${venueId}/finance/orders/${orderId}/split`, { splitType });
    },

    /**
     * Process Payment
     */
    processPayment: async (amountCents: number, method: 'CARD' | 'CASH' | 'QR') => {
        return api.post(`/pay/transaction`, { amountCents, method });
    }
};
