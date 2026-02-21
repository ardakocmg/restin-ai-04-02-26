import { describe, it, expect } from '@jest/globals';

describe('Inventory Calculations', () => {
    interface InventoryItem {
        id: string;
        name: string;
        quantity: number;
        min_stock: number;
        unit_cost: number;
        unit: string;
    }

    const items: InventoryItem[] = [
        { id: '1', name: 'Tomatoes', quantity: 50, min_stock: 20, unit_cost: 2.5, unit: 'kg' },
        { id: '2', name: 'Olive Oil', quantity: 5, min_stock: 10, unit_cost: 12.0, unit: 'L' },
        { id: '3', name: 'Mozzarella', quantity: -3, min_stock: 5, unit_cost: 8.0, unit: 'kg' },
        { id: '4', name: 'Flour', quantity: 100, min_stock: 25, unit_cost: 1.2, unit: 'kg' },
    ];

    it('identifies low stock items', () => {
        const lowStock = items.filter(i => i.quantity > 0 && i.quantity <= i.min_stock);
        expect(lowStock).toHaveLength(1);
        expect(lowStock[0].name).toBe('Olive Oil');
    });

    it('identifies negative stock (critical)', () => {
        const negative = items.filter(i => i.quantity < 0);
        expect(negative).toHaveLength(1);
        expect(negative[0].name).toBe('Mozzarella');
    });

    it('calculates total inventory value', () => {
        const value = items.reduce((sum, i) => sum + Math.max(0, i.quantity) * i.unit_cost, 0);
        // 50*2.5 + 5*12 + 0 + 100*1.2 = 125 + 60 + 0 + 120 = 305
        expect(value).toBe(305);
    });

    it('generates reorder list', () => {
        const reorderList = items
            .filter(i => i.quantity <= i.min_stock)
            .map(i => ({ name: i.name, needed: i.min_stock - i.quantity }));
        expect(reorderList).toHaveLength(2); // Olive Oil + Mozzarella
        expect(reorderList[0]).toEqual({ name: 'Olive Oil', needed: 5 });
        expect(reorderList[1]).toEqual({ name: 'Mozzarella', needed: 8 });
    });

    it('calculates COGS for recipe consumption', () => {
        const recipe = [
            { item_id: '1', usage_qty: 0.5 }, // 0.5 kg tomatoes
            { item_id: '2', usage_qty: 0.05 }, // 50ml olive oil
            { item_id: '3', usage_qty: 0.2 },  // 200g mozzarella
        ];
        const itemMap = new Map(items.map(i => [i.id, i]));
        const cogs = recipe.reduce((sum, r) => {
            const item = itemMap.get(r.item_id);
            return sum + (item ? r.usage_qty * item.unit_cost : 0);
        }, 0);
        // 0.5*2.5 + 0.05*12 + 0.2*8 = 1.25 + 0.6 + 1.6 = 3.45
        expect(cogs).toBeCloseTo(3.45, 2);
    });
});
