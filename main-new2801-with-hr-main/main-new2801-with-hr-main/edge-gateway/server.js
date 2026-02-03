/**
 * Edge Gateway Server - Venue-Level Resilience Layer
 * 
 * Provides:
 * - Local cache for offline operation
 * - Command queue for offline transactions
 * - Device discovery and management
 * - WebSocket communication
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const config = require('./config');

// Services
const db = require('./services/database');
const cacheManager = require('./services/cache-manager');
const commandQueue = require('./services/command-queue');
const deviceDiscovery = require('./services/device-discovery');
const wsServer = require('./services/websocket-server');
const DeviceMeshServer = require('./services/device-mesh-server');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ============= HEALTH CHECK =============

app.get('/health', async (req, res) => {
  const cloudReachable = await commandQueue.checkCloudReachability();
  const queueStats = commandQueue.getStats();
  const devices = db.getDevices();

  res.json({
    status: 'healthy',
    edge_id: config.cloud.venueId,
    cloud_reachable: cloudReachable,
    queue_stats: queueStats,
    devices_online: devices.length,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ============= CACHE ENDPOINTS =============

app.get('/api/cache/menu/:venueId', (req, res) => {
  const menu = cacheManager.getMenu(req.params.venueId);
  if (menu) {
    res.json({ success: true, data: menu, source: 'edge_cache' });
  } else {
    res.status(404).json({ success: false, error: 'Menu not found in cache' });
  }
});

app.post('/api/cache/menu/:venueId', (req, res) => {
  cacheManager.cacheMenu(req.params.venueId, req.body);
  res.json({ success: true, message: 'Menu cached' });
});

app.get('/api/cache/products/:venueId', (req, res) => {
  const products = cacheManager.getProducts(req.params.venueId);
  if (products) {
    res.json({ success: true, data: products, source: 'edge_cache' });
  } else {
    res.status(404).json({ success: false, error: 'Products not found in cache' });
  }
});

app.post('/api/cache/products/:venueId', (req, res) => {
  cacheManager.cacheProducts(req.params.venueId, req.body);
  res.json({ success: true, message: 'Products cached' });
});

app.get('/api/cache/users/:venueId', (req, res) => {
  const users = cacheManager.getUsers(req.params.venueId);
  if (users) {
    res.json({ success: true, data: users, source: 'edge_cache' });
  } else {
    res.status(404).json({ success: false, error: 'Users not found in cache' });
  }
});

app.post('/api/cache/users/:venueId', (req, res) => {
  cacheManager.cacheUsers(req.params.venueId, req.body);
  res.json({ success: true, message: 'Users cached' });
});

app.delete('/api/cache/:key', (req, res) => {
  cacheManager.invalidate(req.params.key);
  res.json({ success: true, message: 'Cache invalidated' });
});

// ============= COMMAND QUEUE ENDPOINTS =============

app.post('/api/queue/enqueue', (req, res) => {
  const { type, payload, device_id } = req.body;
  
  if (!type || !payload) {
    return res.status(400).json({ success: false, error: 'Missing type or payload' });
  }

  const result = commandQueue.enqueue(type, payload, device_id);
  res.json({ success: true, ...result });
});

app.get('/api/queue/stats', (req, res) => {
  const stats = commandQueue.getStats();
  res.json({ success: true, stats });
});

app.post('/api/queue/sync', async (req, res) => {
  const result = await commandQueue.forceSyncNow();
  res.json({ success: true, ...result });
});

// ============= DEVICE ENDPOINTS =============

app.get('/api/devices', (req, res) => {
  const devices = db.getDevices();
  res.json({ success: true, devices });
});

app.post('/api/devices/register', (req, res) => {
  const { device_id, device_name, device_type } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  
  db.registerDevice(device_id, device_name, device_type, ip);
  res.json({ success: true, message: 'Device registered' });
});

// ============= PROXY ENDPOINTS (Cloud Fallthrough) =============

// Proxy to cloud if available, otherwise queue
app.post('/api/proxy/*', async (req, res) => {
  const path = req.params[0];
  const cloudReachable = await commandQueue.checkCloudReachability();

  if (cloudReachable) {
    // Proxy to cloud
    try {
      const response = await axios({
        method: req.method,
        url: `${config.cloud.apiUrl}/api/${path}`,
        data: req.body,
        headers: {
          'Authorization': req.headers.authorization,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      res.json(response.data);
    } catch (error) {
      console.error('Cloud proxy error:', error.message);
      res.status(error.response?.status || 500).json({
        success: false,
        error: error.message,
        fallback: 'edge_queue',
      });
    }
  } else {
    // Queue for later
    const { type, payload, device_id } = req.body;
    const result = commandQueue.enqueue(type || 'generic', payload || req.body, device_id);
    res.json({
      success: true,
      mode: 'offline',
      queued: true,
      ...result,
    });
  }
});

// ============= PRINT ENDPOINTS =============

app.post('/api/print/job', (req, res) => {
  const { printer_id, content, type } = req.body;
  
  // Queue print job
  const result = commandQueue.enqueue('print_job', {
    printer_id,
    content,
    type,
    timestamp: new Date().toISOString(),
  });

  console.log('🖨️ Print job queued:', printer_id);
  
  res.json({ success: true, message: 'Print job queued', ...result });
});

// ============= SYNC ENDPOINTS =============

app.post('/api/sync/pull', async (req, res) => {
  try {
    const cloudReachable = await commandQueue.checkCloudReachability();
    
    if (!cloudReachable) {
      return res.status(503).json({
        success: false,
        error: 'Cloud unreachable',
      });
    }

    const venueId = config.cloud.venueId;

    // Fetch latest data from cloud
    const [menuRes, productsRes, usersRes] = await Promise.all([
      axios.get(`${config.cloud.apiUrl}/api/menu/${venueId}`).catch(() => null),
      axios.get(`${config.cloud.apiUrl}/api/products`).catch(() => null),
      axios.get(`${config.cloud.apiUrl}/api/users`).catch(() => null),
    ]);

    // Update cache
    if (menuRes?.data) cacheManager.cacheMenu(venueId, menuRes.data);
    if (productsRes?.data) cacheManager.cacheProducts(venueId, productsRes.data);
    if (usersRes?.data) cacheManager.cacheUsers(venueId, usersRes.data);

    res.json({
      success: true,
      message: 'Cache refreshed from cloud',
      cached: {
        menu: !!menuRes?.data,
        products: !!productsRes?.data,
        users: !!usersRes?.data,
      },
    });
  } catch (error) {
    console.error('Sync pull error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= INITIALIZATION =============

async function startServer() {
  console.log('🚀 Starting Edge Gateway...');
  console.log('📍 Venue ID:', config.cloud.venueId);
  console.log('☁️  Cloud URL:', config.cloud.apiUrl);

  // Initialize database
  db.init();

  // Start command queue sync
  commandQueue.startSync();

  // Start device discovery
  deviceDiscovery.start();

  // Start WebSocket server
  wsServer.start();

  // Start Device Mesh server
  const deviceMeshServer = new DeviceMeshServer(8082);
  deviceMeshServer.start();

  // Start HTTP server
  app.listen(config.edge.port, '0.0.0.0', () => {
    console.log(`✅ Edge Gateway listening on port ${config.edge.port}`);
    console.log(`🔌 WebSocket server on port ${config.edge.wsPort}`);
  });

  // Periodic cache cleanup
  setInterval(() => {
    cacheManager.cleanup();
  }, 3600000); // Every hour

  // Initial sync
  setTimeout(async () => {
    console.log('🔄 Performing initial sync...');
    try {
      const cloudReachable = await commandQueue.checkCloudReachability();
      if (cloudReachable) {
        await commandQueue.syncToCloud();
        console.log('✅ Initial sync complete');
      } else {
        console.log('⚠️ Cloud unreachable, running in offline mode');
      }
    } catch (error) {
      console.error('❌ Initial sync failed:', error);
    }
  }, 2000);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⏹️  Shutting down Edge Gateway...');
  commandQueue.stopSync();
  deviceDiscovery.stop();
  wsServer.stop();
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⏹️  Shutting down Edge Gateway...');
  commandQueue.stopSync();
  deviceDiscovery.stop();
  wsServer.stop();
  db.close();
  process.exit(0);
});

// Start
startServer();
