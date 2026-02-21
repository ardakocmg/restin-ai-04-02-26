/**
 * OfflineDB - IndexedDB Service for Offline-First Operations
 * @module services/OfflineDB
 * 
 * Stores:
 * - offline_commands: Queued operations (POS orders, KDS actions, etc.)
 * - cached_data: Read models (menu, venues, users)
 * - auth_cache: Offline auth tokens (TTL-based)
 * - sync_log: Sync history and conflicts
 */

import { logger } from '../lib/logger';

const DB_NAME = 'restin_offline_db';
const DB_VERSION = 1;

export type CommandStatus = 'PENDING' | 'PROCESSING' | 'SYNCED' | 'FAILED';

export interface OfflineCommand {
    id?: number;
    request_id: string;
    entity_type: string;
    action: string;
    payload: unknown;
    timestamp: string;
    status: CommandStatus;
    retry_count: number;
    device_id: string | null;
    result?: unknown;
    synced_at?: string;
}

export interface CacheEntry {
    cache_key: string;
    entity_type: string;
    data: unknown;
    cached_at: string;
    expires_at: string;
}

export interface AuthCacheEntry {
    user_id: string;
    token: string;
    user: unknown;
    cached_at: string;
    expires_at: string;
    offline_mode: boolean;
}

export interface SyncLogEntry {
    id?: number;
    command_id: number;
    timestamp: string;
    status: string;
    details: unknown;
    device_id: string | null;
}

export interface OfflineStats {
    pending_commands: number;
    total_syncs: number;
    last_sync: string | null;
}

class OfflineDB {
    private db: IDBDatabase | null = null;
    public isReady = false;

    async init(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                this.isReady = true;
                logger.info('OfflineDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Offline Commands Queue
                if (!db.objectStoreNames.contains('offline_commands')) {
                    const commandStore = db.createObjectStore('offline_commands', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    commandStore.createIndex('request_id', 'request_id', { unique: true });
                    commandStore.createIndex('timestamp', 'timestamp');
                    commandStore.createIndex('status', 'status');
                    commandStore.createIndex('entity_type', 'entity_type');
                }

                // Cached Data (Read Models)
                if (!db.objectStoreNames.contains('cached_data')) {
                    const cacheStore = db.createObjectStore('cached_data', {
                        keyPath: 'cache_key'
                    });
                    cacheStore.createIndex('entity_type', 'entity_type');
                    cacheStore.createIndex('expires_at', 'expires_at');
                }

                // Offline Auth Cache
                if (!db.objectStoreNames.contains('auth_cache')) {
                    const authStore = db.createObjectStore('auth_cache', {
                        keyPath: 'user_id'
                    });
                    authStore.createIndex('expires_at', 'expires_at');
                }

                // Sync Log
                if (!db.objectStoreNames.contains('sync_log')) {
                    const syncStore = db.createObjectStore('sync_log', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    syncStore.createIndex('timestamp', 'timestamp');
                    syncStore.createIndex('status', 'status');
                }

                logger.info('OfflineDB schema created');
            };
        });
    }

    // ============= COMMAND QUEUE =============

