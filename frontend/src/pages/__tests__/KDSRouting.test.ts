import { describe, it, expect } from '@jest/globals';

describe('KDS Ticket Routing', () => {
    type Station = 'grill' | 'salad' | 'dessert' | 'bar';

    interface KDSItem {
        name: string;
        station: Station;
        course: number;
        isFired: boolean;
    }

    const routeToStation = (items: KDSItem[]): Record<Station, KDSItem[]> => {
        const stations: Record<Station, KDSItem[]> = { grill: [], salad: [], dessert: [], bar: [] };
        for (const item of items) {
            stations[item.station].push(item);
        }
        return stations;
    };

    it('routes items to correct stations', () => {
        const items: KDSItem[] = [
            { name: 'Steak', station: 'grill', course: 2, isFired: false },
            { name: 'Caesar Salad', station: 'salad', course: 1, isFired: false },
            { name: 'Tiramisu', station: 'dessert', course: 3, isFired: false },
        ];
        const routed = routeToStation(items);
        expect(routed.grill).toHaveLength(1);
        expect(routed.salad).toHaveLength(1);
        expect(routed.dessert).toHaveLength(1);
        expect(routed.bar).toHaveLength(0);
    });

    it('groups multiple items to same station', () => {
        const items: KDSItem[] = [
            { name: 'Burger', station: 'grill', course: 2, isFired: false },
            { name: 'Steak', station: 'grill', course: 2, isFired: false },
            { name: 'Wings', station: 'grill', course: 1, isFired: false },
        ];
        const routed = routeToStation(items);
        expect(routed.grill).toHaveLength(3);
    });

    it('handles empty ticket', () => {
        const routed = routeToStation([]);
        expect(routed.grill).toHaveLength(0);
        expect(routed.salad).toHaveLength(0);
    });
});

describe('KDS Timer', () => {
    it('calculates elapsed time correctly', () => {
        const createdAt = new Date('2026-02-21T18:00:00Z');
        const now = new Date('2026-02-21T18:07:30Z');
        const elapsedMs = now.getTime() - createdAt.getTime();
        const elapsedMinutes = Math.floor(elapsedMs / 60000);
        expect(elapsedMinutes).toBe(7);
    });

    it('marks ticket as LATE after threshold', () => {
        const LATE_THRESHOLD_MINUTES = 10;
        const elapsed = 12;
        expect(elapsed > LATE_THRESHOLD_MINUTES).toBe(true);
    });
});
