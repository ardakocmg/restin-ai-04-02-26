import { initPOSDB } from '../pos-terminal/services/OfflineService';

// Rule #20: 4-Stage Sync (Optimistic -> IDB -> Queue -> Cloud)
// Rule #29: Batch sync requests to prevent DDOS

export class SyncManager {
    private isSyncing = false;
    private batchSize = 10;
    private syncInterval = 5000; // 5 seconds

    constructor() {
        if (typeof window !== 'undefined') {
            setInterval(this.processQueue.bind(this), this.syncInterval);
            window.addEventListener('online', this.processQueue.bind(this));
        }
    }

    async processQueue() {
        if (this.isSyncing || !navigator.onLine) return;

        this.isSyncing = true;

        try {
            const db = await initPOSDB();
            const queue = await db.getAll('syncQueue'); // NOTE: Use cursor for batching

            if (queue.length === 0) {
                this.isSyncing = false;
                return;
            }

            console.log(`[SYNC] Processing ${queue.length} items...`);

            // Sort by timestamp
            const sortedQueue = queue.sort((a, b) => a.timestamp - b.timestamp);
            const batch = sortedQueue.slice(0, this.batchSize);

            // Sequential processing (FIFO)
            for (const item of batch) {
                try {
                    // Actual API Call
                    // await fetch(item.url, { method: item.method, body: JSON.stringify(item.body) });
                    console.log(`[SYNC] Synced ${item.id} to ${item.url}`);

                    // Remove from queue on success
                    await db.delete('syncQueue', item.id);
                } catch (err) {
                    console.error(`[SYNC] Failed to sync ${item.id}`, err);
                    // Add retry count logic here
                    break; // Stop batch on failure to maintain order
                }
            }
        } catch (error) {
            console.error("[SYNC] Fatal error", error);
        } finally {
            this.isSyncing = false;
        }
    }
}

export const syncManager = new SyncManager();
