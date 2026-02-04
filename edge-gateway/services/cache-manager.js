/**
 * Cache Manager - Local caching for menu, products, config
 */

const db = require('./database');
const config = require('../config');

class CacheManager {
  constructor() {
    this.ttlSeconds = config.cache.ttlHours * 3600;
  }

  // Menu caching
  cacheMenu(venueId, menuData) {
    const key = `menu:${venueId}`;
    db.setCache(key, menuData, this.ttlSeconds);
    console.log('💾 Menu cached:', key);
  }

  getMenu(venueId) {
    const key = `menu:${venueId}`;
    const data = db.getCache(key);
    if (data) {
      console.log('✅ Menu cache hit:', key);
    } else {
      console.log('❌ Menu cache miss:', key);
    }
    return data;
  }

  // Product catalog caching
  cacheProducts(venueId, products) {
    const key = `products:${venueId}`;
    db.setCache(key, products, this.ttlSeconds);
    console.log('💾 Products cached:', key);
  }

  getProducts(venueId) {
    const key = `products:${venueId}`;
    return db.getCache(key);
  }

  // Config caching
  cacheConfig(venueId, configData) {
    const key = `config:${venueId}`;
    db.setCache(key, configData, this.ttlSeconds);
    console.log('💾 Config cached:', key);
  }

  getConfig(venueId) {
    const key = `config:${venueId}`;
    return db.getCache(key);
  }

  // User/Auth caching (shorter TTL)
  cacheUsers(venueId, users) {
    const key = `users:${venueId}`;
    db.setCache(key, users, 3600); // 1 hour TTL
    console.log('💾 Users cached:', key);
  }

  getUsers(venueId) {
    const key = `users:${venueId}`;
    return db.getCache(key);
  }

  // Generic cache
  set(key, data, ttlSeconds = null) {
    const ttl = ttlSeconds || this.ttlSeconds;
    db.setCache(key, data, ttl);
  }

  get(key) {
    return db.getCache(key);
  }

  invalidate(key) {
    db.deleteCache(key);
    console.log('🗑️ Cache invalidated:', key);
  }

  invalidateAll() {
    // Clear all cache entries
    const keys = ['menu', 'products', 'config', 'users'];
    const venueId = config.cloud.venueId;
    keys.forEach(prefix => {
      db.deleteCache(`${prefix}:${venueId}`);
    });
    console.log('🗑️ All cache invalidated');
  }

  cleanup() {
    const deleted = db.cleanupExpiredCache();
    if (deleted > 0) {
      console.log(`🧹 Cleaned up ${deleted} expired cache entries`);
    }
  }
}

module.exports = new CacheManager();
