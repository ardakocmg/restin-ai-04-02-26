import { useState, useCallback } from 'react';
import { queueSyncOperation } from './queue';
import { db } from '../db';

// Rule #20: Stage 1 (UI) + Stage 2 (Local) + Stage 3 (Queue)

interface MutationOptions<T> {
    onMutate?: (data: T) => void;
    onSuccess?: () => void;
    onError?: (err: any) => void;
    type: 'CREATE_ORDER' | 'UPDATE_ORDER' | 'PAY_ORDER';
}

export function useMutationWithSync<T = any>() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    const mutate = useCallback(async (data: T, options: MutationOptions<T>) => {
        setIsLoading(true);
        setError(null);

        try {
            // Stage 1: UI Update (Optimistic)
            // Caller handles React State update via `onMutate`
            if (options.onMutate) {
                options.onMutate(data);
            }

            // Stage 2: Local DB Write
            // Ideally, specific DB logic should be passed or we handle common types
            if (options.type === 'CREATE_ORDER') {
                await db.orders.put(data as any);
            } else if (options.type === 'UPDATE_ORDER') {
                const order = data as any;
                await db.orders.update(order.id, order);
            }

            // Stage 3: Queue for Sync
            await queueSyncOperation(options.type, data);

            // Success (Local)
            if (options.onSuccess) options.onSuccess();

        } catch (err) {
            console.error("Mutation Failed locally", err);
            setError(err);
            if (options.onError) options.onError(err);
            // If Local Write fails, we should rollback UI?
            // Usually React Query handles this with context. 
            // For this custom hook, we leave it to caller.
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { mutate, isLoading, error };
}
