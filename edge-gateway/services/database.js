/**
 * Database Service - SQLite for Edge Gateway
 * Lightweight, embedded, fast persistence
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config');

class DatabaseService {
  constructor() {
    this.db = null;
  }

  init() {
    // Ensure data directory exists
    const dataDir = path.dirname(config.database.path);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Open database
    this.db = new Database(config.database.path, { verbose: console.log });
    this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency

    // Create tables
    this.createTables();

    console.log('✅ Database initialized:', config.database.path);
  }

  createTables() {
    // Cache table for menu snapshots, config, etc.
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Command queue for offline operations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS command_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        synced_at INTEGER,
        device_id TEXT
      )
    `);

    // Device registry
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        device_id TEXT PRIMARY KEY,
        device_name TEXT,
        device_type TEXT,
        ip_address TEXT,
        last_seen INTEGER,
        paired INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Sync log
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command_id INTEGER,
        status TEXT,
        error_message TEXT,
        timestamp INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Indexes for performance
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_command_status ON command_queue(status)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_device_last_seen ON devices(last_seen)');
  }

  // Cache operations
  getCache(key) {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare('SELECT data FROM cache WHERE key = ? AND expires_at > ?');
    const row = stmt.get(key, now);
    return row ? JSON.parse(row.data) : null;
  }

  setCache(key, data, ttlSeconds) {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO cache (key, data, expires_at) VALUES (?, ?, ?)'
    );
    stmt.run(key, JSON.stringify(data), expiresAt);
  }

  deleteCache(key) {
    const stmt = this.db.prepare('DELETE FROM cache WHERE key = ?');
    stmt.run(key);
  }

  cleanupExpiredCache() {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare('DELETE FROM cache WHERE expires_at < ?');
    const result = stmt.run(now);
    return result.changes;
  }

  // Command queue operations
  enqueueCommand(requestId, type, payload, deviceId = null) {
    const stmt = this.db.prepare(
      'INSERT INTO command_queue (request_id, type, payload, device_id) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(requestId, type, JSON.stringify(payload), deviceId);
    return result.lastInsertRowid;
  }

  getPendingCommands(limit = 100) {
    const stmt = this.db.prepare(
      'SELECT * FROM command_queue WHERE status = ? ORDER BY created_at ASC LIMIT ?'
    );
    const rows = stmt.all('PENDING', limit);
    return rows.map(row => ({
      ...row,
      payload: JSON.parse(row.payload),
    }));
  }

  updateCommandStatus(id, status, errorMessage = null, syncedAt = null) {
    const stmt = this.db.prepare(
      'UPDATE command_queue SET status = ?, error_message = ?, synced_at = ? WHERE id = ?'
    );
    stmt.run(status, errorMessage, syncedAt, id);
  }

  incrementRetryCount(id) {
    const stmt = this.db.prepare('UPDATE command_queue SET retry_count = retry_count + 1 WHERE id = ?');
    stmt.run(id);
  }

  getQueueStats() {
    const stmt = this.db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM command_queue
      GROUP BY status
    `);
    return stmt.all();
  }

  // Device operations
  registerDevice(deviceId, deviceName, deviceType, ipAddress) {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO devices (device_id, device_name, device_type, ip_address, last_seen) VALUES (?, ?, ?, ?, strftime("%s", "now"))'
    );
    stmt.run(deviceId, deviceName, deviceType, ipAddress);
  }

  getDevices() {
    const stmt = this.db.prepare('SELECT * FROM devices ORDER BY last_seen DESC');
    return stmt.all();
  }

  updateDeviceLastSeen(deviceId) {
    const stmt = this.db.prepare('UPDATE devices SET last_seen = strftime("%s", "now") WHERE device_id = ?');
    stmt.run(deviceId);
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('✅ Database closed');
    }
  }
}

module.exports = new DatabaseService();
