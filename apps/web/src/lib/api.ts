// Basic stub to prevent crashes
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8001', // adjust if needed
});

export const venueAPI = {
    get: (id: string) => Promise.resolve({ data: { id, name: 'Restin Venue' } }),
    getTables: (id: string) => Promise.resolve({
        data: [
            { id: 't1', name: 'Table 1', seats: 4, status: 'available' },
            { id: 't2', name: 'Table 2', seats: 2, status: 'occupied', current_order_id: 'o1' }
        ]
    })
};

export const menuAPI = {
    getCategories: (venueId: string) => Promise.resolve({
        data: [
            { id: 'c1', name: 'Mains' },
            { id: 'c2', name: 'Drinks' }
        ]
    }),
    getItems: (venueId: string, catId: string) => Promise.resolve({
        data: [
            { id: 'i1', name: 'Burger', price: 15.00 },
            { id: 'i2', name: 'Cola', price: 3.50 }
        ]
    })
};

export const orderAPI = {
    get: (id: string) => Promise.resolve({ data: { id, items: [] } }),
    create: (data: any) => Promise.resolve({ data: { id: 'new_order', ...data } }),
    addItem: (orderId: string, item: any) => Promise.resolve({ data: item }),
    close: (id: string) => Promise.resolve({ data: { status: 'closed' } })
};

export default api;
