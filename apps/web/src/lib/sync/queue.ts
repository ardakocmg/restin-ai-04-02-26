import { db, type SyncOperation } from '../db';

// Rule #20: Sync Queue Mgmt

export const queueSyncOperation = async (
    type: SyncOperation['type'],
    payload: any
) => {
    // 1. Optimistic / IDB Write used to happen before this called usually, 
    // or this function wraps the IDB write too. 
    // Requirement says: Stage 2 (Local) -> Stage 3 (Queue).
    // So usually caller does DB write, then calls this.

    await db.syncQueue.add({
        type,
        payload,
        timestamp: Date.now()
    });

    // Notify Worker (if running in main thread context or shared worker)
    // For MVP, we presume the worker loop picks it up via polling or BroadcastChannel
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        // navigator.serviceWorker.controller?.postMessage({ type: 'SYNC_TRIGGER' });
    }
};

export const getPendingSyncs = async (limit = 50) => {
    return db.syncQueue.orderBy('timestamp').limit(limit).toArray();
};

export const removeSyncItems = async (ids: number[]) => {
    await db.syncQueue.bulkDelete(ids);
};
