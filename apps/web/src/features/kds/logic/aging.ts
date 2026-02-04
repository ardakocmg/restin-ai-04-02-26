import { differenceInMinutes } from 'date-fns';

// Rule #15: Aging Logic (Panic Mode)

export type TicketSeverity = 'FRESH' | 'WARNING' | 'CRITICAL';

export interface AgingStatus {
    severity: TicketSeverity;
    colorClass: string;
    elapsedMinutes: number;
    isFlashing: boolean;
}

export const calculateTicketAging = (createdAt: number): AgingStatus => {
    const elapsed = differenceInMinutes(Date.now(), createdAt);

    if (elapsed < 10) {
        return {
            severity: 'FRESH',
            colorClass: 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]',
            elapsedMinutes: elapsed,
            isFlashing: false
        };
    } else if (elapsed < 20) {
        return {
            severity: 'WARNING',
            colorClass: 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]',
            elapsedMinutes: elapsed,
            isFlashing: false
        };
    } else {
        return {
            severity: 'CRITICAL',
            colorClass: 'border-red-600 bg-red-950/30 shadow-[0_0_30px_rgba(220,38,38,0.6)]',
            elapsedMinutes: elapsed,
            isFlashing: true
        };
    }
};
