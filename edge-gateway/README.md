# Restin.ai Edge Gateway

## Overview

Venue-level edge server that provides offline resilience for POS, KDS, and Inventory operations.

## Features

- **Local Cache**: Menu, products, users cached locally for offline access
- **Command Queue**: Offline transactions queued and synced when online
- **Device Discovery**: mDNS-based automatic device discovery on LAN
- **WebSocket Communication**: Real-time device-to-edge communication
- **Print Proxy**: Local print job queuing and relay
- **Idempotent Sync**: Prevents duplicate operations when replaying offline commands

## Architecture

```
┌─────────────────┐
│   Cloud API     │
│  (FastAPI)      │
└────────┬────────┘
         │
         │ (when online)
         │
┌────────▼────────┐
│  Edge Gateway   │  <-- THIS COMPONENT
│   (Node.js)     │
└────────┬────────┘
         │
         │ LAN
         │
    ┌────┼────┬────┐
    │    │    │    │
   POS  KDS  iPad iPhone
```

## Installation

### Standalone

```bash
# Install dependencies
cd edge-gateway
npm install

# Copy environment file
cp .env.example .env

# Edit configuration
nano .env

# Start server
node server.js
```

### Docker

```bash
# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `CLOUD_API_URL` | Cloud API endpoint | `https://observe-hub-1.preview.emergentagent.com` |
| `VENUE_ID` | Venue identifier | `venue-caviar-bull` |
| `EDGE_PORT` | HTTP server port | `8080` |
| `EDGE_WS_PORT` | WebSocket port | `8081` |
| `DB_PATH` | SQLite database path | `./data/edge.db` |
| `CACHE_TTL_HOURS` | Cache expiration | `24` |
| `SYNC_INTERVAL_MS` | Sync frequency | `30000` |
| `MAX_RETRY_COUNT` | Max retry attempts | `5` |
| `MDNS_ENABLED` | Enable device discovery | `true` |

## API Endpoints

### Health Check

```bash
GET /health
```

Returns edge gateway status, cloud reachability, queue stats.

### Cache Management

```bash
# Get cached menu
GET /api/cache/menu/:venueId

# Update menu cache
POST /api/cache/menu/:venueId

# Get cached products
GET /api/cache/products/:venueId

# Invalidate cache
DELETE /api/cache/:key
```

### Command Queue

```bash
# Enqueue command
POST /api/queue/enqueue
{
  "type": "pos_order",
  "payload": {...},
  "device_id": "device-001"
}

# Get queue stats
GET /api/queue/stats

# Force sync now
POST /api/queue/sync
```

### Devices

```bash
# List devices
GET /api/devices

# Register device
POST /api/devices/register
{
  "device_id": "device-001",
  "device_name": "iPad POS 1",
  "device_type": "ipad"
}
```

### Sync

```bash
# Pull latest data from cloud
POST /api/sync/pull
```

## WebSocket Protocol

### Client Connection

```javascript
const ws = new WebSocket('ws://edge-gateway-ip:8081');

// Register device
ws.send(JSON.stringify({
  type: 'REGISTER',
  deviceId: 'device-001',
  payload: {
    deviceName: 'iPad POS 1',
    deviceType: 'ipad'
  }
}));

// Send heartbeat
setInterval(() => {
  ws.send(JSON.stringify({
    type: 'HEARTBEAT',
    deviceId: 'device-001'
  }));
}, 30000);

// Queue command
ws.send(JSON.stringify({
  type: 'QUEUE_COMMAND',
  deviceId: 'device-001',
  payload: {
    commandType: 'pos_order',
    commandPayload: {...}
  }
}));
```

## Database Schema

### Tables

- **cache**: Key-value cache with expiration
- **command_queue**: Offline command queue
- **devices**: Registered devices
- **sync_log**: Sync operation log

## Monitoring

### Health Metrics

- Cloud reachability status
- Queue depth (pending/synced/failed)
- Connected devices count
- Uptime

### Logs

```bash
# View logs
tail -f edge-gateway.log

# Docker logs
docker-compose logs -f edge-gateway
```

## Deployment

### Raspberry Pi

1. Install Node.js 20+
2. Clone repository
3. Configure `.env`
4. Run as systemd service (see below)

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
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

## Troubleshooting

### Edge gateway not starting

- Check port availability: `netstat -tulpn | grep 8080`
- Verify Node.js version: `node --version` (requires 18+)
- Check logs: `journalctl -u restin-edge -f`

### Devices not discovered

- Verify mDNS enabled: `MDNS_ENABLED=true`
- Check firewall: Allow UDP port 5353
- Ensure devices on same LAN

### Commands not syncing

- Check cloud reachability: `curl https://observe-hub-1.preview.emergentagent.com/api/health`
- Verify queue stats: `curl http://localhost:8080/api/queue/stats`
- Manually trigger sync: `curl -X POST http://localhost:8080/api/queue/sync`

## Security

- Rate limiting: 100 req/min per device
- Device pairing required
- Audit log for all operations
- TLS encryption for cloud communication

## Performance

- SQLite with WAL mode for concurrent access
- In-memory cache for frequently accessed data
- Batch sync (50 commands per cycle)
- Exponential backoff for failed commands

## License

MIT
