/**
 * OfflineQueueManager - Replay logic for offline queue
 * @module services/OfflineQueueManager
 */
import StorageService, { QueueItem } from './StorageService';
import axios from 'axios';
import { logger } from '../lib/logger';

export type QueueItemType = 'CREATE_ORDER' | 'ADD_ORDER_ITEM' | 'SEND_ORDER';

export interface OrderItemPayload {
    order_id: string;
    item: unknown;
}

class OfflineQueueManager {
    private storage: StorageService;
    private isReplaying = false;
    private replayInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.storage = new StorageService();
    }

    async init(): Promise<void> {
        await this.storage.init();
        this.setupListeners();
        this.startPeriodicReplay();
    }

    private setupListeners(): void {
        // Network status listeners
        window.addEventListener('online', () => this.onNetworkRestore());
        window.addEventListener('focus', () => this.onAppFocus());
    }

    private startPeriodicReplay(): void {
        // Replay every 30 seconds
        this.replayInterval = setInterval(() => {
            if (navigator.onLine) {
                this.replayQueue();
            }
        }, 30000);
    }

    async enqueue(type: string, payload: unknown): Promise<string> {
        const idempotencyKey = this.generateIdempotencyKey(type, payload);

        try {
            await this.storage.addToQueue({
                type,
                payload,
                idempotencyKey
            });
            return idempotencyKey;
        } catch (error: any) {
            const err = error as Error;
            logger.error('Failed to enqueue', { error: err.message });
            throw error;
        }
    }

    private generateIdempotencyKey(type: string, payload: unknown): string {
        const timestamp = Date.now();
        const data = JSON.stringify(payload);
        return `${type}-${timestamp}-${this.simpleHash(data)}`;
    }

    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    private async onNetworkRestore(): Promise<void> {
        logger.info('Network restored, replaying queue');
        await this.replayQueue();
    }

    private async onAppFocus(): Promise<void> {
        if (navigator.onLine) {
            await this.replayQueue();
        }
    }

    async replayQueue(): Promise<void> {
        if (this.isReplaying) return;

        this.isReplaying = true;

        try {
            const queue = await this.storage.getQueue();

            for (const item of queue) {
                try {
                    await this.replayItem(item);
                    if (item.id !== undefined) {
                        await this.storage.removeFromQueue(item.id);
                    }
                } catch (error: unknown) {
                    const err = error as Error;
                    logger.error('Failed to replay item', { itemId: item.id, error: err.message });

                    // Increment retry count
                    const retryCount = (item.retryCount || 0) + 1;

                    // Max retries: 5
                    if (retryCount >= 5 && item.id !== undefined) {
                        logger.error('Max retries reached, removing from queue', { itemId: item.id });
                        await this.storage.removeFromQueue(item.id);
                    }
                }
            }
        } finally {
            this.isReplaying = false;
        }
    }

    private async replayItem(item: QueueItem): Promise<void> {
        const { type, payload, idempotencyKey } = item;
        const token = localStorage.getItem('restin_token');
        const backendUrl = process.env.REACT_APP_BACKEND_URL;

        if (!token) {
            throw new Error('No auth token available');
        }

        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Idempotency-Key': idempotencyKey || ''
            }
        };

        switch (type) {
            case 'CREATE_ORDER':
                await axios.post(`${backendUrl}/api/orders`, payload, config);
                break;
            case 'ADD_ORDER_ITEM': {
                const orderPayload = payload as OrderItemPayload;
                await axios.post(`${backendUrl}/api/orders/${orderPayload.order_id}/items`, orderPayload.item, config);
                break;
            }
            case 'SEND_ORDER': {
                const sendPayload = payload as { order_id: string };
                await axios.post(`${backendUrl}/api/orders/${sendPayload.order_id}/send`, {}, config);
                break;
            }
            default:
                logger.warn('Unknown queue item type', { type });
        }
    }

    destroy(): void {
        if (this.replayInterval) {
            clearInterval(this.replayInterval);
            this.replayInterval = null;
        }
    }
}

export default OfflineQueueManager;
