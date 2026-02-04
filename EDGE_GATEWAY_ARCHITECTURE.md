"""
Edge Gateway Design - Venue-Level Mini Server

DEPLOYMENT OPTIONS:
1. Docker container on venue Raspberry Pi/NUC
2. Embedded in venue router (advanced)
3. Dedicated edge device

RESPONSIBILITIES:
- Local cache (read models: menu, users, config)
- Offline command queue relay
- Print job proxy
- KDS event bus (offline mode)
- Device discovery & health checks
- Security gate (rate limit, anomaly detection)

IMPLEMENTATION: Node.js/Express (lightweight, easy deployment)

FILE: edge-gateway/server.js
"""

# Edge Gateway Architecture Document

## Tech Stack
- **Runtime:** Node.js 20+ (LTS)
- **Framework:** Express.js
- **Database:** SQLite (local embedded, fast)
- **Queue:** In-memory + SQLite persistence
- **Discovery:** mDNS (Bonjour/Avahi)
- **Security:** JWT verification + device certificates

## Components

### 1. Cache Manager
```javascript
class CacheManager {
  constructor(sqlite) {
    this.db = sqlite;
    this.cache = new Map();
  }

  async cacheMenuItem(venueId, menuSnapshot) {
    // Cache menu snapshot
    const key = `menu:${venueId}:${menuSnapshot.snapshot_id}`;
    await this.db.run(
      'INSERT OR REPLACE INTO cache (key, data, expires_at) VALUES (?, ?, ?)',
      [key, JSON.stringify(menuSnapshot), Date.now() + 3600000]
    );
  }

  async getMenuCache(venueId) {
    const row = await this.db.get(
      'SELECT data FROM cache WHERE key LIKE ? AND expires_at > ?',
      [`menu:${venueId}:%`, Date.now()]
    );
    return row ? JSON.parse(row.data) : null;
  }
}
```

### 2. Command Queue
```javascript
class CommandQueue {
  constructor(sqlite) {
    this.db = sqlite;
    this.queue = [];
  }

  async enqueue(command) {
    // Persist to SQLite
    await this.db.run(
      'INSERT INTO command_queue (request_id, type, payload, status) VALUES (?, ?, ?, ?)',
      [command.request_id, command.type, JSON.stringify(command.payload), 'PENDING']
    );
    
    this.queue.push(command);
    
    // Trigger sync if cloud is available
    if (this.isCloudReachable()) {
      await this.syncToCloud();
    }
  }

  async syncToCloud() {
    // Replay commands to cloud API
    const pending = await this.db.all(
      'SELECT * FROM command_queue WHERE status = ?',
      ['PENDING']
    );

    for (const cmd of pending) {
      try {
        await this.replayToCloud(cmd);
        await this.db.run(
          'UPDATE command_queue SET status = ?, synced_at = ? WHERE id = ?',
          ['SYNCED', new Date().toISOString(), cmd.id]
        );
      } catch (error) {
        console.error('Replay failed:', cmd.request_id, error);
      }
    }
  }
}
```

### 3. Device Discovery
```javascript
class DeviceDiscovery {
  constructor() {
    this.devices = new Map();
    this.mdns = require('multicast-dns')();
  }

  startDiscovery() {
    // Advertise edge gateway
    this.mdns.on('query', (query) => {
      if (query.questions.some(q => q.name === 'restin-edge.local')) {
        this.mdns.respond({
          answers: [{
            name: 'restin-edge.local',
            type: 'A',
            data: this.getLocalIP()
          }]
        });
      }
    });

    // Listen for device announcements
    this.mdns.on('response', (response) => {
      // Register discovered devices
      response.answers.forEach(answer => {
        if (answer.name.startsWith('restin-device-')) {
          this.devices.set(answer.name, {
            ip: answer.data,
            lastSeen: Date.now()
          });
        }
      });
    });
  }
}
```

### 4. Print Proxy
```javascript
class PrintProxy {
  constructor(commandQueue) {
    this.queue = commandQueue;
    this.printers = new Map();
  }

  async handlePrintJob(job) {
    // Queue print job (with retry)
    await this.queue.enqueue({
      type: 'print_job',
      payload: job,
      request_id: this.generateRequestId()
    });

    // Try to print locally if printer available
    if (this.printers.size > 0) {
      await this.sendToPrinter(job);
    }
  }

  async sendToPrinter(job) {
    // ESC/POS command generation
    // Send to network printer or USB
    // Implementation depends on printer type
  }
}
```

## Deployment

### Docker Compose
```yaml
version: '3.8'
services:
  edge-gateway:
    image: node:20-alpine
    volumes:
      - ./edge-gateway:/app
      - edge-data:/data
    ports:
      - "8080:8080"
    environment:
      - CLOUD_API_URL=https://observe-hub-1.preview.emergentagent.com
      - VENUE_ID=venue-caviar-bull
    restart: unless-stopped
    network_mode: host  # For mDNS discovery

volumes:
  edge-data:
```

### Systemd Service
```ini
[Unit]
Description=Restin.ai Edge Gateway
After=network.target

[Service]
Type=simple
User=restin
WorkingDirectory=/opt/restin-edge
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

## Security

### Device Authentication
- mTLS client certificates
- Device pairing codes (6-digit, expires 15min)
- Rate limiting (100 req/min per device)
- Anomaly detection (unusual patterns alert)

### Offline Auth
- Signed auth snapshots (TTL: 8 hours)
- Device-specific grants (limited permissions)
- Audit all offline operations

## Monitoring

### Health Checks
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    cloud_reachable: checkCloudReachability(),
    queue_size: commandQueue.size(),
    devices_online: deviceDiscovery.devices.size,
    uptime: process.uptime()
  });
});
```

### Metrics
- Queue depth
- Sync lag (time since last successful sync)
- Device count
- Print job success rate
- Cache hit rate

## Notes
This is an ARCHITECTURAL DESIGN DOCUMENT.
Actual implementation would be in a separate `/edge-gateway` directory.
For MVP, we focus on client-side offline (PWA) first.
Edge gateway is Phase 2-3 enhancement.
