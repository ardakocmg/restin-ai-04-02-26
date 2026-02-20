// @ts-nocheck
// Singleton Service Registry
class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.initialized = new Set();
  }

  register(name, service) {
    if (this.services.has(name)) {
      console.warn(`Service '${name}' already registered, overwriting`);
    }
    this.services.set(name, service);
  }

  get(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not registered`);
    }
    return service;
  }

  async init(name) {
    if (this.initialized.has(name)) return;
    
    const service = this.get(name);
    if (service.init && typeof service.init === 'function') {
      await service.init();
    }
    this.initialized.add(name);
  }

  async initAll() {
    for (const [name, service] of this.services) {
      await this.init(name);
    }
  }
}

const serviceRegistry = new ServiceRegistry();
export default serviceRegistry;
