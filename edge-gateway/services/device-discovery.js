/**
 * Device Discovery - mDNS-based device discovery on LAN
 */

const mdns = require('multicast-dns');
const db = require('./database');
const config = require('../config');
const os = require('os');

class DeviceDiscovery {
  constructor() {
    this.mdns = null;
    this.devices = new Map();
    this.localIP = this.getLocalIP();
  }

  start() {
    if (!config.discovery.mdnsEnabled) {
      console.log('⏸️ mDNS discovery disabled');
      return;
    }

    this.mdns = mdns();

    console.log('🔍 Starting device discovery (mDNS)...');

    // Advertise edge gateway
    this.mdns.on('query', (query) => {
      const targetQuery = query.questions.find(
        q => q.name === config.discovery.serviceName
      );

      if (targetQuery) {
        console.log('📡 Responding to mDNS query');
        this.mdns.respond({
          answers: [
            {
              name: config.discovery.serviceName,
              type: 'A',
              ttl: 300,
              data: this.localIP,
            },
            {
              name: config.discovery.serviceName,
              type: 'TXT',
              ttl: 300,
              data: Buffer.from(`venue=${config.cloud.venueId}`),
            },
          ],
        });
      }
    });

    // Listen for device announcements
    this.mdns.on('response', (response) => {
      response.answers.forEach((answer) => {
        if (answer.name.startsWith('restin-device-')) {
          const deviceId = answer.name;
          const deviceInfo = {
            deviceId,
            ip: answer.data,
            lastSeen: Date.now(),
          };

          this.devices.set(deviceId, deviceInfo);
          db.registerDevice(deviceId, deviceId, 'unknown', answer.data);

          console.log('👋 Device discovered:', deviceId, answer.data);
        }
      });
    });

    // Periodic query for devices
    this.queryInterval = setInterval(() => {
      this.mdns.query({
        questions: [
          {
            name: 'restin-device.local',
            type: 'A',
          },
        ],
      });
    }, 30000); // Every 30 seconds

    console.log('✅ Device discovery started');
  }

  stop() {
    if (this.queryInterval) {
      clearInterval(this.queryInterval);
    }
    if (this.mdns) {
      this.mdns.destroy();
      console.log('✅ Device discovery stopped');
    }
  }

  getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip internal and non-IPv4 addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  getDevices() {
    return Array.from(this.devices.values());
  }
}

module.exports = new DeviceDiscovery();
