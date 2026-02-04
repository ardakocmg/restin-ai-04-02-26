import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface POSDB extends DBSchema {
    orders: {
        key: string;
        value: any;
    };
    syncQueue: {
        key: string;
        value: {
            id: string;
            url: string;
            method: string;
            body: any;
            timestamp: number;
        };
    };
}

let dbPromise: Promise<IDBPDatabase<POSDB>>;

export const initPOSDB = () => {
    dbPromise = openDB<POSDB>('antigravity-pos', 1, {
        upgrade(db) {
            db.createObjectStore('orders', { keyPath: 'id' });
            db.createObjectStore('syncQueue', { keyPath: 'id' });
        },
    });
    return dbPromise;
};

export const queueRequest = async (url: string, method: string, body: any) => {
    const db = await (dbPromise || initPOSDB());
    const id = crypto.randomUUID();
    await db.put('syncQueue', {
        id,
        url,
        method,
        body,
        timestamp: Date.now(),
    });
    // Trigger Background Sync (sw or dedicated worker)
};

export const getOfflineOrders = async () => {
    const db = await (dbPromise || initPOSDB());
    return db.getAll('orders');
};
