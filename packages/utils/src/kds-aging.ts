
/**
 * kds-aging.ts - Order Aging Logic for Kitchen Display System (Rule #34)
 */

export type TicketSeverity = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface AgingConfig {
    warningThresholdSeconds: number; // e.g., 600 (10 mins)
    criticalThresholdSeconds: number; // e.g., 1200 (20 mins)
}

export const DEFAULT_AGING_CONFIG: AgingConfig = {
    warningThresholdSeconds: 15 * 60,
    criticalThresholdSeconds: 25 * 60
};

export function getTicketSeverity(createdAt: Date, config: AgingConfig = DEFAULT_AGING_CONFIG): TicketSeverity {
    const now = new Date();
    const elapsedSeconds = (now.getTime() - createdAt.getTime()) / 1000;

    if (elapsedSeconds > config.criticalThresholdSeconds) {
        return 'CRITICAL';
    } else if (elapsedSeconds > config.warningThresholdSeconds) {
        return 'WARNING';
    }

    return 'NORMAL';
}

export function getTicketColor(severity: TicketSeverity): string {
    switch (severity) {
        case 'CRITICAL': return '#EF4444'; // Red-500
        case 'WARNING': return '#F59E0B'; // Amber-500
        case 'NORMAL': return '#10B981'; // Emerald-500
        default: return '#71717A'; // Zinc-500
    }
}
