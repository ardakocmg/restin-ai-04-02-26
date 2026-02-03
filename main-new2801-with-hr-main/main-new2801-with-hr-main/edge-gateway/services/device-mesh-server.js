/**
 * Device Mesh WebSocket Server - Peer-to-Peer Communication
 * Runs within Edge Gateway for device mesh coordination
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class DeviceMeshServer {
  constructor(port = 8082) {
    this.port = port;
    this.wss = null;
    this.devices = new Map(); // deviceId -> { ws, info }
    this.hubDevice = null;
  }

  start() {
    this.wss = new WebSocket.Server({ port: this.port });

    console.log(`🔗 Device Mesh server started on port ${this.port}`);

    this.wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      console.log('🔗 Device Mesh client connected:', clientIp);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data, clientIp);
        } catch (error) {
          console.error('❌ Mesh message parse error:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ Mesh WebSocket error:', error);
      });
    });

    // Periodic hub election
    this.electionInterval = setInterval(() => {
      this.electHub();
    }, 60000); // Every minute
  }

  handleMessage(ws, data, clientIp) {
    const { type, deviceId, payload } = data;

    switch (type) {
      case 'MESH_JOIN':
        this.handleMeshJoin(ws, deviceId, payload, clientIp);
        break;

      case 'MESH_HEARTBEAT':
        this.handleHeartbeat(ws, deviceId, payload);
        break;

      case 'REPLICATE_COMMAND':
        this.handleReplication(ws, deviceId, payload);
        break;

      case 'SYNC_ACK':
        this.handleSyncAck(ws, deviceId, payload);
        break;

      case 'HUB_CLAIM':
        this.handleHubClaim(ws, deviceId, payload);
        break;

      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  handleMeshJoin(ws, deviceId, payload, clientIp) {
    const { deviceName, deviceType, score } = payload;

    // Register device in mesh
    this.devices.set(deviceId, {
      ws,
      info: {
        deviceId,
        deviceName,
        deviceType,
        ip: clientIp,
        score,
        joinedAt: Date.now(),
        lastHeartbeat: Date.now(),
      },
    });

    console.log(`🔗 Device joined mesh: ${deviceId} (${deviceName}) - Score: ${score}`);

    // Broadcast peer list to all devices
    this.broadcastPeerList();

    // Send welcome message
    this.send(ws, {
      type: 'MESH_JOINED',
      deviceId,
      meshId: 'edge-mesh-001',
      peerCount: this.devices.size - 1,
      timestamp: new Date().toISOString(),
    });

    // Trigger hub election
    setTimeout(() => this.electHub(), 1000);
  }

  handleHeartbeat(ws, deviceId, payload) {
    const device = this.devices.get(deviceId);
    if (device) {
      device.info.lastHeartbeat = Date.now();
      device.info.score = payload.score || device.info.score;

      this.send(ws, {
        type: 'MESH_HEARTBEAT_ACK',
        deviceId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleReplication(ws, deviceId, payload) {
    const { command, targetDevices } = payload;

    console.log(`📡 Replicating command from ${deviceId} to ${targetDevices.length} devices`);

    // Forward command to target devices
    targetDevices.forEach(targetId => {
      const targetDevice = this.devices.get(targetId);
      if (targetDevice) {
        this.send(targetDevice.ws, {
          type: 'REPLICATE_COMMAND',
          command,
          sourceDevice: deviceId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // ACK back to sender
    this.send(ws, {
      type: 'REPLICATION_ACK',
      requestId: command.request_id,
      deliveredTo: targetDevices.length,
      timestamp: new Date().toISOString(),
    });
  }

  handleSyncAck(ws, deviceId, payload) {
    console.log(`✅ Sync ACK from ${deviceId} for request ${payload.request_id}`);
    // Could implement tracking here
  }

  handleHubClaim(ws, deviceId, payload) {
    const { score } = payload;
    const device = this.devices.get(deviceId);
    
    if (device) {
      device.info.score = score;
      this.electHub();
    }
  }

  handleDisconnect(ws) {
    // Find and remove device
    for (const [deviceId, device] of this.devices.entries()) {
      if (device.ws === ws) {
        console.log(`👋 Device left mesh: ${deviceId}`);
        this.devices.delete(deviceId);
        
        // If hub disconnected, re-elect
        if (this.hubDevice === deviceId) {
          this.hubDevice = null;
          this.electHub();
        }
        
        // Broadcast updated peer list
        this.broadcastPeerList();
        break;
      }
    }
  }

  // ============= HUB ELECTION =============

  electHub() {
    if (this.devices.size === 0) {
      this.hubDevice = null;
      return;
    }

    // Find device with highest score
    let highestScore = -1;
    let highestDeviceId = null;

    for (const [deviceId, device] of this.devices.entries()) {
      if (device.info.score > highestScore) {
        highestScore = device.info.score;
        highestDeviceId = deviceId;
      }
    }

    const previousHub = this.hubDevice;
    this.hubDevice = highestDeviceId;

    if (previousHub !== this.hubDevice) {
      console.log(`🎖️ New hub elected: ${this.hubDevice} (Score: ${highestScore})`);
      
      // Notify all devices about new hub
      this.broadcast({
        type: 'HUB_ELECTED',
        hubDeviceId: this.hubDevice,
        score: highestScore,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ============= BROADCAST =============

  broadcastPeerList() {
    const peerList = Array.from(this.devices.values()).map(device => ({
      deviceId: device.info.deviceId,
      deviceName: device.info.deviceName,
      deviceType: device.info.deviceType,
      score: device.info.score,
      isHub: device.info.deviceId === this.hubDevice,
    }));

    this.broadcast({
      type: 'PEER_LIST_UPDATE',
      peers: peerList,
      timestamp: new Date().toISOString(),
    });
  }

  broadcast(message) {
    this.devices.forEach(device => {
      this.send(device.ws, message);
    });
  }

  send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, error) {
    this.send(ws, {
      type: 'ERROR',
      message: error,
      timestamp: new Date().toISOString(),
    });
  }

  // ============= CLEANUP =============

  cleanupStaleDevices() {
    const now = Date.now();
    const staleThreshold = 90000; // 90 seconds

    for (const [deviceId, device] of this.devices.entries()) {
      if (now - device.info.lastHeartbeat > staleThreshold) {
        console.log(`🧹 Removing stale device: ${deviceId}`);
        device.ws.close();
        this.devices.delete(deviceId);
      }
    }
  }

  stop() {
    if (this.electionInterval) {
      clearInterval(this.electionInterval);
    }
    if (this.wss) {
      this.wss.close();
      console.log('✅ Device Mesh server stopped');
    }
  }
}

module.exports = DeviceMeshServer;