    async addCommand(command: Partial<OfflineCommand>): Promise<OfflineCommand> {
        if (!this.db) throw new Error('OfflineDB not initialized');

        const tx = this.db.transaction(['offline_commands'], 'readwrite');
        const store = tx.objectStore('offline_commands');

        const commandWithMeta: OfflineCommand = {
            request_id: command.request_id || this.generateRequestId(),
            entity_type: command.entity_type || 'unknown',
            action: command.action || 'unknown',
            payload: command.payload,
            timestamp: new Date().toISOString(),
            status: 'PENDING',
            retry_count: 0,
            device_id: localStorage.getItem('restin_device_id')
        };

        return new Promise((resolve, reject) => {
            const request = store.add(commandWithMeta);
            request.onsuccess = () => {
                commandWithMeta.id = request.result as number;
                logger.info('Command queued offline', { requestId: commandWithMeta.request_id });
                resolve(commandWithMeta);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getPendingCommands(): Promise<OfflineCommand[]> {
        if (!this.db) {
            logger.warn('OfflineDB not initialized yet');
            return [];
        }
        const tx = this.db.transaction(['offline_commands'], 'readonly');
        const store = tx.objectStore('offline_commands');
        const index = store.index('status');
        const commands = await this.getAllFromIndex<OfflineCommand>(index, 'PENDING');
        return commands.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    async updateCommandStatus(id: number, status: CommandStatus, result: unknown = null): Promise<void> {
        if (!this.db) return;

        const tx = this.db.transaction(['offline_commands'], 'readwrite');
        const store = tx.objectStore('offline_commands');

        return new Promise((resolve, reject) => {
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const command = getRequest.result as OfflineCommand | undefined;
                if (command) {
                    command.status = status;
                    command.result = result;
                    command.synced_at = new Date().toISOString();
                    const putRequest = store.put(command);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteCommand(id: number): Promise<void> {
        if (!this.db) return;

        const tx = this.db.transaction(['offline_commands'], 'readwrite');
        const store = tx.objectStore('offline_commands');

        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ============= CACHE =============

    async cacheData(entityType: string, key: string, data: unknown, ttlMinutes = 60): Promise<void> {
        if (!this.db) return;

        const tx = this.db.transaction(['cached_data'], 'readwrite');
        const store = tx.objectStore('cached_data');

        const cacheEntry: CacheEntry = {
            cache_key: `${entityType}:${key}`,
            entity_type: entityType,
            data: data,
            cached_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
        };

        return new Promise((resolve, reject) => {
            const request = store.put(cacheEntry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getCachedData<T = unknown>(entityType: string, key: string): Promise<T | null> {
        if (!this.db) return null;

        const tx = this.db.transaction(['cached_data'], 'readonly');
        const store = tx.objectStore('cached_data');

        return new Promise((resolve, reject) => {
            const request = store.get(`${entityType}:${key}`);
            request.onsuccess = () => {
                const entry = request.result as CacheEntry | undefined;
                if (!entry) {
                    resolve(null);
                    return;
                }

                // Check expiry
                if (new Date(entry.expires_at) < new Date()) {
                    this.deleteCachedData(entityType, key);
                    resolve(null);
                    return;
                }

                resolve(entry.data as T);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteCachedData(entityType: string, key: string): Promise<void> {
        if (!this.db) return;

        const tx = this.db.transaction(['cached_data'], 'readwrite');
        const store = tx.objectStore('cached_data');

        return new Promise((resolve, reject) => {
            const request = store.delete(`${entityType}:${key}`);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearExpiredCache(): Promise<number> {
        if (!this.db) return 0;

        const tx = this.db.transaction(['cached_data'], 'readwrite');
        const store = tx.objectStore('cached_data');
        const index = store.index('expires_at');
        const now = new Date().toISOString();

        const range = IDBKeyRange.upperBound(now);

        return new Promise((resolve) => {
            let count = 0;
            const cursorRequest = index.openCursor(range);

            cursorRequest.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    cursor.delete();
                    count++;
                    cursor.continue();
                } else {
                    logger.info('Cleared expired cache entries', { count });
                    resolve(count);
                }
            };
        });
    }

    // ============= AUTH CACHE =============

    async cacheAuth(userId: string, authData: { token: string; user: unknown }, ttlMinutes = 480): Promise<void> {
        if (!this.db) return;

        const tx = this.db.transaction(['auth_cache'], 'readwrite');
        const store = tx.objectStore('auth_cache');

        const authEntry: AuthCacheEntry = {
            user_id: userId,
            token: authData.token,
            user: authData.user,
            cached_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
            offline_mode: true
        };

        return new Promise((resolve, reject) => {
            const request = store.put(authEntry);
            request.onsuccess = () => {
                logger.info('Auth cached for offline use', { ttlMinutes });
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getAuthCache(userId: string): Promise<AuthCacheEntry | null> {
        if (!this.db) return null;

        const tx = this.db.transaction(['auth_cache'], 'readonly');
        const store = tx.objectStore('auth_cache');

        return new Promise((resolve, reject) => {
            const request = store.get(userId);
            request.onsuccess = () => {
                const entry = request.result as AuthCacheEntry | undefined;
                if (!entry) {
                    resolve(null);
                    return;
                }

                // Check expiry
                if (new Date(entry.expires_at) < new Date()) {
                    logger.warn('Offline auth expired');
                    this.deleteAuthCache(userId);
                    resolve(null);
                    return;
                }

                resolve(entry);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteAuthCache(userId: string): Promise<void> {
        if (!this.db) return;

        const tx = this.db.transaction(['auth_cache'], 'readwrite');
        const store = tx.objectStore('auth_cache');

        return new Promise((resolve, reject) => {
            const request = store.delete(userId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ============= SYNC LOG =============

    async logSync(commandId: number, status: string, details: unknown): Promise<void> {
        if (!this.db) return;

        const tx = this.db.transaction(['sync_log'], 'readwrite');
        const store = tx.objectStore('sync_log');

        const entry: SyncLogEntry = {
            command_id: commandId,
            timestamp: new Date().toISOString(),
            status,
            details,
            device_id: localStorage.getItem('restin_device_id')
        };

        return new Promise((resolve, reject) => {
            const request = store.add(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ============= HELPERS =============

    generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getAllFromIndex<T>(index: IDBIndex, query: IDBValidKey): Promise<T[]> {
        return new Promise((resolve, reject) => {
            const request = index.getAll(query);
            request.onsuccess = () => resolve(request.result as T[]);
            request.onerror = () => reject(request.error);
        });
    }

    async getStats(): Promise<OfflineStats> {
        if (!this.db) {
            return { pending_commands: 0, total_syncs: 0, last_sync: null };
        }
        const pending = await this.getPendingCommands();
        const tx = this.db.transaction(['sync_log'], 'readonly');
        const syncStore = tx.objectStore('sync_log');
        const allSyncs = await this.getAllFromStore<SyncLogEntry>(syncStore);

        return {
            pending_commands: pending.length,
            total_syncs: allSyncs.length,
            last_sync: allSyncs[allSyncs.length - 1]?.timestamp || null
        };
    }

    private getAllFromStore<T>(store: IDBObjectStore): Promise<T[]> {
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result as T[]);
            request.onerror = () => reject(request.error);
        });
    }
}

// Singleton instance
const offlineDB = new OfflineDB();

export default offlineDB;
