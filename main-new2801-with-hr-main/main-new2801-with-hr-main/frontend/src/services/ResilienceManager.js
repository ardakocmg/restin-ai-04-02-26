/**
 * Resilience Manager - Orchestrates offline-first architecture
 * Manages: Cloud -> Edge -> Device -> Mesh failover
 */

import offlineAPI from './OfflineAPI';
import syncService from './SyncService';
import edgeGatewayClient from './EdgeGatewayClient';
import deviceMesh from './DeviceMesh';
import offlineDB from './OfflineDB';

class ResilienceManager {
  constructor() {
    this.mode = 'unknown'; // 'online' | 'edge' | 'device' | 'mesh'
    this.cloudReachable = false;
    this.edgeReachable = false;
    this.listeners = [];
  }

  async init() {
    console.log('🛡️ Initializing Resilience Manager...');

    // Initialize offline DB
    await offlineDB.init();

    // Check connectivity
    await this.checkConnectivity();

    // Start appropriate services based on mode
    this.startServices();

    // Periodic connectivity check
    setInterval(() => {
      this.checkConnectivity();
    }, 30000); // Every 30 seconds

    console.log('✅ Resilience Manager initialized - Mode:', this.mode);
  }

  async checkConnectivity() {
    // Check cloud reachability
    this.cloudReachable = navigator.onLine && await this.checkCloudReachability();

    // Check edge gateway reachability
    this.edgeReachable = await edgeGatewayClient.checkEdgeAvailability();

    // Determine mode
    const previousMode = this.mode;
    
    if (this.cloudReachable) {
      this.mode = 'online';
    } else if (this.edgeReachable) {
      this.mode = 'edge';
    } else if (deviceMesh.meshActive && deviceMesh.peers.size > 0) {
      this.mode = 'mesh';
    } else {
      this.mode = 'device';
    }

    // Mode transition
    if (previousMode !== this.mode && previousMode !== 'unknown') {
      console.log(`🔄 Mode transition: ${previousMode} -> ${this.mode}`);
      this.onModeChange(previousMode, this.mode);
    }

    this.notifyListeners({
      mode: this.mode,
      cloudReachable: this.cloudReachable,
      edgeReachable: this.edgeReachable,
    });
  }

  async checkCloudReachability() {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  startServices() {
    switch (this.mode) {
      case 'online':
        // Full online mode
        syncService.startSync();
        break;

      case 'edge':
        // Edge gateway mode
        edgeGatewayClient.connectWebSocket();
        syncService.startSync(); // Still sync via edge
        break;

      case 'device':
        // Device offline mode
        syncService.stopSync();
        break;

      case 'mesh':
        // Device mesh mode
        deviceMesh.start();
        break;

      default:
        console.warn('⚠️ Unknown mode:', this.mode);
    }
  }

  onModeChange(from, to) {
    console.log(`📊 Resilience mode changed: ${from} -> ${to}`);

    // Transition logic
    if (to === 'online' && from !== 'online') {
      // Back online - trigger sync
      console.log('☁️ Cloud connection restored - syncing...');
      syncService.forceSyncNow();
    }

    if (to === 'edge' && from === 'device') {
      // Edge available - connect
      console.log('🌐 Edge gateway available - connecting...');
      edgeGatewayClient.connectWebSocket();
    }

    if (to === 'mesh' && from === 'device') {
      // Activate mesh
      console.log('🔗 Activating device mesh...');
      deviceMesh.start();
    }

    if (to === 'device') {
      // Full offline
      console.log('📱 Operating in full offline mode');
    }
  }

  // ============= OPERATION ROUTING =============

  async executeCommand(type, payload) {
    console.log(`🎯 Executing command (${this.mode} mode):`, type);

    switch (this.mode) {
      case 'online':
        // Direct to cloud
        return await offlineAPI.createOrder(payload);

      case 'edge':
        // Route via edge gateway
        return await edgeGatewayClient.queueCommandViaEdge(type, payload);

      case 'device':
      case 'mesh':
        // Queue locally
        return await offlineAPI.createOrder(payload);

      default:
        throw new Error('Unknown mode');
    }
  }

  // ============= STATUS =============

  getStatus() {
    return {
      mode: this.mode,
      cloudReachable: this.cloudReachable,
      edgeReachable: this.edgeReachable,
      meshActive: deviceMesh.meshActive,
      isHub: deviceMesh.isHub,
      peerCount: deviceMesh.peers.size,
    };
  }

  getCapabilities() {
    const capabilities = {
      online: { pos: true, kds: true, inventory: true, reporting: true },
      edge: { pos: true, kds: true, inventory: true, reporting: false },
      device: { pos: true, kds: false, inventory: false, reporting: false },
      mesh: { pos: true, kds: true, inventory: false, reporting: false },
    };

    return capabilities[this.mode] || {};
  }

  // ============= LISTENERS =============

  onStatusChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(status) {
    this.listeners.forEach(cb => cb(status));
  }
}

const resilienceManager = new ResilienceManager();

export default resilienceManager;
