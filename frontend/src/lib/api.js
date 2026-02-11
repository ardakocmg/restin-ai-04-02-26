import axios from "axios";
import authStore from "./AuthStore";
import { logger } from "./logger";

const API = `${process.env.REACT_APP_BACKEND_URL || `http://${window.location.hostname}:8000`}/api/`;

// Create axios instance
const api = axios.create({
  baseURL: API,
  timeout: 10000, // 10s timeout to prevent UI hanging
  headers: {
    "Content-Type": "application/json"
  }
});

// BaseURL guard on init
(() => {
  const currentHost = new URL(process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000').host;
  const changed = authStore.checkApiHostChanged(currentHost);
  if (changed) {
    logger.info('API host changed - session reset');
  }
})();

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = authStore.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add app context for KDS
  if (window.location.pathname.startsWith('/kds')) {
    config.headers['X-App-Context'] = 'KDS';
  } else if (window.location.pathname.startsWith('/pos')) {
    config.headers['X-App-Context'] = 'POS';
  }

  return config;
});

// Handle 401 with request queue (prevents duplicate refreshes)
let isRefreshing = false;
let requestQueue = [];

function processQueue(error, newToken = null) {
  requestQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(newToken);
    }
  });
  requestQueue = [];
}

async function refreshToken() {
  const token = authStore.getToken();
  if (!token) throw new Error('No token to refresh');

  const response = await axios.post(
    `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/auth/refresh`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const newToken = response.data.accessToken;
  const user = response.data.user;

  authStore.setAuth(newToken, user);

  return newToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest.__retried) {
      originalRequest.__retried = true;

      // If refresh already in progress, queue this request
      if (isRefreshing) {
        try {
          const newToken = await new Promise((resolve, reject) => {
            requestQueue.push({ resolve, reject });
          });

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      // Start refresh
      isRefreshing = true;

      try {
        const newToken = await refreshToken();

        // Process queued requests
        processQueue(null, newToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);

        // Dispatch event for AuthExpiredModal (NO auto-redirect)
        window.dispatchEvent(new CustomEvent('auth-expired'));

        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);


// Auth APIs
export const authAPI = {
  // New PIN-first login - Using direct axios call to avoid baseURL issues
  loginWithPin: (pin, app, deviceId, stationId = null) => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    const url = `${backendUrl}/api/auth/login/pin?pin=${pin}&app=${app}${deviceId ? `&deviceId=${deviceId}` : ''}${stationId ? `&stationId=${stationId}` : ''}`;
    return axios.post(url);
  },
  // Credentials login (email, username, or employee ID + password)
  loginWithCredentials: ({ identifier, password, target, deviceId }) => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    return axios.post(`${backendUrl}/api/auth/login/credentials`, {
      identifier,
      password,
      app: target,
      deviceId,
    });
  },
  // Legacy venue-based login (kept for backwards compatibility)
  login: (venueId, pin, deviceId) =>
    axios.post(`${API}/auth/login?venue_id=${venueId}&pin=${pin}${deviceId ? `&device_id=${deviceId}` : ''}`),
  verifyMFA: (userId, totpCode, deviceId) =>
    axios.post(`${API}/auth/verify-mfa?user_id=${userId}&totp_code=${totpCode}${deviceId ? `&device_id=${deviceId}` : ''}`),
  setupMFA: () => api.post("/auth/setup-mfa"),
  enableMFA: (totpCode) => api.post(`/auth/enable-mfa?totp_code=${totpCode}`),
  // Super Owner first-run setup
  checkSetupRequired: () => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    return axios.get(`${backendUrl}/api/auth/setup/status`);
  },
  setupSuperOwner: (data) => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    return axios.post(`${backendUrl}/api/auth/setup`, data);
  },
  // Progressive Auth Elevation — verify password or TOTP to unlock sensitive areas
  elevateAuth: (body) => api.post('/auth/elevate', body),
};

