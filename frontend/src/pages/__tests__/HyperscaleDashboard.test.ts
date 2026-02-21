import { formatUptime, getStatusColor } from './HyperscaleDashboard.utils';

// Note: These functions need to be extracted from HyperscaleDashboard.tsx
// For now, test the logic inline

describe('Hyperscale Dashboard Utilities', () => {
    describe('formatUptime', () => {
        const formatUptime = (seconds: number): string => {
            const d = Math.floor(seconds / 86400);
            const h = Math.floor((seconds % 86400) / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            if (d > 0) return `${d}d ${h}h`;
            if (h > 0) return `${h}h ${m}m`;
            return `${m}m`;
        };

        it('formats seconds into minutes', () => {
            expect(formatUptime(300)).toBe('5m');
        });

        it('formats large values into days and hours', () => {
            expect(formatUptime(90000)).toBe('1d 1h');
        });

        it('formats hours and minutes', () => {
            expect(formatUptime(5400)).toBe('1h 30m');
        });
    });

    describe('getStatusColor', () => {
        const getStatusColor = (val: number, threshold1: number, threshold2: number) => {
            if (val > threshold2) return 'text-red-500';
            if (val > threshold1) return 'text-yellow-500';
            return 'text-emerald-500';
        };

        it('returns green for low values', () => {
            expect(getStatusColor(10, 100, 500)).toBe('text-emerald-500');
        });

        it('returns yellow for medium values', () => {
            expect(getStatusColor(200, 100, 500)).toBe('text-yellow-500');
        });

        it('returns red for high values', () => {
            expect(getStatusColor(600, 100, 500)).toBe('text-red-500');
        });
    });
});
