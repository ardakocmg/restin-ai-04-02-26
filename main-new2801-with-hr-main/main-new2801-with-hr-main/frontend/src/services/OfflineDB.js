/**
 * OfflineDB - IndexedDB Service for Offline-First Operations
 * 
 * Stores:
 * - offline_commands: Queued operations (POS orders, KDS actions, etc.)
 * - cached_data: Read models (menu, venues, users)
 * - auth_cache: Offline auth tokens (TTL-based)
 * - sync_log: Sync history and conflicts
 */

const DB_NAME = 'restin_offline_db';
const DB_VERSION = 1;

class OfflineDB {
  constructor() {
    this.db = null;
    this.isReady = false;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('✅ OfflineDB initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

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

        console.log('✅ OfflineDB schema created');
      };
    });
  }

  // ============= COMMAND QUEUE =============

  async addCommand(command) {
    const tx = this.db.transaction(['offline_commands'], 'readwrite');
    const store = tx.objectStore('offline_commands');

    const commandWithMeta = {
      ...command,
      request_id: command.request_id || this.generateRequestId(),
      timestamp: new Date().toISOString(),
      status: 'PENDING',
      retry_count: 0,
      device_id: localStorage.getItem('restin_device_id')
    };

    await store.add(commandWithMeta);
    console.log('📝 Command queued offline:', commandWithMeta.request_id);
    return commandWithMeta;
  }

  async getPendingCommands() {
    if (!this.db) {
      console.warn('⚠️ OfflineDB not initialized yet');
      return [];
    }
    const tx = this.db.transaction(['offline_commands'], 'readonly');
    const store = tx.objectStore('offline_commands');
    const index = store.index('status');
    const commands = await this.getAllFromIndex(index, 'PENDING');
    return commands.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  async updateCommandStatus(id, status, result = null) {
    const tx = this.db.transaction(['offline_commands'], 'readwrite');
    const store = tx.objectStore('offline_commands');
    const command = await store.get(id);

    if (command) {
      command.status = status;
      command.result = result;
      command.synced_at = new Date().toISOString();
      await store.put(command);
    }
  }

  async deleteCommand(id) {
    const tx = this.db.transaction(['offline_commands'], 'readwrite');
    const store = tx.objectStore('offline_commands');
    await store.delete(id);
  }

  // ============= CACHE =============

  async cacheData(entityType, key, data, ttlMinutes = 60) {
    const tx = this.db.transaction(['cached_data'], 'readwrite');
    const store = tx.objectStore('cached_data');

    const cacheEntry = {
      cache_key: `${entityType}:${key}`,
      entity_type: entityType,
      data: data,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
    };

    await store.put(cacheEntry);
  }

  async getCachedData(entityType, key) {
    const tx = this.db.transaction(['cached_data'], 'readonly');
    const store = tx.objectStore('cached_data');
    const entry = await store.get(`${entityType}:${key}`);

    if (!entry) return null;

    // Check expiry
    if (new Date(entry.expires_at) < new Date()) {
      await this.deleteCachedData(entityType, key);
      return null;
    }

    return entry.data;
  }

  async deleteCachedData(entityType, key) {
    const tx = this.db.transaction(['cached_data'], 'readwrite');
    const store = tx.objectStore('cached_data');
    await store.delete(`${entityType}:${key}`);
  }

  async clearExpiredCache() {
    const tx = this.db.transaction(['cached_data'], 'readwrite');
    const store = tx.objectStore('cached_data');
    const index = store.index('expires_at');
    const now = new Date().toISOString();

    const range = IDBKeyRange.upperBound(now);
    const cursor = await index.openCursor(range);

    return new Promise((resolve) => {
      let count = 0;
      cursor.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          count++;
          cursor.continue();
        } else {
          console.log(`🧹 Cleared ${count} expired cache entries`);
          resolve(count);
        }
      };
    });
  }

  // ============= AUTH CACHE =============

  async cacheAuth(userId, authData, ttlMinutes = 480) {
    const tx = this.db.transaction(['auth_cache'], 'readwrite');
    const store = tx.objectStore('auth_cache');

    const authEntry = {
      user_id: userId,
      token: authData.token,
      user: authData.user,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
      offline_mode: true
    };

    await store.put(authEntry);
    console.log('🔐 Auth cached for offline use (TTL:', ttlMinutes, 'min)');
  }

  async getAuthCache(userId) {
    const tx = this.db.transaction(['auth_cache'], 'readonly');
    const store = tx.objectStore('auth_cache');
    const entry = await store.get(userId);

    if (!entry) return null;

    // Check expiry
    if (new Date(entry.expires_at) < new Date()) {
      console.warn('⚠️ Offline auth expired');
      await this.deleteAuthCache(userId);
      return null;
    }

    return entry;
  }

  async deleteAuthCache(userId) {
    const tx = this.db.transaction(['auth_cache'], 'readwrite');
    const store = tx.objectStore('auth_cache');
    await store.delete(userId);
  }

  // ============= SYNC LOG =============

  async logSync(commandId, status, details) {
    const tx = this.db.transaction(['sync_log'], 'readwrite');
    const store = tx.objectStore('sync_log');

    await store.add({
      command_id: commandId,
      timestamp: new Date().toISOString(),
      status,
      details,
      device_id: localStorage.getItem('restin_device_id')
    });
  }

  // ============= HELPERS =============

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getAllFromIndex(index, query) {
    return new Promise((resolve, reject) => {
      const request = index.getAll(query);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getStats() {
    if (!this.db) {
      return { pending_commands: 0, total_syncs: 0, last_sync: null };
    }
    const pending = await this.getPendingCommands();
    const tx = this.db.transaction(['sync_log'], 'readonly');
    const syncStore = tx.objectStore('sync_log');
    const allSyncs = await this.getAllFromStore(syncStore);

    return {
      pending_commands: pending.length,
      total_syncs: allSyncs.length,
      last_sync: allSyncs[allSyncs.length - 1]?.timestamp || null
    };
  }

  getAllFromStore(store) {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
const offlineDB = new OfflineDB();

export default offlineDB;
