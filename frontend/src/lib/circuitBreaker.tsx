/**
 * 🔌 Circuit Breaker — Rule 62
 * Isolate module failures so Chat death ≠ POS death.
 * 
 * Usage:
 *   const breaker = new CircuitBreaker('voice-ai', { threshold: 3, timeout: 30000 });
 *   const result = await breaker.execute(() => api.get('/voice/status'));
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
    /** Number of failures before opening the circuit */
    threshold: number;
    /** Time in ms before attempting recovery (half-open) */
    timeout: number;
    /** Optional fallback value when circuit is open */
    fallback?: unknown;
    /** Called when circuit state changes */
    onStateChange?: (module: string, from: CircuitState, to: CircuitState) => void;
}

interface CircuitBreakerState {
    state: CircuitState;
    failureCount: number;
    lastFailureTime: number | null;
    successCount: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
    threshold: 5,
    timeout: 30000,
    fallback: undefined,
};

class CircuitBreaker {
    private moduleName: string;
    private options: CircuitBreakerOptions;
    private breaker: CircuitBreakerState;

    constructor(moduleName: string, options: Partial<CircuitBreakerOptions> = {}) {
        this.moduleName = moduleName;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.breaker = {
            state: 'CLOSED',
            failureCount: 0,
            lastFailureTime: null,
            successCount: 0,
        };
    }

    get state(): CircuitState {
        return this.breaker.state;
    }

    get isOpen(): boolean {
        return this.breaker.state === 'OPEN';
    }

    private transition(newState: CircuitState): void {
        const from = this.breaker.state;
        if (from === newState) return;
        this.breaker.state = newState;
        this.options.onStateChange?.(this.moduleName, from, newState);
    }

    private shouldAttemptRecovery(): boolean {
        if (this.breaker.state !== 'OPEN') return false;
        if (!this.breaker.lastFailureTime) return false;
        return Date.now() - this.breaker.lastFailureTime >= this.options.timeout;
    }

    private recordSuccess(): void {
        this.breaker.failureCount = 0;
        this.breaker.successCount++;
        if (this.breaker.state === 'HALF_OPEN') {
            this.transition('CLOSED');
        }
    }

    private recordFailure(): void {
        this.breaker.failureCount++;
        this.breaker.lastFailureTime = Date.now();
        this.breaker.successCount = 0;

        if (this.breaker.failureCount >= this.options.threshold) {
            this.transition('OPEN');
        }
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        // Check if open and should try recovery
        if (this.breaker.state === 'OPEN') {
            if (this.shouldAttemptRecovery()) {
                this.transition('HALF_OPEN');
            } else {
                if (this.options.fallback !== undefined) {
                    return this.options.fallback as T;
                }
                throw new CircuitBreakerOpenError(this.moduleName);
            }
        }

        try {
            const result = await fn();
            this.recordSuccess();
            return result;
        } catch (error) {
            this.recordFailure();
            if (this.breaker.state === 'OPEN' && this.options.fallback !== undefined) {
                return this.options.fallback as T;
            }
            throw error;
        }
    }

    /** Force-reset the breaker (e.g., after manual intervention) */
    reset(): void {
        this.breaker.failureCount = 0;
        this.breaker.successCount = 0;
        this.breaker.lastFailureTime = null;
        this.transition('CLOSED');
    }

    /** Get diagnostics */
    getStatus(): CircuitBreakerState & { module: string } {
        return { ...this.breaker, module: this.moduleName };
    }
}

class CircuitBreakerOpenError extends Error {
    constructor(moduleName: string) {
        super(`Circuit breaker OPEN for module: ${moduleName}. Service temporarily unavailable.`);
        this.name = 'CircuitBreakerOpenError';
    }
}

/**
 * Registry to manage multiple circuit breakers across the app.
 * Singleton pattern — import and use directly.
 */
class CircuitBreakerRegistry {
    private breakers: Map<string, CircuitBreaker> = new Map();

    getOrCreate(moduleName: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
        if (!this.breakers.has(moduleName)) {
            this.breakers.set(moduleName, new CircuitBreaker(moduleName, options));
        }
        return this.breakers.get(moduleName)!;
    }

    get(moduleName: string): CircuitBreaker | undefined {
        return this.breakers.get(moduleName);
    }

    getAllStatuses(): Array<CircuitBreakerState & { module: string }> {
        return Array.from(this.breakers.values()).map(b => b.getStatus());
    }

    resetAll(): void {
        this.breakers.forEach(b => b.reset());
    }
}

export const circuitRegistry = new CircuitBreakerRegistry();

export { CircuitBreaker, CircuitBreakerOpenError };
export type { CircuitBreakerOptions, CircuitBreakerState, CircuitState };
