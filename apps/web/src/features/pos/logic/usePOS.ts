import { useReducer, useEffect, useCallback } from 'react';
import { orderReducer } from './orderStateMachine';
import { db, type LocalOrder } from '../../../lib/db';
import { queueRequest } from '../../pos-terminal/services/OfflineService'; // Re-use offline logic

const INITIAL_STATE: LocalOrder = {
    id: crypto.randomUUID(),
    status: 'OPEN',
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    synced: false
};

export const usePOS = () => {
    const [state, dispatch] = useReducer(orderReducer, INITIAL_STATE);

    // Auto-Save to IndexedDB on Change
    useEffect(() => {
        if (state.items.length > 0) {
            db.orders.put(state).catch(e => console.error("IDB Save Failed", e));
        }
    }, [state]);

    // Actions Wrapper
    const pay = useCallback(async (method: 'CASH' | 'CARD') => {
        dispatch({ type: 'PAY', method });

        // Trigger Sync
        await queueRequest('/api/pos/orders', 'POST', { ...state, status: 'PAID', paidAt: Date.now() });

        // Reset or New Order?
        // Typically navigate to "Success" screen or Reset
        // setTimeout(() => window.location.reload(), 500); // Simple Reset for now
    }, [state]);

    const addItem = useCallback((item: any) => {
        dispatch({ type: 'ADD_ITEM', item });
    }, []);

    return { state, dispatch, pay, addItem };
};
