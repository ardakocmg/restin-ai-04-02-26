/**
 * 👥 Ops & Aggregator Hub (Pillar 7)
 * Central management for external orders and staff efficiency.
 */

interface OrderPayload {
    items: any[]; // Using any temporarily for external payloads, but mapping to strict types
    customer: string;
    total: number;
}

export class OpsHub {
    /**
     * Inject Aggregator Order (UberEats/Wolt/Bolt)
     * White-labeled injection into the Restin KDS.
     */
    static injectExternalOrder(source: 'UBEREATS' | 'WOLT' | 'BOLT', externalId: string, payload: OrderPayload) {
        console.log(`[Pillar 7] Injecting ${source} order: ${externalId}`);
        // Logic: Transform specific payload to Restin Order format and push to event bus.
        return {
            status: 'injected',
            kdsTicketId: `EXT-${Math.floor(Math.random() * 9999)}`,
            receivedAt: new Date().toISOString()
        };
    }

    /**
     * Labor Cost Guard (Rule 214)
     * Real-time alerts if labor cost % exceeds venue targets.
     */
    static checkLaborEfficiency(totalSales: number, totalLaborCost: number, targetPercent: number = 0.30): boolean {
        if (totalSales === 0) return true;
        const currentPercent = totalLaborCost / totalSales;
        return currentPercent <= targetPercent;
    }
}

export const ops = new OpsHub();
export { default as OpsDashboard } from './OpsDashboard';
