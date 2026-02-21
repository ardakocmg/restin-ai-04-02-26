/**
 * Device Mesh Client - P2P mesh network for device resilience
 * @module services/DeviceMesh
 */

import offlineDB from './OfflineDB';
import { logger } from '../lib/logger';

const MESH_WS_URL = process.env.REACT_APP_EDGE_WS_URL?.replace('8081', '8082') || 'ws://localhost:8082';

export type DeviceType = 'desktop' | 'kiosk' | 'ipad' | 'iphone' | 'android';
export type MeshMessageType = 'MESH_JOIN' | 'MESH_JOINED' | 'MESH_HEARTBEAT' | 'MESH_HEARTBEAT_ACK' | 'PEER_LIST_UPDATE' | 'HUB_ELECTED' | 'REPLICATE_COMMAND' | 'REPLICATION_ACK' | 'SYNC_ACK';

export interface Peer {
    deviceId: string;
    deviceName: string;
    deviceType: DeviceType;
    score: number;
}

export interface MeshMessage {
    type: MeshMessageType | string;
    deviceId?: string;
    payload?: unknown;
    meshId?: string;
    hubDeviceId?: string;
    peers?: Peer[];
    command?: unknown;
    sourceDevice?: string;
    deliveredTo?: string[];
}

export interface MeshStatus {
    active: boolean;
    connected: boolean;
    isHub: boolean;
    peerCount: number;
    score: number;
}

// Navigator extension for Battery API
interface NavigatorWithBattery extends Navigator {
    getBattery?: () => Promise<BatteryManager>;
    connection?: NetworkInformation;
}

interface BatteryManager extends EventTarget {
    charging: boolean;
    level: number;
}

interface NetworkInformation {
    downlink?: number;
}

