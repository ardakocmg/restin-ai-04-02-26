require('dotenv').config();

module.exports = {
  cloud: {
    apiUrl: process.env.CLOUD_API_URL || 'https://observe-hub-1.preview.emergentagent.com',
    venueId: process.env.VENUE_ID || 'venue-caviar-bull',
  },
  edge: {
    port: parseInt(process.env.EDGE_PORT) || 8080,
    wsPort: parseInt(process.env.EDGE_WS_PORT) || 8081,
  },
  database: {
    path: process.env.DB_PATH || './data/edge.db',
  },
  cache: {
    ttlHours: parseInt(process.env.CACHE_TTL_HOURS) || 24,
  },
  sync: {
    intervalMs: parseInt(process.env.SYNC_INTERVAL_MS) || 30000,
    maxRetryCount: parseInt(process.env.MAX_RETRY_COUNT) || 5,
  },
  discovery: {
    mdnsEnabled: process.env.MDNS_ENABLED === 'true',
    serviceName: process.env.EDGE_SERVICE_NAME || 'restin-edge.local',
  },
  security: {
    rateLimitPerMin: parseInt(process.env.RATE_LIMIT_PER_MIN) || 100,
    devicePairingTtlMin: parseInt(process.env.DEVICE_PAIRING_TTL_MIN) || 15,
  },
};
