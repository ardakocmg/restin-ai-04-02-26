/**
 * Incident Detector - Auto-detects device/printer/kitchen issues
 * @module services/IncidentDetector
 */
import axios from 'axios';
import { logger } from '../lib/logger';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentType = 'device_offline' | 'printer_stuck' | 'kitchen_backlog';

export interface IncidentPayload {
    type: IncidentType;
    severity: IncidentSeverity;
    title: string;
    description: string;
    device_id?: string;
}

interface Device {
    id: string;
    name: string;
    device_type: string;
    status: string;
    last_seen_at?: string;
}

interface PrintJob {
    id: string;
    status: string;
    created_at: string;
}

interface Ticket {
    id: string;
    status: string;
    created_at: string;
}

class IncidentDetector {
    private venueId: string;
    private token: string;
    private backendUrl: string;
    private monitorInterval: ReturnType<typeof setInterval> | null = null;
    private deviceStates: Map<string, number> = new Map();

    constructor(venueId: string, token: string) {
        this.venueId = venueId;
        this.token = token;
        this.backendUrl = process.env.REACT_APP_BACKEND_URL || '';
    }

    start(): void {
        this.monitorInterval = setInterval(() => {
            this.checkDeviceHealth();
            this.checkPrinterQueue();
            this.checkKDSBacklog();
        }, 30000); // Every 30 seconds
    }

    stop(): void {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
    }

    private async checkDeviceHealth(): Promise<void> {
        try {
            const response = await axios.get<Device[]>(
                `${this.backendUrl}/api/venues/${this.venueId}/devices`,
                { headers: { Authorization: `Bearer ${this.token}` } }
            );

            const devices = response.data;
            const now = new Date();

            for (const device of devices) {
                const lastSeen = new Date(device.last_seen_at || 0);
                const minutesOffline = (now.getTime() - lastSeen.getTime()) / 1000 / 60;

                // Device offline for >5 minutes
                if (minutesOffline > 5 && device.status === 'online') {
                    await this.createIncident({
                        type: 'device_offline',
                        severity: device.device_type === 'printer' ? 'high' : 'medium',
                        title: `${device.name} Offline`,
                        description: `Device has been offline for ${Math.floor(minutesOffline)} minutes`,
                        device_id: device.id
                    });
                }
            }
        } catch (error) {
            logger.error('Device health check failed', { error });
        }
    }

    private async checkPrinterQueue(): Promise<void> {
        try {
            const response = await axios.get<PrintJob[]>(
                `${this.backendUrl}/api/venues/${this.venueId}/print-jobs?status=pending`,
                { headers: { Authorization: `Bearer ${this.token}` } }
            );

            const jobs = response.data;
            const now = new Date();

            // Check for stuck print jobs (>10 min pending)
            const stuckJobs = jobs.filter(job => {
                const created = new Date(job.created_at);
                return (now.getTime() - created.getTime()) / 1000 / 60 > 10;
            });

            if (stuckJobs.length > 0) {
                await this.createIncident({
                    type: 'printer_stuck',
                    severity: 'high',
                    title: 'Printer Jobs Stuck',
                    description: `${stuckJobs.length} print jobs pending for >10 minutes`
                });
            }
        } catch (error) {
            logger.error('Printer queue check failed', { error });
        }
    }

    private async checkKDSBacklog(): Promise<void> {
        try {
            const response = await axios.get<Ticket[]>(
                `${this.backendUrl}/api/venues/${this.venueId}/kds/tickets`,
                { headers: { Authorization: `Bearer ${this.token}` } }
            );

            const tickets = response.data;
            const now = new Date();

            // Check for tickets pending >20 min
            const lateTickets = tickets.filter(ticket => {
                if (ticket.status !== 'pending') return false;
                const created = new Date(ticket.created_at);
                return (now.getTime() - created.getTime()) / 1000 / 60 > 20;
            });

            if (lateTickets.length > 3) {
                await this.createIncident({
                    type: 'kitchen_backlog',
                    severity: 'high',
                    title: 'Kitchen Backlog',
                    description: `${lateTickets.length} tickets pending for >20 minutes`
                });
            }
        } catch (error) {
            logger.error('KDS backlog check failed', { error });
        }
    }

    private async createIncident(incident: IncidentPayload): Promise<void> {
        // Check if similar incident already exists (dedup)
        const incidentKey = `${incident.type}-${incident.device_id || 'general'}`;

        if (this.deviceStates.has(incidentKey)) {
            return; // Already reported
        }

        try {
            await axios.post(
                `${this.backendUrl}/api/venues/${this.venueId}/incidents`,
                { venue_id: this.venueId, ...incident },
                { headers: { Authorization: `Bearer ${this.token}` } }
            );

            this.deviceStates.set(incidentKey, Date.now());

            // Clear dedup after 30 min
            setTimeout(() => {
                this.deviceStates.delete(incidentKey);
            }, 30 * 60 * 1000);
        } catch (error) {
            logger.error('Failed to create incident', { error });
        }
    }
}

export default IncidentDetector;
