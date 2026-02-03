// Offline Queue Manager with Replay Logic
import StorageService from './StorageService';
import axios from 'axios';

class OfflineQueueManager {
  constructor() {
    this.storage = new StorageService();
    this.isReplaying = false;
    this.replayInterval = null;
  }

  async init() {
    await this.storage.init();
    this.setupListeners();
    this.startPeriodicReplay();
  }

  setupListeners() {
    // Network status listeners
    window.addEventListener('online', () => this.onNetworkRestore());
    window.addEventListener('focus', () => this.onAppFocus());
  }

  startPeriodicReplay() {
    // Replay every 30 seconds
    this.replayInterval = setInterval(() => {
      if (navigator.onLine) {
        this.replayQueue();
      }
    }, 30000);
  }

  async enqueue(type, payload) {
    const idempotencyKey = this.generateIdempotencyKey(type, payload);
    
    try {
      await this.storage.addToQueue({
        type,
        payload,
        idempotencyKey
      });
      return idempotencyKey;
    } catch (error) {
      console.error('Failed to enqueue:', error);
      throw error;
    }
  }

  generateIdempotencyKey(type, payload) {
    const timestamp = Date.now();
    const data = JSON.stringify(payload);
    return `${type}-${timestamp}-${this.simpleHash(data)}`;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async onNetworkRestore() {
    console.log('Network restored, replaying queue...');
    await this.replayQueue();
  }

  async onAppFocus() {
    if (navigator.onLine) {
      await this.replayQueue();
    }
  }

  async replayQueue() {
    if (this.isReplaying) return;
    
    this.isReplaying = true;
    
    try {
      const queue = await this.storage.getQueue();
      
      for (const item of queue) {
        try {
          await this.replayItem(item);
          await this.storage.removeFromQueue(item.id);
        } catch (error) {
          console.error(`Failed to replay item ${item.id}:`, error);
          
          // Increment retry count
          item.retryCount = (item.retryCount || 0) + 1;
          
          // Max retries: 5
          if (item.retryCount >= 5) {
            console.error(`Max retries reached for item ${item.id}, removing from queue`);
            await this.storage.removeFromQueue(item.id);
          }
        }
      }
    } finally {
      this.isReplaying = false;
    }
  }

  async replayItem(item) {
    const { type, payload, idempotencyKey } = item;
    const token = localStorage.getItem('restin_token');
    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    
    if (!token) {
      throw new Error('No auth token available');
    }
    
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey
      }
    };
    
    switch (type) {
      case 'CREATE_ORDER':
        await axios.post(`${backendUrl}/api/orders`, payload, config);
        break;
      case 'ADD_ORDER_ITEM':
        await axios.post(`${backendUrl}/api/orders/${payload.order_id}/items`, payload.item, config);
        break;
      case 'SEND_ORDER':
        await axios.post(`${backendUrl}/api/orders/${payload.order_id}/send`, {}, config);
        break;
      default:
        console.warn(`Unknown queue item type: ${type}`);
    }
  }

  destroy() {
    if (this.replayInterval) {
      clearInterval(this.replayInterval);
    }
  }
}

export default OfflineQueueManager;
