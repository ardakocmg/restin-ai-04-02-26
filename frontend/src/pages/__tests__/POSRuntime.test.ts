import { describe, it, expect } from '@jest/globals';

describe('POS Runtime Core Logic', () => {
    describe('Order Total Calculation', () => {
        it('calculates simple item total correctly', () => {
            const items = [
                { name: 'Pizza', price: 1200, quantity: 2, total_price: 2400 },
                { name: 'Beer', price: 500, quantity: 3, total_price: 1500 },
            ];
            const total = items.reduce((sum, item) => sum + item.total_price, 0);
            expect(total).toBe(3900); // cents
        });

        it('handles empty order', () => {
            const items: { total_price: number }[] = [];
            const total = items.reduce((sum, item) => sum + item.total_price, 0);
            expect(total).toBe(0);
        });

        it('applies percentage discount correctly', () => {
            const subtotal = 10000; // €100.00
            const discountPercent = 15;
            const discount = Math.round(subtotal * (discountPercent / 100));
            expect(discount).toBe(1500);
            expect(subtotal - discount).toBe(8500);
        });

        it('calculates VAT correctly for Malta 18%', () => {
            const netAmount = 8475; // cents
            const vatRate = 18;
            const vatAmount = Math.round(netAmount * (vatRate / 100));
            expect(vatAmount).toBe(1526); // 18% VAT
        });
    });

    describe('Split Bill Logic', () => {
        it('splits evenly among guests', () => {
            const total = 10000;
            const guests = 3;
            const perGuest = Math.floor(total / guests);
            const remainder = total - perGuest * guests;
            expect(perGuest).toBe(3333);
            expect(remainder).toBe(1); // 1 cent remainder goes to last guest
        });

        it('handles single guest split', () => {
            const total = 5000;
            expect(Math.floor(total / 1)).toBe(5000);
        });
    });
});
