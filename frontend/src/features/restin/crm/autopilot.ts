import { AiServiceFactory } from '../../../lib/ai/google';
import { BillingBroker } from '../../billing/broker';
import { logger } from '../../../lib/logger';

/**
 * 🤖 Autopilot CRM Engine (Pillar 3)
 * Goal: Autonomous Retention via "The Boomerang" Protocol.
 */

interface GuestProfile {
    id: string;
    name: string;
    lastVisitDays: number;
    ltvCents: number;
    tasteTags: string[];
}

export class CrmAutopilot {
    /**
     * The Boomerang Protocol (Rule 170)
     * Detects high-risk churn clients and prepares personalized re-engagement.
     */
    async runBoomerang(guests: GuestProfile[]) {
        const highRisk = guests.filter(g => g.lastVisitDays > 30 && g.ltvCents > 5000); // LTV > €50

        logger.info('[Pillar 3] Boomerang detected high-risk guests', { count: highRisk.length });

        const actions = await Promise.all(highRisk.map(async guest => {
            const prompt = `
        Draft a personalized SMS for a restaurant guest named "${guest.name}" who hasn't visited in ${guest.lastVisitDays} days.
        Their favorite items/tastes include: ${guest.tasteTags.join(', ')}.
        Keep it warm, short (under 160 chars), and mention a special treat for them.
      `;

            const message = await AiServiceFactory.promptWithGrounding(prompt, 'GEMINI_FLASH');

            // Track AI Usage (Pillar 0)
            // Hypothetical: Each re-engagement costs 1 AI unit
            const billableAmount = BillingBroker.calculateTenantPrice(0.01); // 1 cent cost + markup

            return {
                guestId: guest.id,
                personalizedMsg: message,
                cost: billableAmount
            };
        }));

        return actions;
    }
}

export const crmAutopilot = new CrmAutopilot();
