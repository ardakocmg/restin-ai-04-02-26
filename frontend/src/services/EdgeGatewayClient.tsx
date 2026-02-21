/**
 * Edge Gateway Client - Frontend connection to venue Edge Gateway
 * @module services/EdgeGatewayClient
 */

import axios from 'axios';
import { logger } from '../lib/logger';

const EDGE_GATEWAY_URL = process.env.REACT_APP_EDGE_GATEWAY_URL || 'http://localhost:8080';
const EDGE_WS_URL = process.env.REACT_APP_EDGE_WS_URL || 'ws://localhost:8081';

export type MessageType = 'REGISTER' | 'HEARTBEAT' | 'REGISTERED' | 'HEARTBEAT_ACK' | 'COMMAND_QUEUED' | 'SYNC_STATUS';
export type DeviceType = 'desktop' | 'ipad' | 'iphone' | 'android';

export interface EdgeMessage {
    type: MessageType | string;
    deviceId?: string;
    payload?: unknown;
    requestId?: string;
    stats?: unknown;
}

export interface QueueStats {
    pending: number;
    processing: number;
    synced: number;
}

export type MessageListener = (event: string, data: unknown) => void;

class EdgeGatewayClient {
    private edgeUrl: string;
    private wsUrl: string;
    private ws: WebSocket | null = null;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    public isEdgeAvailable = false;
    private deviceId: string;
    private listeners: MessageListener[] = [];

    constructor() {
        this.edgeUrl = EDGE_GATEWAY_URL;
        this.wsUrl = EDGE_WS_URL;
        this.deviceId = this.getOrCreateDeviceId();
    }

    // ============= CONNECTION =============

    async checkEdgeAvailability(): Promise<boolean> {
        // Explicitly check if the Edge Gateway URL is provided and not the default localhost during dev
        const isExplicitlyEnabled = process.env.REACT_APP_EDGE_GATEWAY_URL && process.env.REACT_APP_EDGE_GATEWAY_URL !== '';
        const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';

        // Skip Edge Gateway check if not explicitly configured or in a dev environment that doesn't need it
        if (!isExplicitlyEnabled || (isDevelopment && !process.env.REACT_APP_EDGE_GATEWAY_URL)) {
            this.isEdgeAvailable = false;
            return false;
        }

        try {
            const response = await axios.get(`${this.edgeUrl}/health`, { timeout: 3000 });
            this.isEdgeAvailable = response.status === 200;
            return this.isEdgeAvailable;
        } catch {
            this.isEdgeAvailable = false;
            return false;
        }
    }

    connectWebSocket(): void {
        if (this.ws) return;

        logger.info('Connecting to Edge Gateway WebSocket');

        try {
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                logger.info('Connected to Edge Gateway');
                this.registerDevice();
                this.startHeartbeat();
            };

            this.ws.onmessage = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data) as EdgeMessage;
                    this.handleMessage(data);
                } catch (error) {
                    const err = error as Error;
                    logger.error('WebSocket message parse error', { error: err.message });
                }
            };

            this.ws.onerror = (event: Event) => {
                logger.error('WebSocket error', { error: (event as ErrorEvent).message || 'Unknown' });
            };

            this.ws.onclose = () => {
                logger.info('Disconnected from Edge Gateway');
                this.ws = null;

                // Attempt reconnect after 5 seconds
                setTimeout(() => {
                    this.connectWebSocket();
                }, 5000);
            };
        } catch (error) {
            const err = error as Error;
            logger.error('WebSocket connection failed', { error: err.message });
        }
    }

    private registerDevice(): void {
        const deviceInfo = {
            deviceName: this.getDeviceName(),
            deviceType: this.getDeviceType(),
        };

        this.sendMessage({
            type: 'REGISTER',
            deviceId: this.deviceId,
            payload: deviceInfo,
        });
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.sendMessage({
                    type: 'HEARTBEAT',
                    deviceId: this.deviceId,
                });
            }
        }, 30000); // Every 30 seconds
    }

    sendMessage(message: EdgeMessage): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            logger.warn('WebSocket not connected');
        }
    }

    private handleMessage(data: EdgeMessage): void {
        const { type } = data;

        switch (type) {
            case 'REGISTERED':
                logger.info('Device registered with Edge Gateway');
                break;

            case 'HEARTBEAT_ACK':
                // Silent acknowledgment
                break;

            case 'COMMAND_QUEUED':
                logger.info('Command queued', { requestId: data.requestId });
                this.notifyListeners('command_queued', data);
                break;

            case 'SYNC_STATUS':
                logger.info('Sync status', { stats: data.stats });
                this.notifyListeners('sync_status', data.stats);
                break;

            default:
                logger.debug('Unknown message type', { type });
        }
    }

    // ============= CACHE OPERATIONS =============

    async getMenuFromEdge(venueId: string): Promise<unknown | null> {
        try {
            const response = await axios.get(`${this.edgeUrl}/api/cache/menu/${venueId}`);
            return response.data;
        } catch {
            return null;
        }
    }

    async getProductsFromEdge(venueId: string): Promise<unknown | null> {
        try {
            const response = await axios.get(`${this.edgeUrl}/api/cache/products/${venueId}`);
            return response.data;
        } catch {
            return null;
        }
    }

    async getUsersFromEdge(venueId: string): Promise<unknown | null> {
        try {
            const response = await axios.get(`${this.edgeUrl}/api/cache/users/${venueId}`);
            return response.data;
        } catch {
            return null;
        }
    }

    // ============= COMMAND QUEUE =============

    async queueCommandViaEdge(type: string, payload: unknown): Promise</**/any> {
        try {
            const response = await axios.post(`${this.edgeUrl}/api/queue/enqueue`, {
                type,
                payload,
                device_id: this.deviceId,
            });
            return response.data;
        } catch (error) {
            const err = error as Error;
            logger.error('Failed to queue via Edge', { error: err.message });
            throw error;
        }
    }

    async getQueueStats(): Promise<QueueStats | null> {
        try {
            const response = await axios.get(`${this.edgeUrl}/api/queue/stats`);
            return response.data;
        } catch {
            return null;
        }
    }

    async syncNow(): Promise<unknown | null> {
        try {
            const response = await axios.post(`${this.edgeUrl}/api/queue/sync`);
            return response.data;
        } catch (error) {
            const err = error as Error;
            logger.error('Sync failed', { error: err.message });
            return null;
        }
    }

    // ============= HELPERS =============

    private getOrCreateDeviceId(): string {
        let deviceId = localStorage.getItem('edge_device_id');
        if (!deviceId) {
            deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('edge_device_id', deviceId);
        }
        return deviceId;
    }

    private getDeviceName(): string {
        return localStorage.getItem('device_name') || `Device ${this.deviceId.substr(-8)}`;
    }

    private getDeviceType(): DeviceType {
        const ua = navigator.userAgent;
        if (/iPad/.test(ua)) return 'ipad';
        if (/iPhone/.test(ua)) return 'iphone';
        if (/Android/.test(ua)) return 'android';
        return 'desktop';
    }

    onMessage(callback: MessageListener): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    private notifyListeners(event: string, data: unknown): void {
        this.listeners.forEach(cb => cb(event, data));
    }

    disconnect(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

const edgeGatewayClient = new EdgeGatewayClient();

export default edgeGatewayClient;
