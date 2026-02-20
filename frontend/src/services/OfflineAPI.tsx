/**
 * OfflineAPI - Offline-First API Wrapper
 * @module services/OfflineAPI
 * 
 * Automatically queues commands when offline and executes when online.
 * Provides seamless online/offline experience.
 * Integrated with Edge Gateway for venue-level resilience.
 */

import axios from 'axios';
import offlineDB, { OfflineCommand } from './OfflineDB';
import syncService from './SyncService';
import { logger } from '../lib/logger';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const EDGE_GATEWAY_URL = process.env.REACT_APP_EDGE_GATEWAY_URL;

export type OperationMode = 'online' | 'offline' | 'edge';

export interface OfflineOrderData {
    venue_id: string;
    table_id?: string;
    server_id?: string;
    [key: string]: unknown;
}

export interface OfflineItemData {
    menu_item_id: string;
    unit_price?: number;
    qty?: number;
    [key: string]: unknown;
}

export interface OfflinePaymentData {
    method: string;
    amount: number;
    [key: string]: unknown;
}

export interface OfflineResponse<T = unknown> {
    success: boolean;
    data: T;
    mode: OperationMode;
    queued?: boolean;
}

export interface OptimisticOrder {
    id: string;
    status: string;
    totals: {
        subtotal: number;
        tax: number;
        grand_total: number;
    };
    _offline: boolean;
    _pending_sync: boolean;
    [key: string]: unknown;
}

export interface OptimisticItem {
    id: string;
    state: string;
    pricing: {
        unit_price: number;
        line_total: number;
    };
    _offline: boolean;
    _pending_sync: boolean;
    [key: string]: unknown;
}

class OfflineAPI {
    public isOnline: boolean = navigator.onLine;
    private edgeAvailable = false;

    constructor() {
        syncService.onStatusChange((status, online) => {
            if (typeof online === 'boolean') {
                this.isOnline = online;
            }
        });

        // Check edge availability
        this.checkEdgeAvailability();
    }

    async checkEdgeAvailability(): Promise<void> {
        if (!EDGE_GATEWAY_URL) return;

        try {
            const response = await axios.get(`${EDGE_GATEWAY_URL}/health`, { timeout: 2000 });
            this.edgeAvailable = response.status === 200;
        } catch {
            this.edgeAvailable = false;
        }
    }

    // ============= POS OPERATIONS =============

