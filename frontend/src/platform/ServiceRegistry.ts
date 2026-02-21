import { logger } from '@/lib/logger';
// @ts-nocheck
// Singleton Service Registry
class ServiceRegistry {
  private services: Map<string, any> = new Map();
  private initialized: Set<string> = new Set();
  constructor() {
    this.services = new Map();

  }

  register(name, service) {
    if (this.services.has(name)) {
      logger.warn(`Service '${name}' already registered, overwriting`);
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
    for (const [name, service] of Array.from(this.services.entries())) {
      await this.init(name);
    }
  }
}

const serviceRegistry = new ServiceRegistry();
export default serviceRegistry;
