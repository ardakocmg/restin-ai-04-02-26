/**
 * 📡 Offline-First Sync Queue — Rule 20
 * 4-Stage Sync: Optimistic UI → IndexedDB → Queue → Cloud
 * 
 * Stores failed API calls in IndexedDB and replays them when back online.
 */

const DB_NAME = 'restin_offline_db';
const DB_VERSION = 1;
const STORES = {
    SYNC_QUEUE: 'sync_queue',
    CACHE: 'offline_cache',
};

interface SyncQueueItem {
    id: string;
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: string;
    headers?: Record<string, string>;
    timestamp: number;
    retryCount: number;
    maxRetries: number;
    priority: number; // lower = higher priority
    module: string;
}

interface CacheItem {
    key: string;
    data: unknown;
    timestamp: number;
    ttl: number; // ms
}

class OfflineSyncManager {
    private db: IDBDatabase | null = null;
    private isOnline: boolean = navigator.onLine;
    private isSyncing: boolean = false;
    private listeners: Set<(online: boolean) => void> = new Set();

    constructor() {
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    /** Initialize IndexedDB */
    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                    const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('priority', 'priority', { unique: false });
                    store.createIndex('module', 'module', { unique: false });
                }
                if (!db.objectStoreNames.contains(STORES.CACHE)) {
                    const cacheStore = db.createObjectStore(STORES.CACHE, { keyPath: 'key' });
                    cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    }

    /** Add a failed request to the sync queue */
    async enqueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
        if (!this.db) await this.init();
        const id = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const entry: SyncQueueItem = {
            ...item,
            id,
            timestamp: Date.now(),
            retryCount: 0,
        };

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(STORES.SYNC_QUEUE, 'readwrite');
            tx.objectStore(STORES.SYNC_QUEUE).add(entry);
            tx.oncomplete = () => resolve(id);
            tx.onerror = () => reject(tx.error);
        });
    }

    /** Get all pending sync items */
    async getPending(): Promise<SyncQueueItem[]> {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(STORES.SYNC_QUEUE, 'readonly');
            const request = tx.objectStore(STORES.SYNC_QUEUE).index('priority').getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /** Remove a synced item from the queue */
    async dequeue(id: string): Promise<void> {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(STORES.SYNC_QUEUE, 'readwrite');
            tx.objectStore(STORES.SYNC_QUEUE).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    /** Cache data for offline reading */
    async cacheData(key: string, data: unknown, ttlMs: number = 3600000): Promise<void> {
        if (!this.db) await this.init();
        const item: CacheItem = { key, data, timestamp: Date.now(), ttl: ttlMs };
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(STORES.CACHE, 'readwrite');
            tx.objectStore(STORES.CACHE).put(item);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    /** Read cached data */
    async getCached<T = unknown>(key: string): Promise<T | null> {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(STORES.CACHE, 'readonly');
            const request = tx.objectStore(STORES.CACHE).get(key);
            request.onsuccess = () => {
                const item = request.result as CacheItem | undefined;
                if (!item) return resolve(null);
                if (Date.now() - item.timestamp > item.ttl) return resolve(null); // expired
                resolve(item.data as T);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Replay queued requests with batching — Rule 29
     * Batch sync requests to prevent DDOS after offline recovery.
     */
    async syncAll(batchSize: number = 5, delayMs: number = 500): Promise<{ success: number; failed: number }> {
        if (this.isSyncing || !this.isOnline) return { success: 0, failed: 0 };
        this.isSyncing = true;

        let successCount = 0;
        let failCount = 0;

        try {
            const pending = await this.getPending();
            const batches: SyncQueueItem[][] = [];

            for (let i = 0; i < pending.length; i += batchSize) {
                batches.push(pending.slice(i, i + batchSize));
            }

            for (const batch of batches) {
                const results = await Promise.allSettled(
                    batch.map(async (item) => {
                        const response = await fetch(item.url, {
                            method: item.method,
                            headers: item.headers ? { ...item.headers } : { 'Content-Type': 'application/json' },
                            body: item.body || undefined,
                        });

                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        await this.dequeue(item.id);
                        return true;
                    })
                );

                results.forEach((r, i) => {
                    if (r.status === 'fulfilled') {
                        successCount++;
                    } else {
                        failCount++;
                        // Increment retry, remove if max reached
                        const item = batch[i];
                        if (item.retryCount >= item.maxRetries) {
                            this.dequeue(item.id); // Give up
                        }
                    }
                });

                // Delay between batches to prevent DDOS
                if (batches.length > 1) {
                    await new Promise(r => setTimeout(r, delayMs));
                }
            }
        } finally {
            this.isSyncing = false;
        }

        return { success: successCount, failed: failCount };
    }

    /** Subscribe to online/offline changes */
    onStatusChange(cb: (online: boolean) => void): () => void {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    }

    get online(): boolean {
        return this.isOnline;
    }

    get syncing(): boolean {
        return this.isSyncing;
    }

    /** Self-healing: reset DB on corruption — Rule 25 */
    async resetOnCorruption(): Promise<void> {
        try {
            await this.init();
        } catch {
            indexedDB.deleteDatabase(DB_NAME);
            this.db = null;
            await this.init();
        }
    }

    private handleOnline(): void {
        this.isOnline = true;
        this.listeners.forEach(cb => cb(true));
        // Auto-sync with traffic control
        this.syncAll();
    }

    private handleOffline(): void {
        this.isOnline = false;
        this.listeners.forEach(cb => cb(false));
    }
}

export const offlineSync = new OfflineSyncManager();
export type { CacheItem,SyncQueueItem };
