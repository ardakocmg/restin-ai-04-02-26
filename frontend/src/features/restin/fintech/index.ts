/**
 * 💳 Fintech & Omni-Payment (Pillar 8)
 * Handles seamless transactions and kiosk self-service.
 * Rule 4: All monetary values MUST be Integers (Cents).
 */

import { logger } from '../../../lib/logger';

export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_QR' | 'KIOSK';

export interface PaymentResponse {
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    transactionId: string;
    timestamp: string;
}

interface KioskConfig {
    isKioskMode: boolean;
    welcomeMessage?: string;
    [key: string]: unknown;
}

export class FintechEngine {
    /**
     * Process Omni-Payment
     * Handles Cash, Card, and Digital Wallets.
     */
    static async processPayment(orderId: string, amountCents: number, method: PaymentMethod): Promise<PaymentResponse> {
        logger.info('[Pillar 8] Processing payment', { method, orderId, amountCents });

        // Mocking payment gateway delay (Rule 28: handle latency)
        await new Promise(resolve => setTimeout(resolve, 800));

        return {
            status: 'COMPLETED',
            transactionId: `TX-${Math.random().toString(36).substring(7).toUpperCase()}`,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Toggle Kiosk Mode (Rule 223)
     * Switches POS UI to Self-Service mode.
     */
    static toggleKioskMode(currentConfig: KioskConfig): KioskConfig {
        return {
            ...currentConfig,
            isKioskMode: !currentConfig.isKioskMode,
            welcomeMessage: "Welcome to Restin! Please select your items below."
        };
    }

    /**
     * Advanced Bill Split (Rule 224)
     * Splits total amount into N equal parts.
     */
    static splitEqual(amountCents: number, ways: number): number[] {
        const part = Math.floor(amountCents / ways);
        const remainder = amountCents % ways;

        const shares = new Array(ways).fill(part);
        shares[0] += remainder; // Add remainder to first share

        return shares;
    }
}

export const fintech = new FintechEngine();
export { default as FintechDashboard } from './FintechDashboard';
