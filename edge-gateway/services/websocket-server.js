/**
 * WebSocket Server - Real-time communication with devices
 */

const WebSocket = require('ws');
const db = require('./database');
const config = require('../config');

class WebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // deviceId -> WebSocket
  }

  start() {
    this.wss = new WebSocket.Server({ port: config.edge.wsPort });

    console.log(`🔌 WebSocket server started on port ${config.edge.wsPort}`);

    this.wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      console.log('🔗 WebSocket client connected:', clientIp);

      // Handle authentication
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data, clientIp);
        } catch (error) {
          console.error('❌ WebSocket message parse error:', error);
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        // Find and remove client
        for (const [deviceId, client] of this.clients.entries()) {
          if (client === ws) {
            this.clients.delete(deviceId);
            console.log('👋 WebSocket client disconnected:', deviceId);
            break;
          }
        }
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });
    });
  }

  handleMessage(ws, data, clientIp) {
    const { type, deviceId, payload } = data;

    switch (type) {
      case 'REGISTER':
        this.handleRegister(ws, deviceId, payload, clientIp);
        break;

      case 'HEARTBEAT':
        this.handleHeartbeat(ws, deviceId, payload);
        break;

      case 'QUEUE_COMMAND':
        this.handleQueueCommand(ws, deviceId, payload);
        break;

      case 'SYNC_STATUS':
        this.handleSyncStatus(ws, deviceId);
        break;

      default:
        ws.send(JSON.stringify({ type: 'ERROR', message: `Unknown message type: ${type}` }));
    }
  }

  handleRegister(ws, deviceId, payload, clientIp) {
    const { deviceName, deviceType } = payload;

    // Register device
    db.registerDevice(deviceId, deviceName, deviceType, clientIp);
    this.clients.set(deviceId, ws);

    console.log('✅ Device registered:', deviceId, deviceName);

    ws.send(JSON.stringify({
      type: 'REGISTERED',
      deviceId,
      edgeId: config.cloud.venueId,
      timestamp: new Date().toISOString(),
    }));
  }

  handleHeartbeat(ws, deviceId, payload) {
    db.updateDeviceLastSeen(deviceId);

    ws.send(JSON.stringify({
      type: 'HEARTBEAT_ACK',
      deviceId,
      timestamp: new Date().toISOString(),
    }));
  }

  handleQueueCommand(ws, deviceId, payload) {
    const { commandType, commandPayload } = payload;

    // Queue command via command queue service
    const commandQueue = require('./command-queue');
    const result = commandQueue.enqueue(commandType, commandPayload, deviceId);

    ws.send(JSON.stringify({
      type: 'COMMAND_QUEUED',
      requestId: result.requestId,
      commandId: result.commandId,
      timestamp: new Date().toISOString(),
    }));
  }

  handleSyncStatus(ws, deviceId) {
    const commandQueue = require('./command-queue');
    const stats = commandQueue.getStats();

    ws.send(JSON.stringify({
      type: 'SYNC_STATUS',
      stats,
      timestamp: new Date().toISOString(),
    }));
  }

  broadcast(message) {
    this.clients.forEach((ws, deviceId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  sendToDevice(deviceId, message) {
    const ws = this.clients.get(deviceId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  stop() {
    if (this.wss) {
      this.wss.close();
      console.log('✅ WebSocket server stopped');
    }
  }
}

module.exports = new WebSocketServer();
