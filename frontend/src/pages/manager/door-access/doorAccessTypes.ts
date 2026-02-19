/**
 * 🔐 Door Access Control — Shared Types
 * Extracted from DoorAccessControl.tsx for better tree-shaking and code organization.
 */

export interface Door {
    id: string;
    venue_id: string;
    nuki_smartlock_id: number;
    display_name: string;
    device_type: string;
    battery_charge?: number;
    battery_critical: boolean;
    lock_state: string;
    last_synced_at?: string;
}

export interface Permission {
    id: string;
    door_id: string;
    role_id?: string;
    user_id?: string;
    can_unlock: boolean;
    can_lock: boolean;
    can_unlatch: boolean;
}

export interface AuditEntry {
    id: string;
    user_name: string;
    door_display_name: string;
    action: string;
    result: string;
    provider_path: string;
    timestamp: string;
    error_message?: string;
    duration_ms?: number;
}

export interface ConnectionStatus {
    connected: boolean;
    mode?: string;
    status?: string;
    connected_at?: string;
}

export interface BridgeHealth {
    configured: boolean;
    is_healthy: boolean;
    ip_address?: string;
    port?: number;
}

export interface AccessSummary {
    total_actions: number;
    success_count: number;
    failure_count: number;
    unauthorized_count: number;
    success_rate: number;
    busiest_door: { name: string; count: number } | null;
    most_active_user: { name: string; count: number } | null;
    avg_response_ms: number;
    bridge_usage_pct: number;
    period_days: number;
}

export interface TimelineEntry {
    id: string;
    timestamp: string;
    description: string;
    severity: string;
    action: string;
    result: string;
    user_name: string;
    door_name: string;
    provider_path: string;
    duration_ms?: number;
    error_message?: string;
}

export interface HeatmapEntry {
    date: string;
    hour: number;
    count: number;
    unlock: number;
    lock: number;
    unlatch: number;
}

export interface KeypadPin {
    id: string;
    venue_id: string;
    door_id: string;
    door_display_name: string;
    name: string;
    code_hint: string;
    valid_from?: string;
    valid_until?: string;
    status: string;
    created_at: string;
    created_by: string;
    revoked_at?: string;
}

export interface DoorConfig {
    name: string;
    led_enabled: boolean;
    led_brightness: number;
    single_lock: boolean;
    button_enabled: boolean;
    admin_pin_state: boolean;
}

export interface NukiAuth {
    id: string;
    name: string;
    type: string; // KEYPAD, FOB, APP, SMARTLOCK
    status: string;
    allowed_from_time?: string;
    allowed_until_time?: string;
    creation_date: string;
}

export interface NukiLog {
    id: string;
    smartlock_id: number;
    device_type: string;
    date: string;
    action: string;
    trigger: string;
    auth_name: string;
    staff_name?: string;
    completion_status: string;
}

export function getVenueId(): string {
    return localStorage.getItem('selectedVenueId') || 'venue-caviar-bull';
}
