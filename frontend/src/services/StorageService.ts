/**
 * Storage Service - IndexedDB wrapper for offline queue
 * @module services/StorageService
 */

export interface QueueItem {
    id?: number;
    type: string;
    payload: unknown;
    timestamp?: number;
    retryCount?: number;
    idempotencyKey?: string;
}

class StorageService {
    private dbName: string;
    private version: number;
    private db: IDBDatabase | null = null;

    constructor(dbName = 'restinai_offline', version = 1) {
        this.dbName = dbName;
        this.version = version;
    }

    async init(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains('offlineQueue')) {
                    const store = db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('idempotencyKey', 'idempotencyKey', { unique: true });
                }
            };
        });
    }

    async addToQueue(item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<IDBValidKey> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['offlineQueue'], 'readwrite');
            const store = transaction.objectStore('offlineQueue');
            const request = store.add({
                ...item,
                timestamp: Date.now(),
                retryCount: 0
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getQueue(): Promise<QueueItem[]> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['offlineQueue'], 'readonly');
            const store = transaction.objectStore('offlineQueue');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result as QueueItem[]);
            request.onerror = () => reject(request.error);
        });
    }

    async removeFromQueue(id: number): Promise<void> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['offlineQueue'], 'readwrite');
            const store = transaction.objectStore('offlineQueue');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearQueue(): Promise<void> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['offlineQueue'], 'readwrite');
            const store = transaction.objectStore('offlineQueue');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

export default StorageService;
