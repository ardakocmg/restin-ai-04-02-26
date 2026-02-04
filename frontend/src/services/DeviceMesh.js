/**
 * Device Mesh Client - Enhanced with WebSocket mesh protocol
 */

import offlineDB from './OfflineDB';

const MESH_WS_URL = process.env.REACT_APP_EDGE_WS_URL?.replace('8081', '8082') || 'ws://localhost:8082';

class DeviceMesh {
  constructor() {
    this.isHub = false;
    this.peers = new Map();
    this.hubElectionScore = 0;
    this.deviceId = this.getDeviceId();
    this.meshActive = false;
    this.replicationFactor = 3;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // ============= CONNECTION =============

  connect() {
    if (this.ws) return;

    console.log('🔗 Connecting to Device Mesh...');

    try {
      this.ws = new WebSocket(MESH_WS_URL);

      this.ws.onopen = () => {
        console.log('✅ Connected to Device Mesh');
        this.reconnectAttempts = 0;
        this.joinMesh();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ Mesh message parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ Mesh WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('🔌 Disconnected from Device Mesh');
        this.ws = null;
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('❌ Mesh connection failed:', error);
      this.attemptReconnect();
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 Reconnecting to mesh in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  joinMesh() {
    const deviceInfo = {
      deviceName: this.getDeviceName(),
      deviceType: this.getDeviceType(),
      score: this.calculateScore(),
    };

    this.sendMessage({
      type: 'MESH_JOIN',
      deviceId: this.deviceId,
      payload: deviceInfo,
    });
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'MESH_HEARTBEAT',
          deviceId: this.deviceId,
          payload: {
            score: this.calculateScore(),
            queueSize: this.getLocalQueueSize(),
          },
        });
      }
    }, 30000); // Every 30 seconds
  }

  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ Mesh WebSocket not connected');
    }
  }

  handleMessage(data) {
    const { type } = data;

    switch (type) {
      case 'MESH_JOINED':
        console.log('✅ Joined device mesh:', data.meshId);
        this.meshActive = true;
        break;

      case 'PEER_LIST_UPDATE':
        this.updatePeerList(data.peers);
        break;

      case 'HUB_ELECTED':
        this.handleHubElection(data);
        break;

      case 'REPLICATE_COMMAND':
        this.handleReplication(data);
        break;

      case 'MESH_HEARTBEAT_ACK':
        // Silent acknowledgment
        break;

      case 'REPLICATION_ACK':
        console.log(`✅ Command replicated to ${data.deliveredTo} devices`);
        break;

      default:
        console.log('📨 Unknown mesh message:', type);
    }
  }

  updatePeerList(peers) {
    this.peers.clear();
    peers.forEach(peer => {
      if (peer.deviceId !== this.deviceId) {
        this.peers.set(peer.deviceId, peer);
      }
    });
    console.log(`📊 Peer list updated: ${this.peers.size} peers`);
  }

  handleHubElection(data) {
    const wasHub = this.isHub;
    this.isHub = data.hubDeviceId === this.deviceId;

    if (this.isHub && !wasHub) {
      console.log('🎖️ This device elected as hub');
      this.onBecomeHub();
    } else if (!this.isHub && wasHub) {
      console.log('👋 Hub role transferred to:', data.hubDeviceId);
      this.onLoseHub();
    }
  }

  // ============= HUB ELECTION =============

  calculateScore() {
    let score = 0;

    // Device type weight
    const deviceType = this.getDeviceType();
    if (deviceType === 'desktop' || deviceType === 'kiosk') score += 1000;
    else if (deviceType === 'ipad') {
      if (this.isCharging()) score += 500;
      else score += 250;
    } else if (deviceType === 'iphone') score += 100;

    // Uptime weight
    const sessionStart = localStorage.getItem('session_start');
    if (sessionStart) {
      const uptimeMinutes = (Date.now() - parseInt(sessionStart)) / 60000;
      score += Math.min(uptimeMinutes, 100);
    }

    // Network quality
    if (navigator.connection) {
      const downlink = navigator.connection.downlink || 1;
      score += Math.min(downlink * 10, 100);
    }

    // Battery level
    const batteryLevel = parseInt(localStorage.getItem('battery_level') || '100');
    score += batteryLevel / 2;

    this.hubElectionScore = score;
    return score;
  }

  onBecomeHub() {
    console.log('📡 Hub mode activated');
    localStorage.setItem('is_mesh_hub', 'true');
  }

  onLoseHub() {
    console.log('📴 Hub mode deactivated');
    localStorage.setItem('is_mesh_hub', 'false');
  }

  // ============= QUEUE REPLICATION =============

  async replicateCommand(command) {
    if (!this.meshActive || this.peers.size === 0) return false;

    const targetDevices = this.selectReplicationTargets();

    this.sendMessage({
      type: 'REPLICATE_COMMAND',
      deviceId: this.deviceId,
      payload: {
        command,
        targetDevices,
      },
    });

    console.log(`📡 Command replication requested for ${targetDevices.length} devices`);
    return true;
  }

  selectReplicationTargets() {
    const peers = Array.from(this.peers.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, this.replicationFactor - 1);

    return peers.map(p => p.deviceId);
  }

  async handleReplication(data) {
    const { command, sourceDevice } = data;

    // Store replicated command
    await offlineDB.addCommand({
      ...command,
      replicated: true,
      source_device: sourceDevice,
    });

    console.log('📥 Command replicated from peer:', command.request_id);

    // Send ACK
    this.sendMessage({
      type: 'SYNC_ACK',
      deviceId: this.deviceId,
      payload: {
        request_id: command.request_id,
        status: 'RECEIVED',
      },
    });
  }

  // ============= HELPERS =============

  getDeviceId() {
    let deviceId = localStorage.getItem('device_mesh_id');
    if (!deviceId) {
      deviceId = `mesh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_mesh_id', deviceId);
    }
    return deviceId;
  }

  getDeviceName() {
    return localStorage.getItem('device_name') || `Device ${this.deviceId.substr(-8)}`;
  }

  getDeviceType() {
    const ua = navigator.userAgent;
    if (/iPad/.test(ua)) return 'ipad';
    if (/iPhone/.test(ua)) return 'iphone';
    if (/Android/.test(ua)) return 'android';
    return 'desktop';
  }

  isCharging() {
    return localStorage.getItem('is_charging') === 'true';
  }

  getLocalQueueSize() {
    // This would be populated by OfflineDB
    return 0;
  }

  // ============= LIFECYCLE =============

  start() {
    console.log('🔗 Device mesh starting...');
    this.meshActive = true;

    // Track session start
    if (!localStorage.getItem('session_start')) {
      localStorage.setItem('session_start', Date.now().toString());
    }

    // Track battery status
    if (navigator.getBattery) {
      navigator.getBattery().then(battery => {
        localStorage.setItem('is_charging', battery.charging.toString());
        localStorage.setItem('battery_level', Math.floor(battery.level * 100).toString());
        
        battery.addEventListener('chargingchange', () => {
          localStorage.setItem('is_charging', battery.charging.toString());
        });
        
        battery.addEventListener('levelchange', () => {
          localStorage.setItem('battery_level', Math.floor(battery.level * 100).toString());
        });
      });
    }

    // Connect to mesh
    this.connect();
  }

  stop() {
    console.log('📴 Device mesh stopping...');
    this.meshActive = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ============= STATUS =============

  getStatus() {
    return {
      active: this.meshActive,
      connected: this.ws?.readyState === WebSocket.OPEN,
      isHub: this.isHub,
      peerCount: this.peers.size,
      score: this.hubElectionScore,
    };
  }
}

const deviceMesh = new DeviceMesh();

export default deviceMesh;