class DeviceMesh {
    public isHub = false;
    public peers: Map<string, Peer> = new Map();
    private hubElectionScore = 0;
    private deviceId: string;
    public meshActive = false;
    private replicationFactor = 3;
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.deviceId = this.getDeviceId();
    }

    // ============= CONNECTION =============

    connect(): void {
        if (this.ws) return;

        logger.info('Connecting to Device Mesh');

        try {
            this.ws = new WebSocket(MESH_WS_URL);

            this.ws.onopen = () => {
                logger.info('Connected to Device Mesh');
                this.reconnectAttempts = 0;
                this.joinMesh();
                this.startHeartbeat();
            };

            this.ws.onmessage = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data) as MeshMessage;
                    this.handleMessage(data);
                } catch (error) {
                    const err = error as Error;
                    logger.error('Mesh message parse error', { error: err.message });
                }
            };

            this.ws.onerror = (event: Event) => {
                logger.error('Mesh WebSocket error', { error: (event as ErrorEvent).message || 'Unknown' });
            };

            this.ws.onclose = () => {
                logger.info('Disconnected from Device Mesh');
                this.ws = null;
                this.attemptReconnect();
            };
        } catch (error) {
            const err = error as Error;
            logger.error('Mesh connection failed', { error: err.message });
            this.attemptReconnect();
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.warn('Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

        logger.info('Reconnecting to mesh', { delay, attempt: this.reconnectAttempts });

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    private joinMesh(): void {
        const deviceInfo = {
            deviceName: this.getDeviceName(),
            deviceType: this.getDeviceType(),
            score: this.calculateScore(),
        };

        this.sendMessage({
            type: 'MESH_JOIN',
            deviceId: this.deviceId,
            payload: deviceInfo,
        });
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.sendMessage({
                    type: 'MESH_HEARTBEAT',
                    deviceId: this.deviceId,
                    payload: {
                        score: this.calculateScore(),
                        queueSize: this.getLocalQueueSize(),
                    },
                });
            }
        }, 30000); // Every 30 seconds
    }

    sendMessage(message: MeshMessage): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            logger.warn('Mesh WebSocket not connected');
        }
    }

    private handleMessage(data: MeshMessage): void {
        const { type } = data;

        switch (type) {
            case 'MESH_JOINED':
                logger.info('Joined device mesh', { meshId: data.meshId });
                this.meshActive = true;
                break;

            case 'PEER_LIST_UPDATE':
                if (data.peers) {
                    this.updatePeerList(data.peers);
                }
                break;

            case 'HUB_ELECTED':
                this.handleHubElection(data);
                break;

            case 'REPLICATE_COMMAND':
                this.handleReplication(data);
                break;

            case 'MESH_HEARTBEAT_ACK':
                // Silent acknowledgment
                break;

            case 'REPLICATION_ACK':
                logger.info('Command replicated', { deliveredTo: data.deliveredTo });
                break;

            default:
                logger.debug('Unknown mesh message', { type });
        }
    }

    private updatePeerList(peers: Peer[]): void {
        this.peers.clear();
        peers.forEach(peer => {
            if (peer.deviceId !== this.deviceId) {
                this.peers.set(peer.deviceId, peer);
            }
        });
        logger.info('Peer list updated', { peerCount: this.peers.size });
    }

    private handleHubElection(data: MeshMessage): void {
        const wasHub = this.isHub;
        this.isHub = data.hubDeviceId === this.deviceId;

        if (this.isHub && !wasHub) {
            logger.info('This device elected as hub');
            this.onBecomeHub();
        } else if (!this.isHub && wasHub) {
            logger.info('Hub role transferred', { newHub: data.hubDeviceId });
            this.onLoseHub();
        }
    }

    // ============= HUB ELECTION =============

    calculateScore(): number {
        let score = 0;

        // Device type weight
        const deviceType = this.getDeviceType();
        if (deviceType === 'desktop' || deviceType === 'kiosk') score += 1000;
        else if (deviceType === 'ipad') {
            if (this.isCharging()) score += 500;
            else score += 250;
        } else if (deviceType === 'iphone') score += 100;

        // Uptime weight
        const sessionStart = localStorage.getItem('session_start');
        if (sessionStart) {
            const uptimeMinutes = (Date.now() - parseInt(sessionStart)) / 60000;
            score += Math.min(uptimeMinutes, 100);
        }

        // Network quality
        const nav = navigator as NavigatorWithBattery;
        if (nav.connection) {
            const downlink = nav.connection.downlink || 1;
            score += Math.min(downlink * 10, 100);
        }

        // Battery level
        const batteryLevel = parseInt(localStorage.getItem('battery_level') || '100');
        score += batteryLevel / 2;

        this.hubElectionScore = score;
        return score;
    }

    private onBecomeHub(): void {
        logger.info('Hub mode activated');
        localStorage.setItem('is_mesh_hub', 'true');
    }

    private onLoseHub(): void {
        logger.info('Hub mode deactivated');
        localStorage.setItem('is_mesh_hub', 'false');
    }

    // ============= QUEUE REPLICATION =============

    async replicateCommand(command: unknown): Promise<boolean> {
        if (!this.meshActive || this.peers.size === 0) return false;

        const targetDevices = this.selectReplicationTargets();

        this.sendMessage({
            type: 'REPLICATE_COMMAND',
            deviceId: this.deviceId,
            payload: {
                command,
                targetDevices,
            },
        });

        logger.info('Command replication requested', { targetCount: targetDevices.length });
        return true;
    }

    private selectReplicationTargets(): string[] {
        const peers = Array.from(this.peers.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, this.replicationFactor - 1);

        return peers.map(p => p.deviceId);
    }

    private async handleReplication(data: MeshMessage): Promise<void> {
        const command = data.command as /**/any;
        const sourceDevice = data.sourceDevice;

        // Store replicated command
        await offlineDB.addCommand({
            ...command,
            replicated: true,
            source_device: sourceDevice,
        } as/**/any as Parameters<typeof offlineDB.addCommand>[0]);

        logger.info('Command replicated from peer', { requestId: (command as { request_id?: string }).request_id });

        // Send ACK
        this.sendMessage({
            type: 'SYNC_ACK',
            deviceId: this.deviceId,
            payload: {
                request_id: (command as { request_id?: string }).request_id,
                status: 'RECEIVED',
            },
        });
    }

    // ============= HELPERS =============

    private getDeviceId(): string {
        let deviceId = localStorage.getItem('device_mesh_id');
        if (!deviceId) {
            deviceId = `mesh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('device_mesh_id', deviceId);
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

    private isCharging(): boolean {
        return localStorage.getItem('is_charging') === 'true';
    }

    private getLocalQueueSize(): number {
        // This would be populated by OfflineDB
        return 0;
    }

    // ============= LIFECYCLE =============

    start(): void {
        logger.info('Device mesh starting');
        this.meshActive = true;

        // Track session start
        if (!localStorage.getItem('session_start')) {
            localStorage.setItem('session_start', Date.now().toString());
        }

        // Track battery status
        const nav = navigator as NavigatorWithBattery;
        if (nav.getBattery) {
            nav.getBattery().then(battery => {
                localStorage.setItem('is_charging', battery.charging.toString());
                localStorage.setItem('battery_level', Math.floor(battery.level * 100).toString());

                battery.addEventListener('chargingchange', () => {
                    localStorage.setItem('is_charging', battery.charging.toString());
                });

                battery.addEventListener('levelchange', () => {
                    localStorage.setItem('battery_level', Math.floor(battery.level * 100).toString());
                });
            });
        }

        // Connect to mesh
        this.connect();
    }

    stop(): void {
        logger.info('Device mesh stopping');
        this.meshActive = false;

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // ============= STATUS =============

    getStatus(): MeshStatus {
        return {
            active: this.meshActive,
            connected: this.ws?.readyState === WebSocket.OPEN,
            isHub: this.isHub,
            peerCount: this.peers.size,
            score: this.hubElectionScore,
        };
    }
}

const deviceMesh = new DeviceMesh();

export default deviceMesh;
