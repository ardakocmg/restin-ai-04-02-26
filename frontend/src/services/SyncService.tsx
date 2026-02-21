/**
 * SyncService - Idempotent Command Replay & Sync Engine
 * @module services/SyncService
 * 
 * Handles:
 * - Network status monitoring
 * - Offline queue replay
 * - Conflict resolution
 * - Retry logic with exponential backoff
 */

import axios,{ AxiosRequestConfig } from 'axios';
import { logger } from '../lib/logger';
import offlineDB,{ CommandStatus,OfflineCommand } from './OfflineDB';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'sync_complete';

export interface SyncResult {
    success: boolean;
    synced?: number;
    failed?: number;
    error?: string;
}

export type SyncListener = (status: SyncStatus | string, online?: boolean | { successCount: number; failCount: number }) => void;

interface ReplayConfig {
    headers: {
        Authorization: string;
        'X-Idempotency-Key': string;
        'X-Offline-Replay': string;
        'X-Device-Id': string | null;
    };
}

class SyncService {
    public isOnline: boolean = navigator.onLine;
    private isSyncing = false;
    private syncInterval: ReturnType<typeof setInterval> | null = null;
    private listeners: SyncListener[] = [];

    constructor() {
        // Network event listeners
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    // ============= NETWORK STATUS =============

    private handleOnline(): void {
        logger.info('Network online detected');
        this.isOnline = true;
        this.notifyListeners('online');
        this.startSync();
    }

    private handleOffline(): void {
        logger.info('Network offline detected');
        this.isOnline = false;
        this.notifyListeners('offline');
        this.stopSync();
    }

    onStatusChange(callback: SyncListener): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    private notifyListeners(status: SyncStatus | string, data?: unknown): void {
        this.listeners.forEach(cb => cb(status, data as Parameters<SyncListener>[1]));
    }

    // ============= SYNC ENGINE =============

    async startSync(): Promise<void> {
        if (this.isSyncing) return;

        logger.info('Starting sync engine');
        this.isSyncing = true;

        // Immediate sync
        await this.syncPendingCommands();

        // Periodic sync every 30 seconds
        this.syncInterval = setInterval(() => {
            this.syncPendingCommands();
        }, 30000);
    }

    stopSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.isSyncing = false;
        logger.info('Sync engine stopped');
    }

    async syncPendingCommands(): Promise<SyncResult> {
        if (!this.isOnline) return { success: true, synced: 0 };

        try {
            const pendingCommands = await offlineDB.getPendingCommands();

            if (pendingCommands.length === 0) {
                return { success: true, synced: 0 };
            }

            logger.info('Syncing pending commands', { count: pendingCommands.length });

            let successCount = 0;
            let failCount = 0;

            for (const command of pendingCommands) {
                try {
                    await this.replayCommand(command);
                    if (command.id !== undefined) {
                        await offlineDB.updateCommandStatus(command.id, 'SYNCED' as CommandStatus);
                        await offlineDB.logSync(command.id, 'SUCCESS', null);
                    }
                    successCount++;
                } catch (error) {
                    const err = error as Error;
                    logger.error('Command replay failed', { requestId: command.request_id, error: err.message });

                    // Retry logic
                    if (command.id !== undefined) {
                        if (command.retry_count < 3) {
                            // Retry count will be incremented on next attempt
                            failCount++;
                        } else {
                            // Max retries exceeded - mark as FAILED
                            await offlineDB.updateCommandStatus(command.id, 'FAILED' as CommandStatus, err.message);
                            await offlineDB.logSync(command.id, 'FAILED', err.message);
                            failCount++;
                        }
                    }
                }
            }

            logger.info('Sync complete', { successCount, failCount });
            this.notifyListeners('sync_complete', { successCount, failCount });

            return { success: true, synced: successCount, failed: failCount };
        } catch (error) {
            const err = error as Error;
            logger.error('Sync engine error', { error: err.message });
            return { success: false, error: err.message };
        }
    }

