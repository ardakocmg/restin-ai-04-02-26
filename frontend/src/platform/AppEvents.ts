import { logger } from '@/lib/logger';
// Event Bus for Cross-Component Communication

interface AppEvent {
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

type EventCallback = (event: AppEvent) => void;

class AppEvents {
  private listeners: Map<string, EventCallback[]>;
  private offlineBuffer: AppEvent[];

  constructor() {
    this.listeners = new Map();
    this.offlineBuffer = [];
  }

  subscribe(eventType: string, callback: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      const index = callbacks?.indexOf(callback) ?? -1;
      if (index > -1) {
        callbacks!.splice(index, 1);
      }
    };
  }

  publish(eventType: string, payload: Record<string, unknown> = {}): void {
    const event: AppEvent = {
      type: eventType,
      timestamp: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: payload as any
    };

    // Log event (dev only)
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger.info('[Event]', event as any);
    }

    // Notify listeners
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach(cb => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cb(event as any);
      } catch (error: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger.error(`Event listener error for ${eventType}:`, error as any);
      }
    });

    // Buffer if offline (optional)
    if (!navigator.onLine) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.offlineBuffer.push(event as any);
    }
  }

  getBuffer(): AppEvent[] {
    return this.offlineBuffer;
  }

  clearBuffer(): void {
    this.offlineBuffer = [];
  }
}

const appEvents = new AppEvents();
export default appEvents;
