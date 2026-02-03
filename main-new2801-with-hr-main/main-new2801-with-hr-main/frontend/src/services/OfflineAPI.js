/**
 * OfflineAPI - Offline-First API Wrapper
 * 
 * Automatically queues commands when offline and executes when online.
 * Provides seamless online/offline experience.
 * Integrated with Edge Gateway for venue-level resilience.
 */

import axios from 'axios';
import offlineDB from './OfflineDB';
import syncService from './SyncService';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const EDGE_GATEWAY_URL = process.env.REACT_APP_EDGE_GATEWAY_URL;

class OfflineAPI {
  constructor() {
    this.isOnline = navigator.onLine;
    this.edgeAvailable = false;
    
    syncService.onStatusChange((status, online) => {
      this.isOnline = online;
    });

    // Check edge availability
    this.checkEdgeAvailability();
  }

  async checkEdgeAvailability() {
    if (!EDGE_GATEWAY_URL) return;
    
    try {
      const response = await axios.get(`${EDGE_GATEWAY_URL}/health`, { timeout: 2000 });
      this.edgeAvailable = response.status === 200;
    } catch (error) {
      this.edgeAvailable = false;
    }
  }

  // ============= POS OPERATIONS =============

  async createOrder(orderData) {
    const token = localStorage.getItem('restin_token');
    const requestId = this.generateRequestId();

    if (this.isOnline) {
      try {
        // Try online first
        const response = await axios.post(
          `${API_URL}/api/pos/orders`,
          orderData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Idempotency-Key': requestId
            }
          }
        );
        return { success: true, data: response.data, mode: 'online' };
      } catch (error) {
        // If online fails, queue it
        console.warn('⚠️ Online request failed, queuing offline');
        return await this.queueOrderOffline(orderData, requestId);
      }
    } else {
      // Offline mode - queue immediately
      return await this.queueOrderOffline(orderData, requestId);
    }
  }

  async queueOrderOffline(orderData, requestId) {
    const command = await offlineDB.addCommand({
      request_id: requestId,
      entity_type: 'pos_order',
      action: 'create',
      payload: orderData
    });

    // Generate optimistic response
    const optimisticOrder = {
      id: `offline_${requestId}`,
      ...orderData,
      status: 'OPEN',
      totals: {
        subtotal: 0,
        tax: 0,
        grand_total: 0
      },
      _offline: true,
      _pending_sync: true
    };

    return { 
      success: true, 
      data: { order: optimisticOrder }, 
      mode: 'offline',
      queued: true
    };
  }

  async addOrderItem(orderId, itemData) {
    const token = localStorage.getItem('restin_token');
    const requestId = this.generateRequestId();

    if (this.isOnline && !orderId.startsWith('offline_')) {
      try {
        const response = await axios.post(
          `${API_URL}/api/pos/orders/${orderId}/items`,
          itemData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Idempotency-Key': requestId
            }
          }
        );
        return { success: true, data: response.data, mode: 'online' };
      } catch (error) {
        return await this.queueOrderItemOffline(orderId, itemData, requestId);
      }
    } else {
      return await this.queueOrderItemOffline(orderId, itemData, requestId);
    }
  }

  async queueOrderItemOffline(orderId, itemData, requestId) {
    const command = await offlineDB.addCommand({
      request_id: requestId,
      entity_type: 'pos_order_item',
      action: 'add',
      payload: { ...itemData, order_id: orderId }
    });

    // Optimistic response
    const optimisticItem = {
      id: `offline_item_${requestId}`,
      ...itemData,
      state: 'HELD',
      pricing: {
        unit_price: itemData.unit_price || 0,
        line_total: (itemData.unit_price || 0) * (itemData.qty || 1)
      },
      _offline: true,
      _pending_sync: true
    };

    return { 
      success: true, 
      data: { item: optimisticItem }, 
      mode: 'offline',
      queued: true
    };
  }

  async processPayment(orderId, paymentData) {
    const token = localStorage.getItem('restin_token');
    const requestId = this.generateRequestId();

    if (this.isOnline && !orderId.startsWith('offline_')) {
      try {
        const response = await axios.post(
          `${API_URL}/api/pos/orders/${orderId}/payments`,
          paymentData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Idempotency-Key': requestId
            }
          }
        );
        return { success: true, data: response.data, mode: 'online' };
      } catch (error) {
        return await this.queuePaymentOffline(orderId, paymentData, requestId);
      }
    } else {
      return await this.queuePaymentOffline(orderId, paymentData, requestId);
    }
  }

  async queuePaymentOffline(orderId, paymentData, requestId) {
    const command = await offlineDB.addCommand({
      request_id: requestId,
      entity_type: 'pos_payment',
      action: 'process',
      payload: { ...paymentData, order_id: orderId }
    });

    return { 
      success: true, 
      data: { payment: { ...paymentData, status: 'PENDING_SYNC' } }, 
      mode: 'offline',
      queued: true
    };
  }

  // ============= KDS OPERATIONS =============

  async bumpTicket(stationKey, ticketId) {
    const token = localStorage.getItem('restin_token');
    const requestId = this.generateRequestId();

    if (this.isOnline) {
      try {
        const response = await axios.post(
          `${API_URL}/api/kds/runtime/${stationKey}/tickets/${ticketId}/bump`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Idempotency-Key': requestId
            }
          }
        );
        return { success: true, data: response.data, mode: 'online' };
      } catch (error) {
        return await this.queueKDSBumpOffline(stationKey, ticketId, requestId);
      }
    } else {
      return await this.queueKDSBumpOffline(stationKey, ticketId, requestId);
    }
  }

  async queueKDSBumpOffline(stationKey, ticketId, requestId) {
    const command = await offlineDB.addCommand({
      request_id: requestId,
      entity_type: 'kds_bump',
      action: 'bump',
      payload: { station_key: stationKey, ticket_id: ticketId }
    });

    return { 
      success: true, 
      data: { ticket: { id: ticketId, status: 'PENDING_SYNC' } }, 
      mode: 'offline',
      queued: true
    };
  }

  // ============= HELPERS =============

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getQueuedCommands() {
    return await offlineDB.getPendingCommands();
  }

  async clearSyncedCommands() {
    // Clear commands older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    // Implementation would query and delete old SYNCED commands
  }
}

const offlineAPI = new OfflineAPI();

export default offlineAPI;
