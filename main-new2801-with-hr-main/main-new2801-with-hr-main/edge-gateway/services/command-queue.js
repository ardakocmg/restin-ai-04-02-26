/**
 * Command Queue - Offline command queuing and replay
 */

const db = require('./database');
const axios = require('axios');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

class CommandQueue {
  constructor() {
    this.cloudUrl = config.cloud.apiUrl;
    this.venueId = config.cloud.venueId;
    this.syncInterval = null;
    this.isSyncing = false;
  }

  // Enqueue a command
  enqueue(type, payload, deviceId = null) {
    const requestId = `edge_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const commandId = db.enqueueCommand(requestId, type, payload, deviceId);
    
    console.log(`📥 Command queued: ${type} (ID: ${commandId})`);
    
    // Try immediate sync if cloud is reachable
    if (!this.isSyncing) {
      this.syncToCloud().catch(err => {
        console.error('Immediate sync failed:', err.message);
      });
    }

    return { commandId, requestId };
  }

  // Start periodic sync
  startSync() {
    if (this.syncInterval) return;

    console.log('🔄 Starting command sync engine...');
    
    // Immediate sync
    this.syncToCloud();

    // Periodic sync
    this.syncInterval = setInterval(() => {
      this.syncToCloud();
    }, config.sync.intervalMs);
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏸️ Command sync stopped');
    }
  }

  // Sync pending commands to cloud
  async syncToCloud() {
    if (this.isSyncing) return;

    this.isSyncing = true;

    try {
      // Check cloud reachability
      const isReachable = await this.checkCloudReachability();
      if (!isReachable) {
        console.log('☁️ Cloud unreachable, skipping sync');
        this.isSyncing = false;
        return { success: false, reason: 'cloud_unreachable' };
      }

      const pendingCommands = db.getPendingCommands(50); // Batch of 50

      if (pendingCommands.length === 0) {
        this.isSyncing = false;
        return { success: true, synced: 0 };
      }

      console.log(`🔄 Syncing ${pendingCommands.length} pending commands...`);

      let successCount = 0;
      let failCount = 0;

      for (const command of pendingCommands) {
        try {
          await this.replayCommand(command);
          db.updateCommandStatus(command.id, 'SYNCED', null, Math.floor(Date.now() / 1000));
          successCount++;
        } catch (error) {
          console.error(`❌ Command replay failed: ${command.request_id}`, error.message);
          
          // Retry logic
          if (command.retry_count < config.sync.maxRetryCount) {
            db.incrementRetryCount(command.id);
            failCount++;
          } else {
            // Max retries exceeded
            db.updateCommandStatus(command.id, 'FAILED', error.message);
            failCount++;
          }
        }
      }

      console.log(`✅ Sync complete: ${successCount} success, ${failCount} failed`);

      this.isSyncing = false;
      return { success: true, synced: successCount, failed: failCount };
    } catch (error) {
      console.error('❌ Sync error:', error);
      this.isSyncing = false;
      return { success: false, error: error.message };
    }
  }

  // Replay a single command to cloud
  async replayCommand(command) {
    const { request_id, type, payload } = command;

    // Build request config with idempotency
    const headers = {
      'X-Idempotency-Key': request_id,
      'X-Edge-Replay': 'true',
      'X-Venue-Id': this.venueId,
    };

    if (command.device_id) {
      headers['X-Device-Id'] = command.device_id;
    }

    // Route based on command type
    let endpoint = '';
    let method = 'POST';
    let data = payload;

    switch (type) {
      case 'pos_order':
        endpoint = '/api/pos/orders';
        break;
      
      case 'pos_order_item':
        endpoint = `/api/pos/orders/${payload.order_id}/items`;
        break;
      
      case 'pos_payment':
        endpoint = `/api/pos/orders/${payload.order_id}/payments`;
        break;
      
      case 'kds_bump':
        endpoint = `/api/kds/runtime/${payload.station_key}/tickets/${payload.ticket_id}/bump`;
        data = {};
        break;
      
      case 'inventory_adjustment':
        endpoint = '/api/inventory/adjustments';
        break;
      
      default:
        throw new Error(`Unknown command type: ${type}`);
    }

    // Execute request
    const response = await axios({
      method,
      url: `${this.cloudUrl}${endpoint}`,
      data,
      headers,
      timeout: 10000,
    });

    return response.data;
  }

  // Check if cloud is reachable
  async checkCloudReachability() {
    try {
      const response = await axios.get(`${this.cloudUrl}/api/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Get queue statistics
  getStats() {
    const stats = db.getQueueStats();
    const statsMap = {};
    stats.forEach(s => {
      statsMap[s.status] = s.count;
    });
    return {
      pending: statsMap.PENDING || 0,
      synced: statsMap.SYNCED || 0,
      failed: statsMap.FAILED || 0,
    };
  }

  // Manual sync trigger
  async forceSyncNow() {
    console.log('🔄 Manual sync triggered');
    return await this.syncToCloud();
  }
}

module.exports = new CommandQueue();
