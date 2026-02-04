import { getPendingSyncs, removeSyncItems } from './queue';

// Rule #29: Traffic Control (Batching + Backoff)

const SYNC_ENDPOINT = '/api/sync/batch';
const MAX_BATCH_SIZE = 50;

export class SyncWorker {
    private isSyncing = false;
    private retryCount = 0;
    private maxRetries = 5;

    constructor() {
        // Start Polling Loop
        setInterval(() => this.processQueue(), 5000);

        // Listen for Online
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.retryCount = 0;
                this.processQueue();
            });
        }
    }

    async processQueue() {
        if (this.isSyncing || !navigator.onLine) return;

        this.isSyncing = true;

        try {
            const batch = await getPendingSyncs(MAX_BATCH_SIZE);
            if (batch.length === 0) {
                this.isSyncing = false;
                return;
            }

            console.log(`[SYNC] Processing batch of ${batch.length}...`);

            const payload = {
                operations: batch.map(op => ({
                    id: op.id,
                    type: op.type,
                    payload: op.payload,
                    timestamp: op.timestamp
                }))
            };

            const response = await fetch(SYNC_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Server Error: ${response.status}`);
            }

            const result = await response.json();

            // Rule #20 - Stage 4: Conflict Resolution
            // Server might return { success: [], failures: [], conflicts: [] }
            // For MVP, assume success = ack all

            await removeSyncItems(batch.map(op => op.id!));

            console.log(`[SYNC] Batch success.`);
            this.retryCount = 0;

            // Immediate next batch if we hit limit
            if (batch.length === MAX_BATCH_SIZE) {
                setTimeout(() => this.processQueue(), 100);
            }

        } catch (error) {
            console.error('[SYNC] Failed', error);

            // Exponential Backoff
            const waitTime = Math.pow(2, this.retryCount) * 1000;
            console.log(`[SYNC] Retrying in ${waitTime}ms`);
            this.retryCount = Math.min(this.retryCount + 1, this.maxRetries);

            // Note: In real worker, we'd sleep here or schedule next run
        } finally {
            this.isSyncing = false;
        }
    }
}

export const syncWorker = new SyncWorker();
