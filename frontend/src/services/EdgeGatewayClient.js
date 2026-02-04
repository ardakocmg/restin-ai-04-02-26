/**
 * Edge Gateway Client - Frontend connection to venue Edge Gateway
 */

import axios from 'axios';

const EDGE_GATEWAY_URL = process.env.REACT_APP_EDGE_GATEWAY_URL || 'http://localhost:8080';
const EDGE_WS_URL = process.env.REACT_APP_EDGE_WS_URL || 'ws://localhost:8081';

class EdgeGatewayClient {
  constructor() {
    this.edgeUrl = EDGE_GATEWAY_URL;
    this.wsUrl = EDGE_WS_URL;
    this.ws = null;
    this.isEdgeAvailable = false;
    this.deviceId = this.getOrCreateDeviceId();
    this.listeners = [];
  }

  // ============= CONNECTION =============

  async checkEdgeAvailability() {
    // Explicitly check if the Edge Gateway URL is provided and not the default localhost during dev
    const isExplicitlyEnabled = process.env.REACT_APP_EDGE_GATEWAY_URL && process.env.REACT_APP_EDGE_GATEWAY_URL !== '';
    const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';

    // Skip Edge Gateway check if not explicitly configured or in a dev environment that doesn't need it
    if (!isExplicitlyEnabled || (isDevelopment && !process.env.REACT_APP_EDGE_GATEWAY_URL)) {
      this.isEdgeAvailable = false;
      return false;
    }

    try {
      const response = await axios.get(`${this.edgeUrl}/health`, { timeout: 3000 });
      this.isEdgeAvailable = response.status === 200;
      return this.isEdgeAvailable;
    } catch (error) {
      // Be extra silent in the console for development
      this.isEdgeAvailable = false;
      return false;
    }
  }

  connectWebSocket() {
    if (this.ws) return;

    console.log('🔌 Connecting to Edge Gateway WebSocket...');

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('✅ Connected to Edge Gateway');
        this.registerDevice();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ WebSocket message parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('🔌 Disconnected from Edge Gateway');
        this.ws = null;

        // Attempt reconnect after 5 seconds
        setTimeout(() => {
          this.connectWebSocket();
        }, 5000);
      };
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
    }
  }

  registerDevice() {
    const deviceInfo = {
      deviceName: this.getDeviceName(),
      deviceType: this.getDeviceType(),
    };

    this.sendMessage({
      type: 'REGISTER',
      deviceId: this.deviceId,
      payload: deviceInfo,
    });
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'HEARTBEAT',
          deviceId: this.deviceId,
        });
      }
    }, 30000); // Every 30 seconds
  }

  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not connected');
    }
  }

  handleMessage(data) {
    const { type } = data;

    switch (type) {
      case 'REGISTERED':
        console.log('✅ Device registered with Edge Gateway');
        break;

      case 'HEARTBEAT_ACK':
        // Silent acknowledgment
        break;

      case 'COMMAND_QUEUED':
        console.log('📥 Command queued:', data.requestId);
        this.notifyListeners('command_queued', data);
        break;

      case 'SYNC_STATUS':
        console.log('🔄 Sync status:', data.stats);
        this.notifyListeners('sync_status', data.stats);
        break;

      default:
        console.log('📨 Unknown message type:', type);
    }
  }

  // ============= CACHE OPERATIONS =============

  async getMenuFromEdge(venueId) {
    try {
      const response = await axios.get(`${this.edgeUrl}/api/cache/menu/${venueId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getProductsFromEdge(venueId) {
    try {
      const response = await axios.get(`${this.edgeUrl}/api/cache/products/${venueId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getUsersFromEdge(venueId) {
    try {
      const response = await axios.get(`${this.edgeUrl}/api/cache/users/${venueId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  // ============= COMMAND QUEUE =============

  async queueCommandViaEdge(type, payload) {
    try {
      const response = await axios.post(`${this.edgeUrl}/api/queue/enqueue`, {
        type,
        payload,
        device_id: this.deviceId,
      });
      return response.data;
    } catch (error) {
      console.error('❌ Failed to queue via Edge:', error);
      throw error;
    }
  }

  async getQueueStats() {
    try {
      const response = await axios.get(`${this.edgeUrl}/api/queue/stats`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async syncNow() {
    try {
      const response = await axios.post(`${this.edgeUrl}/api/queue/sync`);
      return response.data;
    } catch (error) {
      console.error('❌ Sync failed:', error);
      return null;
    }
  }

  // ============= HELPERS =============

  getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('edge_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('edge_device_id', deviceId);
    }
    return deviceId;
  }

  getDeviceName() {
    return localStorage.getItem('device_name') || `Device ${this.deviceId.substr(-8)}`;
  }

  getDeviceType() {
    // Detect device type
    const ua = navigator.userAgent;
    if (/iPad/.test(ua)) return 'ipad';
    if (/iPhone/.test(ua)) return 'iphone';
    if (/Android/.test(ua)) return 'android';
    return 'desktop';
  }

  onMessage(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(cb => cb(event, data));
  }

  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

const edgeGatewayClient = new EdgeGatewayClient();

export default edgeGatewayClient;
