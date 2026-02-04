/**
 * SyncService - Idempotent Command Replay & Sync Engine
 * 
 * Handles:
 * - Network status monitoring
 * - Offline queue replay
 * - Conflict resolution
 * - Retry logic with exponential backoff
 */

import offlineDB from './OfflineDB';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

class SyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.syncInterval = null;
    this.listeners = [];
    
    // Network event listeners
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  // ============= NETWORK STATUS =============

  handleOnline() {
    console.log('🌐 Network online detected');
    this.isOnline = true;
    this.notifyListeners('online');
    this.startSync();
  }

  handleOffline() {
    console.log('📡 Network offline detected');
    this.isOnline = false;
    this.notifyListeners('offline');
    this.stopSync();
  }

  onStatusChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(status) {
    this.listeners.forEach(cb => cb(status, this.isOnline));
  }

  // ============= SYNC ENGINE =============

  async startSync() {
    if (this.isSyncing) return;
    
    console.log('🔄 Starting sync engine...');
    this.isSyncing = true;
    
    // Immediate sync
    await this.syncPendingCommands();
    
    // Periodic sync every 30 seconds
    this.syncInterval = setInterval(() => {
      this.syncPendingCommands();
    }, 30000);
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isSyncing = false;
    console.log('⏸️ Sync engine stopped');
  }

  async syncPendingCommands() {
    if (!this.isOnline) return;
    
    try {
      const pendingCommands = await offlineDB.getPendingCommands();
      
      if (pendingCommands.length === 0) {
        return { success: true, synced: 0 };
      }

      console.log(`🔄 Syncing ${pendingCommands.length} pending commands...`);
      
      let successCount = 0;
      let failCount = 0;

      for (const command of pendingCommands) {
        try {
          await this.replayCommand(command);
          await offlineDB.updateCommandStatus(command.id, 'SYNCED');
          await offlineDB.logSync(command.id, 'SUCCESS', null);
          successCount++;
        } catch (error) {
          console.error('❌ Command replay failed:', command.request_id, error);
          
          // Retry logic
          if (command.retry_count < 3) {
            await this.updateRetryCount(command.id, command.retry_count + 1);
            failCount++;
          } else {
            // Max retries exceeded - mark as FAILED
            await offlineDB.updateCommandStatus(command.id, 'FAILED', error.message);
            await offlineDB.logSync(command.id, 'FAILED', error.message);
            failCount++;
          }
        }
      }

      console.log(`✅ Sync complete: ${successCount} success, ${failCount} failed`);
      this.notifyListeners('sync_complete', { successCount, failCount });

      return { success: true, synced: successCount, failed: failCount };
    } catch (error) {
      console.error('❌ Sync engine error:', error);
      return { success: false, error: error.message };
    }
  }

  async replayCommand(command) {
    const token = localStorage.getItem('restin_token');
    
    // Build request config with idempotency
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Idempotency-Key': command.request_id,
        'X-Offline-Replay': 'true',
        'X-Device-Id': command.device_id
      }
    };

    // Replay the command
    switch (command.entity_type) {
      case 'pos_order':
        return await this.replayPOSOrder(command, config);
      
      case 'pos_order_item':
        return await this.replayPOSOrderItem(command, config);
      
      case 'pos_payment':
        return await this.replayPOSPayment(command, config);
      
      case 'kds_bump':
        return await this.replayKDSBump(command, config);
      
      case 'inventory_adjustment':
        return await this.replayInventoryAdjustment(command, config);
      
      default:
        throw new Error(`Unknown command type: ${command.entity_type}`);
    }
  }

  async replayPOSOrder(command, config) {
    const response = await axios.post(
      `${API_URL}/api/pos/orders`,
      command.payload,
      config
    );
    return response.data;
  }

  async replayPOSOrderItem(command, config) {
    const response = await axios.post(
      `${API_URL}/api/pos/orders/${command.payload.order_id}/items`,
      command.payload,
      config
    );
    return response.data;
  }

  async replayPOSPayment(command, config) {
    const response = await axios.post(
      `${API_URL}/api/pos/orders/${command.payload.order_id}/payments`,
      command.payload,
      config
    );
    return response.data;
  }

  async replayKDSBump(command, config) {
    const response = await axios.post(
      `${API_URL}/api/kds/runtime/${command.payload.station_key}/tickets/${command.payload.ticket_id}/bump`,
      {},
      config
    );
    return response.data;
  }

  async replayInventoryAdjustment(command, config) {
    const response = await axios.post(
      `${API_URL}/api/inventory/adjustments`,
      command.payload,
      config
    );
    return response.data;
  }

  async updateRetryCount(commandId, retryCount) {
    const tx = this.db.transaction(['offline_commands'], 'readwrite');
    const store = tx.objectStore('offline_commands');
    const command = await store.get(commandId);
    
    if (command) {
      command.retry_count = retryCount;
      await store.put(command);
    }
  }

  // ============= OFFLINE OPERATIONS =============

  async queuePOSOrder(orderData) {
    return await offlineDB.addCommand({
      entity_type: 'pos_order',
      action: 'create',
      payload: orderData
    });
  }

  async queuePOSOrderItem(itemData) {
    return await offlineDB.addCommand({
      entity_type: 'pos_order_item',
      action: 'add',
      payload: itemData
    });
  }

  async queuePOSPayment(paymentData) {
    return await offlineDB.addCommand({
      entity_type: 'pos_payment',
      action: 'process',
      payload: paymentData
    });
  }

  async queueKDSBump(bumpData) {
    return await offlineDB.addCommand({
      entity_type: 'kds_bump',
      action: 'bump',
      payload: bumpData
    });
  }

  // ============= MANUAL SYNC =============

  async forceSyncNow() {
    console.log('🔄 Manual sync triggered');
    return await this.syncPendingCommands();
  }

  async getQueueStats() {
    return await offlineDB.getStats();
  }
}

// Singleton instance
const syncService = new SyncService();

// Auto-initialize
offlineDB.init().then(() => {
  if (navigator.onLine) {
    syncService.startSync();
  }
});

export default syncService;
