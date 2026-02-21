import { DBSchema,openDB } from 'idb';
import { InventoryItem,Order,Payslip } from '../types';

interface RestaurantOSDB extends DBSchema {
    payroll_drafts: {
        key: string;
        value: Payslip;
        indexes: { 'by-venue': string };
    };
    inventory_items: {
        key: string;
        value: InventoryItem;
    };
    orders_queue: {
        key: string;
        value: Order & { is_offline?: boolean };
    };
}

const DB_NAME = 'restaurant-os-db';
const DB_VERSION = 3;

export const initDB = async () => {
    return openDB<RestaurantOSDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('payroll_drafts')) {
                const store = db.createObjectStore('payroll_drafts', { keyPath: 'id' });
                store.createIndex('by-venue', 'employee_id'); // Just an example index
            }
            if (!db.objectStoreNames.contains('inventory_items')) {
                db.createObjectStore('inventory_items', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('orders_queue')) {
                db.createObjectStore('orders_queue', { keyPath: 'id' });
            }
        },
    });
};

export const saveDraft = async (payslip: Payslip) => {
    const db = await initDB();
    return db.put('payroll_drafts', payslip);
};

export const getDrafts = async () => {
    const db = await initDB();
    return db.getAll('payroll_drafts');
};

export const clearDrafts = async () => {
    const db = await initDB();
    return db.clear('payroll_drafts');
};
