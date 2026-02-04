// Event Bus for Cross-Component Communication
class AppEvents {
  constructor() {
    this.listeners = new Map();
    this.offlineBuffer = [];
  }

  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      const index = callbacks?.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  publish(eventType, payload = {}) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      payload
    };
    
    // Log event (dev only)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Event]', event);
    }
    
    // Notify listeners
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach(cb => {
      try {
        cb(event);
      } catch (error) {
        console.error(`Event listener error for ${eventType}:`, error);
      }
    });
    
    // Buffer if offline (optional)
    if (!navigator.onLine) {
      this.offlineBuffer.push(event);
    }
  }

  getBuffer() {
    return this.offlineBuffer;
  }

  clearBuffer() {
    this.offlineBuffer = [];
  }
}

const appEvents = new AppEvents();
export default appEvents;
