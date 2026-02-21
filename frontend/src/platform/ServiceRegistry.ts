import { logger } from '../lib/logger';

interface Service {
  init?: () => Promise<void>;
  [key: string]: unknown;
}

// Singleton Service Registry
class ServiceRegistry {
  private services: Map<string, Service>;
  private initialized: Set<string>;

  constructor() {
    this.services = new Map();
    this.initialized = new Set();
  }

  register(name: string, service: Service): void {
    if (this.services.has(name)) {
      logger.warn(`Service '${name}' already registered, overwriting`);
    }
    this.services.set(name, service);
  }

  get(name: string): Service {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not registered`);
    }
    return service;
  }

  async init(name: string): Promise<void> {
    if (this.initialized.has(name)) return;

    const service = this.get(name);
    if (service.init && typeof service.init === 'function') {
      await service.init();
    }
    this.initialized.add(name);
  }

  async initAll(): Promise<void> {
    for (const [name] of this.services) {
      await this.init(name);
    }
  }
}

const serviceRegistry = new ServiceRegistry();
export default serviceRegistry;
