"""
Device Mesh - Peer-to-Peer Redundancy Architecture

GOAL: Active devices act as backups for each other (secondary to Edge)

CONSTRAINTS:
- iOS limitations (no background server)
- Best-effort only (not authoritative)
- WebSocket-based (not WebRTC - iOS issues)

APPROACH: Temporary Hub Election + Queue Replication

IMPLEMENTATION: Client-side WebSocket mesh via Socket.IO
"""

# Device Mesh Architecture

## Overview

When Edge is unavailable, one device temporarily becomes "hub" to coordinate:
- Queue replication (N copies across devices)
- Print job relay
- KDS state sync

## Hub Election

### Selection Criteria (Priority Order)
1. **Device Type:** Kiosk > iPad (charging) > iPad (mobile) > iPhone
2. **Uptime:** Longest running session
3. **Network Quality:** Best WiFi signal
4. **Cache Freshness:** Most recent sync
5. **Battery:** Charging > High battery

### Election Algorithm
```javascript
class HubElection {
  constructor(deviceId, deviceInfo) {
    this.deviceId = deviceId;
    this.deviceInfo = deviceInfo;
    this.peers = new Map();
    this.isHub = false;
  }

  calculateScore() {
    let score = 0;
    
    // Device type weight
    if (this.deviceInfo.type === 'kiosk') score += 1000;
    else if (this.deviceInfo.type === 'ipad' && this.deviceInfo.charging) score += 500;
    else if (this.deviceInfo.type === 'ipad') score += 250;
    
    // Uptime weight
    score += Math.min(this.deviceInfo.uptime / 60, 100); // Max 100 points
    
    // Network quality
    score += this.deviceInfo.wifiQuality * 10; // 0-100 range
    
    // Battery (if applicable)
    if (this.deviceInfo.charging) score += 50;
    else score += this.deviceInfo.batteryLevel / 2;
    
    return score;
  }

  async electHub() {
    const myScore = this.calculateScore();
    let highestScore = myScore;
    let highestDevice = this.deviceId;

    // Compare with peers
    for (const [peerId, peerInfo] of this.peers.entries()) {
      if (peerInfo.score > highestScore) {
        highestScore = peerInfo.score;
        highestDevice = peerId;
      }
    }

    const wasHub = this.isHub;
    this.isHub = (highestDevice === this.deviceId);

    if (this.isHub && !wasHub) {
      console.log('🎖️ This device elected as temporary hub');
      this.onBecomeHub();
    } else if (!this.isHub && wasHub) {
      console.log('👋 Hub role transferred to:', highestDevice);
      this.onLoseHub();
    }

    return this.isHub;
  }

  onBecomeHub() {
    // Start accepting queue replications
    // Start coordinating print jobs
    // Become KDS event relay
  }

  onLoseHub() {
    // Stop hub duties
    // Transfer state to new hub
  }
}
```

## Queue Replication

### Replication Factor: 3
Each command is replicated to 3 devices (including origin)

```javascript
class QueueReplicator {
  constructor(deviceMesh, replicationFactor = 3) {
    this.mesh = deviceMesh;
    this.replicationFactor = replicationFactor;
  }

  async replicateCommand(command) {
    const targetDevices = this.selectReplicationTargets();
    
    const promises = targetDevices.map(deviceId => 
      this.sendToDevice(deviceId, {
        type: 'REPLICATE_COMMAND',
        command
      })
    );

    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;

    console.log(`📡 Command replicated to ${successCount}/${targetDevices.length} devices`);
    
    return successCount >= Math.floor(this.replicationFactor / 2) + 1; // Quorum
  }

  selectReplicationTargets() {
    // Select N-1 other devices (most reliable)
    const peers = Array.from(this.mesh.peers.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, this.replicationFactor - 1);
    
    return peers.map(p => p.deviceId);
  }
}
```

## WebSocket Mesh Protocol

### Message Types
```javascript
{
  type: 'HEARTBEAT',
  deviceId: 'device-001',
  score: 850,
  timestamp: '2026-01-27T10:00:00Z'
}

{
  type: 'REPLICATE_COMMAND',
  command: {
    request_id: 'req_123',
    entity_type: 'pos_order',
    payload: {...}
  }
}

{
  type: 'SYNC_ACK',
  request_id: 'req_123',
  status: 'RECEIVED'
}

{
  type: 'HUB_CLAIM',
  deviceId: 'device-002',
  score: 950
}
```

### Connection Management
```javascript
class DeviceMesh {
  constructor(socket) {
    this.socket = socket;
    this.peers = new Map();
    this.heartbeatInterval = null;
  }

  start() {
    // Connect to mesh (via Edge or direct peer)
    this.socket.on('connect', () => {
      console.log('🔗 Connected to device mesh');
      this.startHeartbeat();
    });

    this.socket.on('peer-joined', (peer) => {
      this.peers.set(peer.deviceId, peer);
      console.log('👋 Peer joined:', peer.deviceId);
    });

    this.socket.on('peer-left', (peerId) => {
      this.peers.delete(peerId);
      console.log('👋 Peer left:', peerId);
      
      // Re-elect hub if needed
      if (this.hubElection.isHub && this.peers.size > 0) {
        this.hubElection.electHub();
      }
    });

    this.socket.on('replicate-command', async (command) => {
      await this.handleReplication(command);
    });
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.socket.emit('heartbeat', {
        deviceId: this.deviceId,
        score: this.calculateScore(),
        queueSize: this.queueSize(),
        timestamp: new Date().toISOString()
      });
    }, 5000); // Every 5 seconds
  }

  async handleReplication(command) {
    // Store replicated command
    await offlineDB.addCommand({
      ...command,
      replicated: true,
      source_device: command.deviceId
    });

    // Send ACK
    this.socket.emit('sync-ack', {
      request_id: command.request_id,
      status: 'RECEIVED'
    });
  }
}
```

## Failover Scenarios

### Scenario 1: Cloud Down, Edge Up
- Edge serves as local authority
- All devices → Edge
- Edge queues for cloud
- KDS, Print via Edge

### Scenario 2: Cloud Down, Edge Down
- Device mesh activates
- Hub election
- Best device becomes coordinator
- Queue replication across devices
- Limited operations (policy-based)

### Scenario 3: Cloud Up, Everything Else Down
- Single device directly to cloud
- No redundancy but functional
- Standard online mode

## iOS Considerations

### Background Limitations
- Service worker background fetch (limited to 3min on iOS)
- No true background HTTP server
- WebSocket connections drop when app backgrounded

### Solutions
- Hub role is temporary and transferable
- Mesh is best-effort only
- Primary reliance on Edge gateway (not mesh)
- Mesh provides minutes of redundancy, not hours

## Security

### Mesh Trust
- Only paired devices join mesh
- TLS encryption for WebSocket
- Message signing (HMAC)
- Replay attack prevention (nonce)

### Audit
All mesh operations logged:
```javascript
{
  type: 'MESH_OPERATION',
  source_device: 'device-001',
  target_device: 'device-002',
  operation: 'COMMAND_REPLICATION',
  request_id: 'req_123',
  timestamp: '2026-01-27T10:00:00Z',
  offline_mode: true
}
```

## Implementation Status
- ✅ Architecture designed
- ⏳ Edge gateway (Phase 2)
- ⏳ Device mesh (Phase 3)
- ✅ Client-side offline foundation (Phase 1 - THIS PR)

## Next Steps
1. Deploy Edge gateway Docker container (venue IT setup required)
2. Implement WebSocket mesh client
3. Test failover scenarios
4. Production rollout (per-venue basis)