    private async replayCommand(command: OfflineCommand): Promise</**/any> {
        const token = localStorage.getItem('restin_token');

        // Build request config with idempotency
        const config: ReplayConfig = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Idempotency-Key': command.request_id,
                'X-Offline-Replay': 'true',
                'X-Device-Id': command.device_id
            }
        };

        // Replay the command
        switch (command.entity_type) {
            case 'pos_order':
                return await this.replayPOSOrder(command, config as AxiosRequestConfig);

            case 'pos_order_item':
                return await this.replayPOSOrderItem(command, config as AxiosRequestConfig);

            case 'pos_payment':
                return await this.replayPOSPayment(command, config as AxiosRequestConfig);

            case 'kds_bump':
                return await this.replayKDSBump(command, config as AxiosRequestConfig);

            case 'inventory_adjustment':
                return await this.replayInventoryAdjustment(command, config as AxiosRequestConfig);

            default:
                throw new Error(`Unknown command type: ${command.entity_type}`);
        }
    }

    private async replayPOSOrder(command: OfflineCommand, config: AxiosRequestConfig): Promise</**/any> {
        const response = await axios.post(
            `${API_URL}/api/pos/orders`,
            command.payload,
            config
        );
        return response.data;
    }

    private async replayPOSOrderItem(command: OfflineCommand, config: AxiosRequestConfig): Promise</**/any> {
        const payload = command.payload as { order_id: string };
        const response = await axios.post(
            `${API_URL}/api/pos/orders/${payload.order_id}/items`,
            command.payload,
            config
        );
        return response.data;
    }

    private async replayPOSPayment(command: OfflineCommand, config: AxiosRequestConfig): Promise</**/any> {
        const payload = command.payload as { order_id: string };
        const response = await axios.post(
            `${API_URL}/api/pos/orders/${payload.order_id}/payments`,
            command.payload,
            config
        );
        return response.data;
    }

    private async replayKDSBump(command: OfflineCommand, config: AxiosRequestConfig): Promise</**/any> {
        const payload = command.payload as { station_key: string; ticket_id: string };
        const response = await axios.post(
            `${API_URL}/api/kds/runtime/${payload.station_key}/tickets/${payload.ticket_id}/bump`,
            {},
            config
        );
        return response.data;
    }

    private async replayInventoryAdjustment(command: OfflineCommand, config: AxiosRequestConfig): Promise</**/any> {
        const response = await axios.post(
            `${API_URL}/api/inventory/adjustments`,
            command.payload,
            config
        );
        return response.data;
    }

    // ============= OFFLINE OPERATIONS =============

    async queuePOSOrder(orderData: unknown): Promise<OfflineCommand> {
        return await offlineDB.addCommand({
            entity_type: 'pos_order',
            action: 'create',
            payload: orderData
        });
    }

    async queuePOSOrderItem(itemData: unknown): Promise<OfflineCommand> {
        return await offlineDB.addCommand({
            entity_type: 'pos_order_item',
            action: 'add',
            payload: itemData
        });
    }

    async queuePOSPayment(paymentData: unknown): Promise<OfflineCommand> {
        return await offlineDB.addCommand({
            entity_type: 'pos_payment',
            action: 'process',
            payload: paymentData
        });
    }

    async queueKDSBump(bumpData: unknown): Promise<OfflineCommand> {
        return await offlineDB.addCommand({
            entity_type: 'kds_bump',
            action: 'bump',
            payload: bumpData
        });
    }

    // ============= MANUAL SYNC =============

    async forceSyncNow(): Promise<SyncResult> {
        logger.info('Manual sync triggered');
        return await this.syncPendingCommands();
    }

    async getQueueStats(): Promise<{ pending_commands: number; total_syncs: number; last_sync: string | null }> {
        return await offlineDB.getStats();
    }
}

// Singleton instance
const syncService = new SyncService();

// Auto-initialize
offlineDB.init().then(() => {
    if (navigator.onLine) {
        syncService.startSync();
    }
});

export default syncService;