    async createOrder(orderData: OfflineOrderData | Record<string, unknown>): Promise<OfflineResponse> {
        const token = localStorage.getItem('restin_token');
        const requestId = this.generateRequestId();

        if (this.isOnline) {
            try {
                // Try online first
                const response = await axios.post(
                    `${API_URL}/api/pos/orders`,
                    orderData,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'X-Idempotency-Key': requestId
                        }
                    }
                );
                return { success: true, data: response.data, mode: 'online' };
            } catch (error: any) {
                // If online fails, queue it
                logger.warn('Online request failed, queuing offline');
                return await this.queueOrderOffline(orderData, requestId);
            }
        } else {
            // Offline mode - queue immediately
            return await this.queueOrderOffline(orderData, requestId);
        }
    }

    private async queueOrderOffline(orderData: OfflineOrderData | Record<string, unknown>, requestId: string): Promise<OfflineResponse<{ order: OptimisticOrder }>> {
        await offlineDB.addCommand({
            request_id: requestId,
            entity_type: 'pos_order',
            action: 'create',
            payload: orderData
        });

        // Generate optimistic response
        const optimisticOrder: OptimisticOrder = {
            id: `offline_${requestId}`,
            ...orderData,
            status: 'OPEN',
            totals: {
                subtotal: 0,
                tax: 0,
                grand_total: 0
            },
            _offline: true,
            _pending_sync: true
        };

        return {
            success: true,
            data: { order: optimisticOrder },
            mode: 'offline',
            queued: true
        };
    }

    async addOrderItem(orderId: string, itemData: OfflineItemData | Record<string, unknown>): Promise<OfflineResponse> {
        const token = localStorage.getItem('restin_token');
        const requestId = this.generateRequestId();

        if (this.isOnline && !orderId.startsWith('offline_')) {
            try {
                const response = await axios.post(
                    `${API_URL}/api/pos/orders/${orderId}/items`,
                    itemData,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'X-Idempotency-Key': requestId
                        }
                    }
                );
                return { success: true, data: response.data, mode: 'online' };
            } catch {
                return await this.queueOrderItemOffline(orderId, itemData, requestId);
            }
        } else {
            return await this.queueOrderItemOffline(orderId, itemData, requestId);
        }
    }

    private async queueOrderItemOffline(orderId: string, itemData: OfflineItemData | Record<string, unknown>, requestId: string): Promise<OfflineResponse<{ item: OptimisticItem }>> {
        await offlineDB.addCommand({
            request_id: requestId,
            entity_type: 'pos_order_item',
            action: 'add',
            payload: { ...itemData, order_id: orderId }
        });

        const unitPrice = (itemData as OfflineItemData).unit_price || 0;
        const qty = (itemData as OfflineItemData).qty || 1;

        // Optimistic response
        const optimisticItem: OptimisticItem = {
            id: `offline_item_${requestId}`,
            ...itemData,
            state: 'HELD',
            pricing: {
                unit_price: unitPrice,
                line_total: unitPrice * qty
            },
            _offline: true,
            _pending_sync: true
        };

        return {
            success: true,
            data: { item: optimisticItem },
            mode: 'offline',
            queued: true
        };
    }

    async processPayment(orderId: string, paymentData: OfflinePaymentData | Record<string, unknown>): Promise<OfflineResponse> {
        const token = localStorage.getItem('restin_token');
        const requestId = this.generateRequestId();

        if (this.isOnline && !orderId.startsWith('offline_')) {
            try {
                const response = await axios.post(
                    `${API_URL}/api/pos/orders/${orderId}/payments`,
                    paymentData,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'X-Idempotency-Key': requestId
                        }
                    }
                );
                return { success: true, data: response.data, mode: 'online' };
            } catch {
                return await this.queuePaymentOffline(orderId, paymentData, requestId);
            }
        } else {
            return await this.queuePaymentOffline(orderId, paymentData, requestId);
        }
    }

    private async queuePaymentOffline(orderId: string, paymentData: OfflinePaymentData | Record<string, unknown>, requestId: string): Promise<OfflineResponse> {
        await offlineDB.addCommand({
            request_id: requestId,
            entity_type: 'pos_payment',
            action: 'process',
            payload: { ...paymentData, order_id: orderId }
        });

        return {
            success: true,
            data: { payment: { ...paymentData, status: 'PENDING_SYNC' } },
            mode: 'offline',
            queued: true
        };
    }

    // ============= KDS OPERATIONS =============

    async bumpTicket(stationKey: string, ticketId: string): Promise<OfflineResponse> {
        const token = localStorage.getItem('restin_token');
        const requestId = this.generateRequestId();

        if (this.isOnline) {
            try {
                const response = await axios.post(
                    `${API_URL}/api/kds/runtime/${stationKey}/tickets/${ticketId}/bump`,
                    {},
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'X-Idempotency-Key': requestId
                        }
                    }
                );
                return { success: true, data: response.data, mode: 'online' };
            } catch {
                return await this.queueKDSBumpOffline(stationKey, ticketId, requestId);
            }
        } else {
            return await this.queueKDSBumpOffline(stationKey, ticketId, requestId);
        }
    }

    private async queueKDSBumpOffline(stationKey: string, ticketId: string, requestId: string): Promise<OfflineResponse> {
        await offlineDB.addCommand({
            request_id: requestId,
            entity_type: 'kds_bump',
            action: 'bump',
            payload: { station_key: stationKey, ticket_id: ticketId }
        });

        return {
            success: true,
            data: { ticket: { id: ticketId, status: 'PENDING_SYNC' } },
            mode: 'offline',
            queued: true
        };
    }

    // ============= HELPERS =============

    generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async getQueuedCommands(): Promise<OfflineCommand[]> {
        return await offlineDB.getPendingCommands();
    }

    async clearSyncedCommands(): Promise<void> {
        // Clear commands older than 7 days
        // const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        // Implementation would query and delete old SYNCED commands
        logger.info('Clearing synced commands');
    }
}

const offlineAPI = new OfflineAPI();

export default offlineAPI;
