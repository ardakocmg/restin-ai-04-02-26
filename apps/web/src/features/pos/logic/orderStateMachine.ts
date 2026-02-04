import type { LocalOrder, LocalOrderItem } from '../../../../lib/db';

// Rule #15: Course Management State Machine

type OrderAction =
    | { type: 'ADD_ITEM', item: Omit<LocalOrderItem, 'status'> }
    | { type: 'FIRE_COURSE', course: number }
    | { type: 'PAY', method: 'CASH' | 'CARD' }
    | { type: 'VOID' };

export const orderReducer = (state: LocalOrder, action: OrderAction): LocalOrder => {
    switch (action.type) {
        case 'ADD_ITEM':
            // Logic: Check if item exists (merge) or add new
            const newItem = { ...action.item, status: 'HELD' as const };
            // Simple append for MVP
            return {
                ...state,
                items: [...state.items, newItem],
                subtotal: state.subtotal + (newItem.priceCents * newItem.quantity),
                total: state.subtotal + (newItem.priceCents * newItem.quantity), // + Tax logic later
                updatedAt: Date.now(),
                synced: false
            };

        case 'FIRE_COURSE':
            return {
                ...state,
                status: 'SENT',
                items: state.items.map(i =>
                    i.course === action.course ? { ...i, status: 'FIRED' } : i
                ),
                updatedAt: Date.now(),
                synced: false
            };

        case 'PAY':
            // Rule #17: Fiscal Guard
            // In reality: Check with Fiscal Service (hardware-bridge/business logic)
            // Mocking the cryptographic signature
            const mockSignature = `FISCAL-${state.id}-${Date.now()}-SIG`;

            return {
                ...state,
                status: 'PAID',
                fiscalSignature: mockSignature,
                synced: false
            };

        case 'VOID':
            return {
                ...state,
                status: 'VOID',
                synced: false
            };

        default:
            return state;
    }
};