// Venue APIs
export const venueAPI = {
  list: () => api.get("/venues"),
  get: (id) => api.get(`/venues/${id}`),
  create: (data) => api.post("/venues", data),
  update: (id, data) => api.put(`/venues/${id}`, data),
  getZones: (venueId) => api.get(`/venues/${venueId}/zones`),
  createZone: (data) => api.post("/zones", data),
  getTables: (venueId) => api.get(`/venues/${venueId}/tables`),
  createTable: (data) => api.post("/tables", data),
  updateTable: (tableId, data) => api.put(`/tables/${tableId}`, data),
  deleteTable: (tableId) => api.delete(`/tables/${tableId}`),
  getStats: (venueId) => api.get(`/venues/${venueId}/stats`),
  getOrders: (venueId, status, tableId) => {
    const params = [];
    if (status) params.push(`status=${status}`);
    if (tableId) params.push(`table_id=${tableId}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return api.get(`/venues/${venueId}/orders${query}`);
  }
};

// User APIs
export const userAPI = {
  list: (venueId) => api.get(`/venues/${venueId}/users`),
  create: (data) => api.post("/users", data)
};

// Public content APIs
export const publicContentAPI = {
  getCurrent: (type) => api.get("/public-content/current", { params: { type } }),
  listVersions: (type) => api.get("/public-content/versions", { params: { type } }),
  createVersion: (payload) => api.post("/public-content", payload),
  updateVersion: (id, payload) => api.patch(`/public-content/${id}`, payload),
  approveVersion: (id) => api.post(`/public-content/${id}/approve`),
  previewVersion: (id) => api.get(`/public-content/preview/${id}`),
  syncModules: () => api.post('/public-content/sync-modules')
};

// Table preferences
export const tablePreferencesAPI = {
  get: (tableId, venueId) => api.get('/table-preferences', { params: { table_id: tableId, venue_id: venueId } }),
  upsert: (payload) => api.post('/table-preferences', payload)
};

export const tablePresetsAPI = {
  list: (tableId, venueId) => api.get('/table-presets', { params: { table_id: tableId, venue_id: venueId } }),
  create: (payload) => api.post('/table-presets', payload),
  remove: (id) => api.delete(`/table-presets/${id}`)
};

export const hrFeatureFlagsAPI = {
  get: (venueId) => api.get('/hr/feature-flags', { params: { venue_id: venueId } }),
  update: (payload) => api.post('/hr/feature-flags', payload)
};

export const hrAuditAPI = {
  list: (venueId, page = 1, pageSize = 50) => api.get('/hr/audit-logs', { params: { venue_id: venueId, page, page_size: pageSize } })
};

export const updatesAPI = {
  listChanges: (published = false) => api.get('/updates/changes', { params: { published } }),
  createChange: (payload) => api.post('/updates/changes', payload),
  publish: () => api.post('/updates/publish'),
  listReleases: (view = 'user') => api.get('/updates/releases', { params: { view } })
};

// Menu APIs
export const menuAPI = {
  // Menus
  listMenus: (venueId) => api.get(`/venues/${venueId}/menus`),
  getActiveMenu: (venueId) => api.get(`/venues/${venueId}/menus/active`),
  createMenu: (data) => api.post("/menus", data),
  updateMenu: (menuId, data) => api.put(`/menus/${menuId}`, data),

  // Categories
  getCategories: (venueId, menuId) =>
    api.get(`/venues/${venueId}/menu/categories${menuId ? `?menu_id=${menuId}` : ''}`),
  createCategory: (data) => api.post("/menu/categories", data),
  updateCategory: (categoryId, data) => api.put(`/menu/categories/${categoryId}`, data),
  deleteCategory: (categoryId) => api.delete(`/menu/categories/${categoryId}`),

  // Items
  getItems: (venueId, categoryId, menuId, includeInactive) => {
    const params = [];
    if (categoryId) params.push(`category_id=${categoryId}`);
    if (menuId) params.push(`menu_id=${menuId}`);
    if (includeInactive) params.push(`include_inactive=true`);
    return api.get(`/venues/${venueId}/menu/items${params.length ? `?${params.join('&')}` : ''}`);
  },
  getItem: (itemId) => api.get(`/menu/items/${itemId}`),
  createItem: (data) => api.post("/menu/items", data),
  updateItem: (itemId, data) => api.put(`/menu/items/${itemId}`, data),
  deleteItem: (itemId) => api.delete(`/menu/items/${itemId}`)
};

// Order APIs
export const orderAPI = {
  list: (venueId, status, tableId) => {
    let url = `/venues/${venueId}/orders`;
    const params = [];
    if (status) params.push(`status=${status}`);
    if (tableId) params.push(`table_id=${tableId}`);
    if (params.length) url += `?${params.join('&')}`;
    return api.get(url);
  },
  get: (orderId) => api.get(`/orders/${orderId}`),
  create: (data) => api.post("/orders", data),
  addItem: (orderId, data) => api.post(`/orders/${orderId}/items`, data),
  send: (orderId) => api.post(`/orders/${orderId}/send`),
  transfer: (orderId, newTableId) => api.post(`/orders/${orderId}/transfer?new_table_id=${newTableId}`),
  split: (orderId, seatNumbers) => api.post(`/orders/${orderId}/split`, { seat_numbers: seatNumbers }),
  merge: (orderId, mergeOrderId) => api.post(`/orders/${orderId}/merge?merge_order_id=${mergeOrderId}`),
  close: (orderId) => api.post(`/orders/${orderId}/close`),
  offlineSync: (orders) => api.post("/orders/offline-sync", orders),
  getReviewStatus: (orderId) => api.get(`/orders/${orderId}/review-status`),
  overrideReview: (orderId, reason) => api.post(`/orders/${orderId}/override-review?reason=${encodeURIComponent(reason)}`)
};

// KDS APIs
export const kdsAPI = {
  getTickets: (venueId, prepArea, status) => {
    let url = `/venues/${venueId}/kds/tickets`;
    const params = [];
    if (prepArea) params.push(`prep_area=${prepArea}`);
    if (status) params.push(`status=${status}`);
    if (params.length) url += `?${params.join('&')}`;
    return api.get(url);
  },
  startTicket: (ticketId) => api.post(`/kds/tickets/${ticketId}/start`),
  readyTicket: (ticketId) => api.post(`/kds/tickets/${ticketId}/ready`)
};

// Inventory APIs
export const inventoryAPI = {
  list: (venueId) => api.get(`/venues/${venueId}/inventory`),
  createItem: (data) => api.post("/inventory/items", data),
  addLedgerEntry: (itemId, action, quantity, reason, lotNumber, expiryDate, poId) => {
    let url = `/inventory/ledger?item_id=${itemId}&action=${action}&quantity=${quantity}`;
    if (reason) url += `&reason=${encodeURIComponent(reason)}`;
    if (lotNumber) url += `&lot_number=${lotNumber}`;
    if (expiryDate) url += `&expiry_date=${expiryDate}`;
    if (poId) url += `&po_id=${poId}`;
    return api.post(url);
  },
  getLedger: (venueId, itemId) =>
    api.get(`/venues/${venueId}/inventory/ledger${itemId ? `?item_id=${itemId}` : ''}`),
  getVariance: (venueId) => api.get(`/venues/${venueId}/inventory/variance`)
};

// Procurement APIs
export const procurementAPI = {
  listPOs: (venueId) => api.get(`/venues/${venueId}/purchase-orders`),
  createPO: (data) => api.post("/purchase-orders", data),
  receiveDelivery: (poId, items) => api.post(`/purchase-orders/${poId}/receive`, items)
};

// Document APIs
export const documentAPI = {
  list: (venueId) => api.get(`/venues/${venueId}/documents`),
  upload: (venueId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/documents/upload?venue_id=${venueId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  },
  get: (docId) => api.get(`/documents/${docId}`),
  approve: (docId) => api.post(`/documents/${docId}/approve`)
};

// Review Risk APIs
export const reviewAPI = {
  getDashboard: (venueId) => api.get(`/venues/${venueId}/review-risk`)
};

// Audit Log APIs
export const auditAPI = {
  list: (venueId, resourceType, action, limit) => {
    let url = `/venues/${venueId}/audit-logs`;
    const params = [];
    if (resourceType) params.push(`resource_type=${resourceType}`);
    if (action) params.push(`action=${action}`);
    if (limit) params.push(`limit=${limit}`);
    if (params.length) url += `?${params.join('&')}`;
    return api.get(url);
  },
  export: (venueId) => api.get(`/venues/${venueId}/audit-logs/export`)
};

// Device APIs
export const deviceAPI = {
  bind: (data) => {
    return api.post(`/devices/bind`, data);
  },
  getBinding: (deviceId) => api.get(`/devices/${deviceId}/binding`)
};

// Print APIs
export const printAPI = {
  list: (venueId, status) =>
    api.get(`/venues/${venueId}/print-jobs${status ? `?status=${status}` : ''}`),
  complete: (jobId) => api.post(`/print-jobs/${jobId}/complete`)
};

// Shift Management APIs
export const shiftAPI = {
  create: (venueId, shiftData) => api.post(`/venues/${venueId}/shifts`, shiftData),
  list: (venueId, userId, date) => {
    let url = `/venues/${venueId}/shifts`;
    const params = [];
    if (userId) params.push(`user_id=${userId}`);
    if (date) params.push(`date=${date}`);
    if (params.length) url += `?${params.join('&')}`;
    return api.get(url);
  },
  getActive: (venueId) => api.get(`/venues/${venueId}/shifts/active`),
  getCurrent: (userId) => api.get(`/users/${userId}/current-shift`),
  checkIn: (venueId, shiftId) => api.post(`/venues/${venueId}/shifts/${shiftId}/check-in`),
  checkOut: (venueId, shiftId) => api.post(`/venues/${venueId}/shifts/${shiftId}/check-out`)
};

// Manager Override APIs
export const managerOverrideAPI = {
  grant: (venueId, userId, reason, durationHours = 4) =>
    api.post(`/venues/${venueId}/manager-override?user_id=${userId}&reason=${encodeURIComponent(reason)}&duration_hours=${durationHours}`),
  check: (venueId, userId) => api.get(`/venues/${venueId}/manager-override/${userId}`),
  list: (venueId) => api.get(`/venues/${venueId}/manager-override`)
};

// Access Control (Nuki) APIs
export const accessControlAPI = {
  // Core
  listDoors: (venueId) => api.get(`/access-control/doors?venue_id=${venueId}`),
  sync: (venueId) => api.post(`/access-control/doors/sync?venue_id=${venueId}`),
  renameDoor: (doorId, name, venueId) => api.post(`/access-control/doors/${doorId}/rename?venue_id=${venueId}`, { display_name: name }),

  // Actions
  unlock: (doorId, venueId, userId) => api.post(`/access-control/doors/${doorId}/unlock?venue_id=${venueId}&user_id=${userId}`),
  lock: (doorId, venueId, userId) => api.post(`/access-control/doors/${doorId}/lock?venue_id=${venueId}&user_id=${userId}`),
  unlatch: (doorId, venueId, userId) => api.post(`/access-control/doors/${doorId}/unlatch?venue_id=${venueId}&user_id=${userId}`),

  // Config (New)
  getConfig: (doorId, venueId) => api.get(`/access-control/doors/${doorId}/config?venue_id=${venueId}`),
  updateConfig: (doorId, config, venueId) => api.post(`/access-control/doors/${doorId}/config?venue_id=${venueId}`, config),

  // Logs (New)
  getAuditLogs: (venueId, limit = 100) => api.get(`/access-control/audit-logs?venue_id=${venueId}&limit=${limit}`),
  getNativeLogs: (doorId, venueId, limit = 50) => api.get(`/access-control/doors/${doorId}/native-logs?venue_id=${venueId}&limit=${limit}`),
  syncLogs: (doorId, venueId) => api.post(`/access-control/doors/${doorId}/sync-logs?venue_id=${venueId}`),

  // Auth (New)
  listAuths: (doorId, venueId) => api.get(`/access-control/doors/${doorId}/auths?venue_id=${venueId}`),
  createAuth: (doorId, name, venueId) => api.post(`/access-control/doors/${doorId}/auths?venue_id=${venueId}`, { name }),
  deleteAuth: (doorId, authId, venueId) => api.delete(`/access-control/doors/${doorId}/auths/${authId}?venue_id=${venueId}`),
  revokeAuth: (id, venueId) => api.delete(`/access-control/keypad/pins/${id}?venue_id=${venueId}`), // Keep for legacy if needed

  // Keypad
  listPins: (venueId, doorId) => api.get(`/access-control/keypad/pins?venue_id=${venueId}${doorId ? `&door_id=${doorId}` : ''}`),
  createPin: (venueId, doorId, name, code, validFrom, validUntil) =>
    api.post(`/access-control/keypad/pins?venue_id=${venueId}`, {
      door_id: doorId, name, code: parseInt(code), valid_from: validFrom, valid_until: validUntil
    }),
  revokePin: (pinId) => api.delete(`/access-control/keypad/pins/${pinId}`)
};

export default api;
