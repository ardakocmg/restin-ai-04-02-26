/**
 * SyncManager — 4-Stage Offline Sync Queue
 * Rule #20: Optimistic → IndexedDB → Queue → Cloud
 * Rule #29: Batch sync to prevent DDOS after offline recovery
 */
import api from '@/lib/api';

interface QueueItem {
    id: string;
    url: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body: Record<string, unknown>;
    timestamp: number;
    retries: number;
}

const DB_NAME = 'restin-sync';
const STORE_NAME = 'syncQueue';
const DB_VERSION = 1;
const BATCH_SIZE = 10;
const SYNC_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

class SyncManagerService {
    private isSyncing = false;
    private intervalId: ReturnType<typeof setInterval> | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.intervalId = setInterval(() => this.processQueue(), SYNC_INTERVAL);
            window.addEventListener('online', () => this.processQueue());
        }
    }

    /**
     * Add an item to the offline sync queue
     */
    async enqueue(url: string, method: QueueItem['method'], body: Record<string, unknown>): Promise<void> {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const item: QueueItem = {
            id: `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url,
            method,
            body,
            timestamp: Date.now(),
            retries: 0,
        };

        store.add(item);
        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * Get current queue size
     */
    async queueSize(): Promise<number> {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const count = store.count();
        return new Promise<number>((resolve) => {
            count.onsuccess = () => resolve(count.result);
            count.onerror = () => resolve(0);
        });
    }

    /**
     * Process queued items in batches (FIFO)
     */
    async processQueue(): Promise<void> {
        if (this.isSyncing || !navigator.onLine) return;
        this.isSyncing = true;

        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const allRequest = store.getAll();

            const items = await new Promise<QueueItem[]>((resolve) => {
                allRequest.onsuccess = () => resolve(allRequest.result || []);
                allRequest.onerror = () => resolve([]);
            });

            if (items.length === 0) {
                this.isSyncing = false;
                return;
            }

            // Sort FIFO, take batch
            const sorted = items.sort((a, b) => a.timestamp - b.timestamp);
            const batch = sorted.slice(0, BATCH_SIZE);

            for (const item of batch) {
                try {
                    await api.request({
                        url: item.url,
                        method: item.method,
                        data: item.body,
                    });

                    // Remove on success
                    const delTx = db.transaction(STORE_NAME, 'readwrite');
                    delTx.objectStore(STORE_NAME).delete(item.id);
                } catch {
                    if (item.retries >= MAX_RETRIES) {
                        // Dead letter — remove after max retries
                        const delTx = db.transaction(STORE_NAME, 'readwrite');
                        delTx.objectStore(STORE_NAME).delete(item.id);
                    } else {
                        // Increment retry count
                        const retryTx = db.transaction(STORE_NAME, 'readwrite');
                        retryTx.objectStore(STORE_NAME).put({ ...item, retries: item.retries + 1 });
                    }
                    break; // Stop batch on failure to maintain order
                }
            }
        } catch {
            // Fatal error — skip this cycle
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Cleanup — stop the interval
     */
    destroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

export const syncManager = new SyncManagerService();
