import Dexie, { type Table } from 'dexie';

// Rule #20: Local-First Data Layer
// Rule #36: Zero-Install / Offline Resilience

export interface LocalOrder {
    id: string; // UUID
    status: 'OPEN' | 'SENT' | 'PAID' | 'CLOSED' | 'VOID';
    items: LocalOrderItem[];
    subtotal: number; // Cents
    tax: number;
    total: number;
    tableId?: string;
    createdAt: number;
    updatedAt: number;
    synced: boolean; // Sync Flag
}

export interface LocalOrderItem {
    menuItemId: string;
    name: string;
    quantity: number;
    priceCents: number;
    taxRateSnapshot: number; // Rule #54: Fix Sync Conflict (Store rate at time of sale)
    course: number; // Rule #15: Course Management
    status: 'HELD' | 'FIRED' | 'SERVED';
}

export interface SyncOperation {
    id?: number; // Auto-inc
    type: 'CREATE_ORDER' | 'UPDATE_ORDER' | 'PAY_ORDER';
    payload: any;
    timestamp: number;
}

export class POSDatabase extends Dexie {
    orders!: Table<LocalOrder>;
    syncQueue!: Table<SyncOperation>;
    products!: Table<LocalProduct>; // Enable for Inventory Check

    constructor() {
        super('AntigravityPOS');
        this.version(1).stores({
            orders: 'id, status, synced, createdAt',
            syncQueue: '++id, timestamp',
            products: 'id, category' // Basic index
        });
    }
}

export interface LocalProduct {
    id: string;
    name: string;
    priceCents: number;
    currentStock: number; // For Offline 86ing
    category: string;
}

export const db = new POSDatabase();
