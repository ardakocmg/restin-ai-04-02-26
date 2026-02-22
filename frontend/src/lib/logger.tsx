/**
 * Centralized Logger Utility
 * Rule #8: Structured logging only. No logger.log.
 * 
 * Usage:
 * import { logger } from '@/lib/logger';
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Failed to save', { error });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: /**/any;
    source?: string;
}

interface LoggerOptions {
    source?: string;
    enabled?: boolean;
}

class Logger {
    private source: string;
    private enabled: boolean;
    private static instance: Logger;

    constructor(options: LoggerOptions = {}) {
        this.source = options.source || 'app';
        this.enabled = options.enabled ?? (process.env.NODE_ENV !== 'production');
    }

    private formatEntry(level: LogLevel, message: string, context?: /**/any): LogEntry {
        return {
            level,
            message,
            timestamp: new Date().toISOString(),
            context,
            source: this.source,
        };
    }

    private output(entry: LogEntry): void {
        if (!this.enabled) return;

        const prefix = `[${entry.timestamp}] [${entry.source}] [${entry.level.toUpperCase()}]`;
        const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';

        switch (entry.level) {
            case 'debug':
                // eslint-disable-next-line no-console
                console.debug(`${prefix} ${entry.message}${contextStr}`);
                break;
            case 'info':
                // eslint-disable-next-line no-console
                console.info(`${prefix} ${entry.message}${contextStr}`);
                break;
            case 'warn':
                // eslint-disable-next-line no-console
                console.warn(`${prefix} ${entry.message}${contextStr}`);
                break;
            case 'error':
                // eslint-disable-next-line no-console
                console.error(`${prefix} ${entry.message}${contextStr}`);
                break;
        }

        // In production, send to backend logging service
        if (process.env.NODE_ENV === 'production' && entry.level === 'error') {
            this.sendToBackend(entry);
        }
    }

    private async sendToBackend(entry: LogEntry): Promise<void> {
        try {
            await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            });
        } catch {
            // Silently fail - don't log errors about logging
        }
    }

    debug(message: string, context?: /**/any): void {
        this.output(this.formatEntry('debug', message, context));
    }

    info(message: string, context?: /**/any): void {
        this.output(this.formatEntry('info', message, context));
    }

    warn(message: string, context?: /**/any): void {
        this.output(this.formatEntry('warn', message, context));
    }

    error(message: string, context?: /**/any): void {
        this.output(this.formatEntry('error', message, context));
    }

    // Create a child logger with a specific source
    child(source: string): Logger {
        return new Logger({ source: `${this.source}:${source}`, enabled: this.enabled });
    }

    // Static factory for getting the singleton
    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger({ source: 'restin' });
        }
        return Logger.instance;
    }
}

// Default export singleton instance
export const logger = Logger.getInstance();

// Named exports for creating child loggers
export const createLogger = (source: string): Logger => new Logger({ source });

// Convenience exports for direct usage
export default logger;
