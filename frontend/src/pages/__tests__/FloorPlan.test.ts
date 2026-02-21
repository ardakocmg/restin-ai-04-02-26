import { describe, it, expect } from '@jest/globals';

describe('Floor Plan Calculations', () => {
    interface Table {
        id: string;
        name: string;
        seats: number;
        status: 'available' | 'occupied' | 'reserved';
        x: number;
        y: number;
    }

    const tables: Table[] = [
        { id: '1', name: 'T1', seats: 4, status: 'available', x: 100, y: 100 },
        { id: '2', name: 'T2', seats: 2, status: 'occupied', x: 200, y: 100 },
        { id: '3', name: 'T3', seats: 6, status: 'reserved', x: 300, y: 100 },
        { id: '4', name: 'T4', seats: 4, status: 'occupied', x: 100, y: 200 },
        { id: '5', name: 'T5', seats: 8, status: 'available', x: 200, y: 200 },
    ];

    it('calculates total capacity', () => {
        const total = tables.reduce((sum, t) => sum + t.seats, 0);
        expect(total).toBe(24);
    });

    it('counts available tables', () => {
        const available = tables.filter(t => t.status === 'available');
        expect(available).toHaveLength(2);
    });

    it('calculates occupancy rate', () => {
        const occupied = tables.filter(t => t.status === 'occupied').length;
        const rate = (occupied / tables.length) * 100;
        expect(rate).toBe(40);
    });

    it('finds available table with minimum seats', () => {
        const minSeats = 5;
        const suitable = tables.find(t => t.status === 'available' && t.seats >= minSeats);
        expect(suitable?.name).toBe('T5');
        expect(suitable?.seats).toBe(8);
    });

    it('detects table collision (overlapping positions)', () => {
        const isCollision = (a: Table, b: Table, minDist: number): boolean => {
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            return Math.sqrt(dx * dx + dy * dy) < minDist;
        };
        expect(isCollision(tables[0], tables[1], 50)).toBe(false);
        expect(isCollision(tables[0], tables[1], 150)).toBe(true);
    });
});
