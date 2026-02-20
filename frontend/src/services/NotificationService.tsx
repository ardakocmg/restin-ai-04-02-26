/**
 * Notification Service - Browser push notifications
 * @module services/NotificationService
 */

export type NotificationPermission = 'default' | 'granted' | 'denied';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Incident {
    id: string;
    title: string;
    description: string;
    severity: IncidentSeverity;
}

export interface NotificationOptions {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
}

class NotificationService {
    private permission: NotificationPermission = 'default';

    constructor() {
        this.checkPermission();
    }

    async checkPermission(): Promise<NotificationPermission> {
        if ('Notification' in window) {
            this.permission = Notification.permission as NotificationPermission;
            return this.permission;
        }
        return 'denied';
    }

    async requestPermission(): Promise<NotificationPermission> {
        if ('Notification' in window && Notification.permission === 'default') {
            this.permission = await Notification.requestPermission() as NotificationPermission;
            return this.permission;
        }
        return this.permission;
    }

    async send(title: string, options: NotificationOptions = {}): Promise<Notification | null> {
        if (this.permission !== 'granted') {
            await this.requestPermission();
        }

        if (this.permission === 'granted') {
            return new Notification(title, {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                ...options
            });
        }
        return null;
    }

    async sendIncident(incident: Incident): Promise<Notification | null> {
        const severityIcons: Record<IncidentSeverity, string> = {
            low: 'ℹ️',
            medium: '⚠️',
            high: '🔴',
            critical: '🚨'
        };

        return this.send(`${severityIcons[incident.severity]} ${incident.title}`, {
            body: incident.description,
            tag: `incident-${incident.id}`,
            requireInteraction: incident.severity === 'critical'
        });
    }
}

export default NotificationService;
