import { describe, it, expect } from '@jest/globals';

describe('Menu Builder Logic', () => {
    interface MenuItem {
        id: string;
        name: string;
        price: number;
        category_id: string;
        vat_rate: number;
        is_active: boolean;
    }

    const menuItems: MenuItem[] = [
        { id: '1', name: 'Margherita', price: 1200, category_id: 'pizza', vat_rate: 18, is_active: true },
        { id: '2', name: 'Pepperoni', price: 1400, category_id: 'pizza', vat_rate: 18, is_active: true },
        { id: '3', name: 'Tiramisu', price: 800, category_id: 'dessert', vat_rate: 18, is_active: false },
        { id: '4', name: 'Coca Cola', price: 350, category_id: 'drinks', vat_rate: 18, is_active: true },
    ];

    it('filters active items only', () => {
        const active = menuItems.filter(i => i.is_active);
        expect(active).toHaveLength(3);
    });

    it('groups by category', () => {
        const groups = menuItems.reduce((acc, item) => {
            if (!acc[item.category_id]) acc[item.category_id] = [];
            acc[item.category_id].push(item);
            return acc;
        }, {} as Record<string, MenuItem[]>);
        expect(Object.keys(groups)).toHaveLength(3);
        expect(groups['pizza']).toHaveLength(2);
    });

    it('calculates gross from net price', () => {
        const net = 1000; // cents
        const vatRate = 18;
        const gross = Math.round(net * (1 + vatRate / 100));
        expect(gross).toBe(1180);
    });

    it('calculates net from gross price', () => {
        const gross = 1180;
        const vatRate = 18;
        const net = Math.round(gross / (1 + vatRate / 100));
        expect(net).toBe(1000);
    });

    it('sorts items by price descending', () => {
        const sorted = [...menuItems].sort((a, b) => b.price - a.price);
        expect(sorted[0].name).toBe('Pepperoni');
        expect(sorted[sorted.length - 1].name).toBe('Coca Cola');
    });

    it('searches items by name (case insensitive)', () => {
        const query = 'mar';
        const results = menuItems.filter(i =>
            i.name.toLowerCase().includes(query.toLowerCase())
        );
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Margherita');
    });
});
