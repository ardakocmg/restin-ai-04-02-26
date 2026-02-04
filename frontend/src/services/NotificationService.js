// Shared Notification Service
class NotificationService {
  constructor() {
    this.permission = 'default';
    this.checkPermission();
  }

  async checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
      return this.permission;
    }
    return 'denied';
  }

  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      this.permission = await Notification.requestPermission();
      return this.permission;
    }
    return this.permission;
  }

  async send(title, options = {}) {
    if (this.permission !== 'granted') {
      await this.requestPermission();
    }

    if (this.permission === 'granted') {
      return new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    }
    return null;
  }

  async sendIncident(incident) {
    const severityIcons = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🔴',
      critical: '🚨'
    };

    return this.send(`${severityIcons[incident.severity]} ${incident.title}`, {
      body: incident.description,
      tag: `incident-${incident.id}`,
      requireInteraction: incident.severity === 'critical'
    });
  }
}

export default NotificationService;
