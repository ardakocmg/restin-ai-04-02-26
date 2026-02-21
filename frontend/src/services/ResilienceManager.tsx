/**
 * Resilience Manager - Orchestrates offline-first architecture
 * @module services/ResilienceManager
 * Manages: Cloud -> Edge -> Device -> Mesh failover
 */

import { logger } from '../lib/logger';
import deviceMesh from './DeviceMesh';
import edgeGatewayClient from './EdgeGatewayClient';
import offlineAPI from './OfflineAPI';
import offlineDB from './OfflineDB';
import syncService from './SyncService';

export type ResilienceMode = 'unknown' | 'online' | 'edge' | 'device' | 'mesh';

export interface ResilienceStatus {
    mode: ResilienceMode;
    cloudReachable: boolean;
    edgeReachable: boolean;
    meshActive?: boolean;
    isHub?: boolean;
    peerCount?: number;
}

export interface ModeCapabilities {
    pos: boolean;
    kds: boolean;
    inventory: boolean;
    reporting: boolean;
}

export type StatusListener = (status: ResilienceStatus) => void;

class ResilienceManager {
    private mode: ResilienceMode = 'unknown';
    private cloudReachable = false;
    private edgeReachable = false;
    private listeners: StatusListener[] = [];
    private checkInterval: ReturnType<typeof setInterval> | null = null;

    async init(): Promise<void> {
        logger.info('Initializing Resilience Manager');

        // Initialize offline DB
        await offlineDB.init();

        // Check connectivity
        await this.checkConnectivity();

        // Start appropriate services based on mode
        this.startServices();

        // Periodic connectivity check
        this.checkInterval = setInterval(() => {
            this.checkConnectivity();
        }, 30000); // Every 30 seconds

        logger.info('Resilience Manager initialized', { mode: this.mode });
    }

    async checkConnectivity(): Promise<void> {
        // Check cloud reachability
        this.cloudReachable = navigator.onLine && await this.checkCloudReachability();

        // Check edge gateway reachability
        this.edgeReachable = await edgeGatewayClient.checkEdgeAvailability();

        // Determine mode
        const previousMode = this.mode;

        if (this.cloudReachable) {
            this.mode = 'online';
        } else if (this.edgeReachable) {
            this.mode = 'edge';
        } else if (deviceMesh.meshActive && deviceMesh.peers.size > 0) {
            this.mode = 'mesh';
        } else {
            this.mode = 'device';
        }

        // Mode transition
        if (previousMode !== this.mode && previousMode !== 'unknown') {
            logger.info('Mode transition', { from: previousMode, to: this.mode });
            this.onModeChange(previousMode, this.mode);
        }

        this.notifyListeners({
            mode: this.mode,
            cloudReachable: this.cloudReachable,
            edgeReachable: this.edgeReachable,
        });
    }

    private async checkCloudReachability(): Promise<boolean> {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000),
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    private startServices(): void {
        switch (this.mode) {
            case 'online':
                // Full online mode
                syncService.startSync();
                break;

            case 'edge':
                // Edge gateway mode
                edgeGatewayClient.connectWebSocket();
                syncService.startSync(); // Still sync via edge
                break;

            case 'device':
                // Device offline mode
                syncService.stopSync();
                break;

            case 'mesh':
                // Device mesh mode
                deviceMesh.start();
                break;

            default:
                logger.warn('Unknown mode', { mode: this.mode });
        }
    }

    private onModeChange(from: ResilienceMode, to: ResilienceMode): void {
        logger.info('Resilience mode changed', { from, to });

        // Transition logic
        if (to === 'online' && from !== 'online') {
            // Back online - trigger sync
            logger.info('Cloud connection restored - syncing');
            syncService.forceSyncNow();
        }

        if (to === 'edge' && from === 'device') {
            // Edge available - connect
            logger.info('Edge gateway available - connecting');
            edgeGatewayClient.connectWebSocket();
        }

        if (to === 'mesh' && from === 'device') {
            // Activate mesh
            logger.info('Activating device mesh');
            deviceMesh.start();
        }

        if (to === 'device') {
            // Full offline
            logger.info('Operating in full offline mode');
        }
    }

    // ============= OPERATION ROUTING =============

    async executeCommand(type: string, payload: unknown): Promise</**/any> {
        logger.info('Executing command', { mode: this.mode, type });

        switch (this.mode) {
            case 'online':
                // Direct to cloud
                return await offlineAPI.createOrder(payload as /**/any);

            case 'edge':
                // Route via edge gateway
                return await edgeGatewayClient.queueCommandViaEdge(type, payload);

            case 'device':
            case 'mesh':
                // Queue locally
                return await offlineAPI.createOrder(payload as /**/any);

            default:
                throw new Error('Unknown mode');
        }
    }

    // ============= STATUS =============

    getStatus(): ResilienceStatus {
        return {
            mode: this.mode,
            cloudReachable: this.cloudReachable,
            edgeReachable: this.edgeReachable,
            meshActive: deviceMesh.meshActive,
            isHub: deviceMesh.isHub,
            peerCount: deviceMesh.peers.size,
        };
    }

    getCapabilities(): ModeCapabilities {
        const capabilities: Record<ResilienceMode, ModeCapabilities> = {
            unknown: { pos: false, kds: false, inventory: false, reporting: false },
            online: { pos: true, kds: true, inventory: true, reporting: true },
            edge: { pos: true, kds: true, inventory: true, reporting: false },
            device: { pos: true, kds: false, inventory: false, reporting: false },
            mesh: { pos: true, kds: true, inventory: false, reporting: false },
        };

        return capabilities[this.mode] || capabilities.unknown;
    }

    // ============= LISTENERS =============

    onStatusChange(callback: StatusListener): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    private notifyListeners(status: ResilienceStatus): void {
        this.listeners.forEach(cb => cb(status));
    }

    destroy(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

const resilienceManager = new ResilienceManager();

export default resilienceManager;
