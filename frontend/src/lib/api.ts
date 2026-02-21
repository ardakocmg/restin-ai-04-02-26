import axios,{ type AxiosResponse,type InternalAxiosRequestConfig } from "axios";
import authStore from "./AuthStore";
import { logger } from "./logger";

// Production: api.restin.ai (custom domain → Render) | Dev: localhost
const PRODUCTION_BACKEND = 'https://api.restin.ai';
const isProduction = window.location.hostname === 'restin.ai' || window.location.hostname === 'www.restin.ai';
const BACKEND_BASE = process.env.REACT_APP_BACKEND_URL || (isProduction ? PRODUCTION_BACKEND : `http://${window.location.hostname}:8000`);
const API = `${BACKEND_BASE}/api/`;

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
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
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

interface QueueItem {
  resolve: (value: string | PromiseLike<string>) => void;
  reject: (reason: unknown) => void;
}

let requestQueue: QueueItem[] = [];

function processQueue(error: unknown, newToken: string | null = null): void {
  requestQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(newToken as string);
    }
  });
  requestQueue = [];
}

async function refreshToken(): Promise<string> {
  const token = authStore.getToken();
  if (!token) throw new Error('No token to refresh');

  const response: AxiosResponse = await axios.post(
    `${BACKEND_BASE}/api/auth/refresh`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const newToken: string = response.data.accessToken;
  const user: /**/any = response.data.user;

  authStore.setAuth(newToken, user);

  return newToken;
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    const axiosError = error as { config: InternalAxiosRequestConfig & { __retried?: boolean }; response?: { status: number } };
    const originalRequest = axiosError.config;

    if (axiosError.response?.status === 401 && !originalRequest.__retried) {
      originalRequest.__retried = true;

      // If refresh already in progress, queue this request
      if (isRefreshing) {
        try {
          const newToken: string = await new Promise<string>((resolve, reject) => {
            requestQueue.push({ resolve, reject });
          });

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (err: unknown) {
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

      } catch (refreshError: unknown) {
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
  loginWithPin: (pin: string, app: string, deviceId: string | null, stationId: string | null = null): Promise<AxiosResponse> => {
    const backendUrl = BACKEND_BASE;
    const url = `${backendUrl}/api/auth/login/pin?pin=${pin}&app=${app}${deviceId ? `&deviceId=${deviceId}` : ''}${stationId ? `&stationId=${stationId}` : ''}`;
    return axios.post(url, null, { timeout: 8000 });
  },
  // Credentials login (email, username, or employee ID + password)
  loginWithCredentials: ({ identifier, password, target, deviceId }: { identifier: string; password: string; target: string; deviceId: string | null }): Promise<AxiosResponse> => {
    const backendUrl = BACKEND_BASE;
    return axios.post(`${backendUrl}/api/auth/login/credentials`, {
      identifier,
      password,
      app: target,
      deviceId,
    });
  },
  // Legacy venue-based login (kept for backwards compatibility)
  login: (venueId: string, pin: string, deviceId: string | null): Promise<AxiosResponse> =>
    axios.post(`${API}/auth/login?venue_id=${venueId}&pin=${pin}${deviceId ? `&device_id=${deviceId}` : ''}`),
  verifyMFA: (userId: string, totpCode: string, deviceId: string | null): Promise<AxiosResponse> =>
    axios.post(`${API}/auth/verify-mfa?user_id=${userId}&totp_code=${totpCode}${deviceId ? `&device_id=${deviceId}` : ''}`),
  setupMFA: (): Promise<AxiosResponse> => api.post("/auth/setup-mfa"),
  enableMFA: (totpCode: string): Promise<AxiosResponse> => api.post(`/auth/enable-mfa?totp_code=${totpCode}`),
  // Super Owner first-run setup
  checkSetupRequired: (): Promise<AxiosResponse> => {
    const backendUrl = BACKEND_BASE;
    return axios.get(`${backendUrl}/api/auth/setup/status`);
  },
  setupSuperOwner: (data: /**/any): Promise<AxiosResponse> => {
    const backendUrl = BACKEND_BASE;
    return axios.post(`${backendUrl}/api/auth/setup`, data);
  },
  // Progressive Auth Elevation — verify password or TOTP to unlock sensitive areas
  elevateAuth: (body: /**/any): Promise<AxiosResponse> => api.post('/auth/elevate', body),
};

// Venue APIs
export const venueAPI = {
  list: (): Promise<AxiosResponse> => api.get("/venues"),
  get: (id: string): Promise<AxiosResponse> => api.get(`/venues/${id}`),
  create: (data: /**/any): Promise<AxiosResponse> => api.post("/venues", data),
  update: (id: string, data: /**/any): Promise<AxiosResponse> => api.put(`/venues/${id}`, data),
  getZones: (venueId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/zones`),
  createZone: (data: /**/any): Promise<AxiosResponse> => api.post("/zones", data),
  getTables: (venueId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/tables`),
  createTable: (data: /**/any): Promise<AxiosResponse> => api.post("/tables", data),
  updateTable: (tableId: string, data: /**/any): Promise<AxiosResponse> => api.put(`/tables/${tableId}`, data),
  deleteTable: (tableId: string): Promise<AxiosResponse> => api.delete(`/tables/${tableId}`),
  getStats: (venueId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/stats`),
  getOrders: (venueId: string, status?: string, tableId?: string): Promise<AxiosResponse> => {
    const params: string[] = [];
    if (status) params.push(`status=${status}`);
    if (tableId) params.push(`table_id=${tableId}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return api.get(`/venues/${venueId}/orders${query}`);
  }
};

// User APIs
export const userAPI = {
  list: (venueId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/users`),
  create: (data: /**/any): Promise<AxiosResponse> => api.post("/users", data)
};

// Public content APIs
export const publicContentAPI = {
  getCurrent: (type: string): Promise<AxiosResponse> => api.get("/public-content/current", { params: { type } }),
  listVersions: (type: string): Promise<AxiosResponse> => api.get("/public-content/versions", { params: { type } }),
  createVersion: (payload: /**/any): Promise<AxiosResponse> => api.post("/public-content", payload),
  updateVersion: (id: string, payload: /**/any): Promise<AxiosResponse> => api.patch(`/public-content/${id}`, payload),
  approveVersion: (id: string): Promise<AxiosResponse> => api.post(`/public-content/${id}/approve`),
  previewVersion: (id: string): Promise<AxiosResponse> => api.get(`/public-content/preview/${id}`),
  syncModules: (): Promise<AxiosResponse> => api.post('/public-content/sync-modules')
};

// Table preferences
export const tablePreferencesAPI = {
  get: (tableId: string, venueId: string): Promise<AxiosResponse> => api.get('/table-preferences', { params: { table_id: tableId, venue_id: venueId } }),
  upsert: (payload: /**/any): Promise<AxiosResponse> => api.post('/table-preferences', payload)
};

export const tablePresetsAPI = {
  list: (tableId: string, venueId: string): Promise<AxiosResponse> => api.get('/table-presets', { params: { table_id: tableId, venue_id: venueId } }),
  create: (payload: /**/any): Promise<AxiosResponse> => api.post('/table-presets', payload),
  remove: (id: string): Promise<AxiosResponse> => api.delete(`/table-presets/${id}`)
};

export const hrFeatureFlagsAPI = {
  get: (venueId: string): Promise<AxiosResponse> => api.get('/hr/feature-flags', { params: { venue_id: venueId } }),
  update: (payload: /**/any): Promise<AxiosResponse> => api.post('/hr/feature-flags', payload)
};

export const hrAuditAPI = {
  list: (venueId: string, page = 1, pageSize = 50): Promise<AxiosResponse> => api.get('/hr/audit-logs', { params: { venue_id: venueId, page, page_size: pageSize } })
};

export const updatesAPI = {
  listChanges: (published = false): Promise<AxiosResponse> => api.get('/updates/changes', { params: { published } }),
  createChange: (payload: /**/any): Promise<AxiosResponse> => api.post('/updates/changes', payload),
  publish: (): Promise<AxiosResponse> => api.post('/updates/publish'),
  listReleases: (view = 'user'): Promise<AxiosResponse> => api.get('/updates/releases', { params: { view } })
};

// Menu APIs
export const menuAPI = {
  // Menus
  listMenus: (venueId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/menus`),
  getActiveMenu: (venueId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/menus/active`),
  createMenu: (data: /**/any): Promise<AxiosResponse> => api.post("/menus", data),
  updateMenu: (menuId: string, data: /**/any): Promise<AxiosResponse> => api.put(`/menus/${menuId}`, data),

  // Categories
  getCategories: (venueId: string, menuId?: string): Promise<AxiosResponse> =>
    api.get(`/venues/${venueId}/menu/categories${menuId ? `?menu_id=${menuId}` : ''}`),
  createCategory: (data: /**/any): Promise<AxiosResponse> => api.post("/menu/categories", data),
  updateCategory: (categoryId: string, data: /**/any): Promise<AxiosResponse> => api.put(`/menu/categories/${categoryId}`, data),
  deleteCategory: (categoryId: string): Promise<AxiosResponse> => api.delete(`/menu/categories/${categoryId}`),

  // Items
  getItems: (venueId: string, categoryId?: string, menuId?: string, includeInactive?: boolean): Promise<AxiosResponse> => {
    const params: string[] = [];
    if (categoryId) params.push(`category_id=${categoryId}`);
    if (menuId) params.push(`menu_id=${menuId}`);
    if (includeInactive) params.push(`include_inactive=true`);
    return api.get(`/venues/${venueId}/menu/items${params.length ? `?${params.join('&')}` : ''}`);
  },
  getItem: (itemId: string): Promise<AxiosResponse> => api.get(`/menu/items/${itemId}`),
  createItem: (data: /**/any): Promise<AxiosResponse> => api.post("/menu/items", data),
  updateItem: (itemId: string, data: /**/any): Promise<AxiosResponse> => api.put(`/menu/items/${itemId}`, data),
  deleteItem: (itemId: string): Promise<AxiosResponse> => api.delete(`/menu/items/${itemId}`)
};

// Order APIs
export const orderAPI = {
  list: (venueId: string, status?: string, tableId?: string): Promise<AxiosResponse> => {
    let url = `/venues/${venueId}/orders`;
    const params: string[] = [];
    if (status) params.push(`status=${status}`);
    if (tableId) params.push(`table_id=${tableId}`);
    if (params.length) url += `?${params.join('&')}`;
    return api.get(url);
  },
  get: (orderId: string): Promise<AxiosResponse> => api.get(`/orders/${orderId}`),
  create: (data: /**/any): Promise<AxiosResponse> => api.post("/orders", data),
  addItem: (orderId: string, data: /**/any): Promise<AxiosResponse> => api.post(`/orders/${orderId}/items`, data),
  send: (orderId: string): Promise<AxiosResponse> => api.post(`/orders/${orderId}/send`),
  transfer: (orderId: string, newTableId: string): Promise<AxiosResponse> => api.post(`/orders/${orderId}/transfer?new_table_id=${newTableId}`),
  split: (orderId: string, seatNumbers: number[]): Promise<AxiosResponse> => api.post(`/orders/${orderId}/split`, { seat_numbers: seatNumbers }),
  merge: (orderId: string, mergeOrderId: string): Promise<AxiosResponse> => api.post(`/orders/${orderId}/merge?merge_order_id=${mergeOrderId}`),
  close: (orderId: string): Promise<AxiosResponse> => api.post(`/orders/${orderId}/close`),
  offlineSync: (orders: /**/any[]): Promise<AxiosResponse> => api.post("/orders/offline-sync", orders),
  getReviewStatus: (orderId: string): Promise<AxiosResponse> => api.get(`/orders/${orderId}/review-status`),
  overrideReview: (orderId: string, reason: string): Promise<AxiosResponse> => api.post(`/orders/${orderId}/override-review?reason=${encodeURIComponent(reason)}`)
};

// KDS APIs
export const kdsAPI = {
  getTickets: (venueId: string, prepArea?: string, status?: string): Promise<AxiosResponse> => {
    let url = `/venues/${venueId}/kds/tickets`;
    const params: string[] = [];
    if (prepArea) params.push(`prep_area=${prepArea}`);
    if (status) params.push(`status=${status}`);
    if (params.length) url += `?${params.join('&')}`;
    return api.get(url);
  },
  startTicket: (ticketId: string): Promise<AxiosResponse> => api.post(`/kds/tickets/${ticketId}/start`),
  readyTicket: (ticketId: string): Promise<AxiosResponse> => api.post(`/kds/tickets/${ticketId}/ready`)
};

// Inventory APIs
export const inventoryAPI = {
  list: (venueId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/inventory`),
  createItem: (data: /**/any): Promise<AxiosResponse> => api.post("/inventory/items", data),
  addLedgerEntry: (itemId: string, action: string, quantity: number, reason?: string, lotNumber?: string, expiryDate?: string, poId?: string): Promise<AxiosResponse> => {
    let url = `/inventory/ledger?item_id=${itemId}&action=${action}&quantity=${quantity}`;
    if (reason) url += `&reason=${encodeURIComponent(reason)}`;
    if (lotNumber) url += `&lot_number=${lotNumber}`;
    if (expiryDate) url += `&expiry_date=${expiryDate}`;
    if (poId) url += `&po_id=${poId}`;
    return api.post(url);
  },
  getLedger: (venueId: string, itemId?: string): Promise<AxiosResponse> =>
    api.get(`/venues/${venueId}/inventory/ledger${itemId ? `?item_id=${itemId}` : ''}`),
  getVariance: (venueId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/inventory/variance`)
};

// Procurement APIs
export const procurementAPI = {
  listPOs: (venueId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/purchase-orders`),
  createPO: (data: /**/any): Promise<AxiosResponse> => api.post("/purchase-orders", data),
  receiveDelivery: (poId: string, items: /**/any[]): Promise<AxiosResponse> => api.post(`/purchase-orders/${poId}/receive`, items)
};

// Document APIs
export const documentAPI = {
  list: (venueId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/documents`),
  upload: (venueId: string, file: File): Promise<AxiosResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/documents/upload?venue_id=${venueId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  },
  get: (docId: string): Promise<AxiosResponse> => api.get(`/documents/${docId}`),
  approve: (docId: string): Promise<AxiosResponse> => api.post(`/documents/${docId}/approve`)
};

// Review Risk APIs
export const reviewAPI = {
  getDashboard: (venueId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/review-risk`)
};

// Audit Log APIs
export const auditAPI = {
  list: (venueId: string, resourceType?: string, action?: string, limit?: number): Promise<AxiosResponse> => {
    let url = `/venues/${venueId}/audit-logs`;
    const params: string[] = [];
    if (resourceType) params.push(`resource_type=${resourceType}`);
    if (action) params.push(`action=${action}`);
    if (limit) params.push(`limit=${limit}`);
    if (params.length) url += `?${params.join('&')}`;
    return api.get(url);
  },
  export: (venueId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/audit-logs/export`)
};

// Device APIs
export const deviceAPI = {
  bind: (data: /**/any): Promise<AxiosResponse> => {
    return api.post(`/devices/bind`, data);
  },
  getBinding: (deviceId: string): Promise<AxiosResponse> => api.get(`/devices/${deviceId}/binding`)
};

// Print APIs
export const printAPI = {
  list: (venueId: string, status?: string): Promise<AxiosResponse> =>
    api.get(`/venues/${venueId}/print-jobs${status ? `?status=${status}` : ''}`),
  complete: (jobId: string): Promise<AxiosResponse> => api.post(`/print-jobs/${jobId}/complete`)
};

// Shift Management APIs
export const shiftAPI = {
  create: (venueId: string, shiftData: /**/any): Promise<AxiosResponse> => api.post(`/venues/${venueId}/shifts`, shiftData),
  list: (venueId: string, userId?: string, date?: string): Promise<AxiosResponse> => {
    let url = `/venues/${venueId}/shifts`;
    const params: string[] = [];
    if (userId) params.push(`user_id=${userId}`);
    if (date) params.push(`date=${date}`);
    if (params.length) url += `?${params.join('&')}`;
    return api.get(url);
  },
  getActive: (venueId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/shifts/active`),
  getCurrent: (userId: string): Promise<AxiosResponse> => api.get(`/users/${userId}/current-shift`),
  checkIn: (venueId: string, shiftId: string): Promise<AxiosResponse> => api.post(`/venues/${venueId}/shifts/${shiftId}/check-in`),
  checkOut: (venueId: string, shiftId: string): Promise<AxiosResponse> => api.post(`/venues/${venueId}/shifts/${shiftId}/check-out`)
};

// Manager Override APIs
export const managerOverrideAPI = {
  grant: (venueId: string, userId: string, reason: string, durationHours = 4): Promise<AxiosResponse> =>
    api.post(`/venues/${venueId}/manager-override?user_id=${userId}&reason=${encodeURIComponent(reason)}&duration_hours=${durationHours}`),
  check: (venueId: string, userId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/manager-override/${userId}`),
  list: (venueId: string): Promise<AxiosResponse> => api.get(`/venues/${venueId}/manager-override`)
};

// Access Control (Nuki) APIs
export const accessControlAPI = {
  // Core
  listDoors: (venueId: string): Promise<AxiosResponse> => api.get(`/access-control/doors?venue_id=${venueId}`),
  sync: (venueId: string): Promise<AxiosResponse> => api.post(`/access-control/doors/sync?venue_id=${venueId}`),
  renameDoor: (doorId: string, name: string, venueId: string): Promise<AxiosResponse> => api.post(`/access-control/doors/${doorId}/rename?venue_id=${venueId}`, { display_name: name }),

  // Actions
  unlock: (doorId: string, venueId: string, userId: string): Promise<AxiosResponse> => api.post(`/access-control/doors/${doorId}/unlock?venue_id=${venueId}&user_id=${userId}`),
  lock: (doorId: string, venueId: string, userId: string): Promise<AxiosResponse> => api.post(`/access-control/doors/${doorId}/lock?venue_id=${venueId}&user_id=${userId}`),
  unlatch: (doorId: string, venueId: string, userId: string): Promise<AxiosResponse> => api.post(`/access-control/doors/${doorId}/unlatch?venue_id=${venueId}&user_id=${userId}`),

  // Config (New)
  getConfig: (doorId: string, venueId: string): Promise<AxiosResponse> => api.get(`/access-control/doors/${doorId}/config?venue_id=${venueId}`),
  updateConfig: (doorId: string, config: /**/any, venueId: string): Promise<AxiosResponse> => api.post(`/access-control/doors/${doorId}/config?venue_id=${venueId}`, config),

  // Logs (New)
  getAuditLogs: (venueId: string, limit = 100): Promise<AxiosResponse> => api.get(`/access-control/audit-logs?venue_id=${venueId}&limit=${limit}`),
  getNativeLogs: (doorId: string, venueId: string, limit = 50): Promise<AxiosResponse> => api.get(`/access-control/doors/${doorId}/native-logs?venue_id=${venueId}&limit=${limit}`),
  syncLogs: (doorId: string, venueId: string): Promise<AxiosResponse> => api.post(`/access-control/doors/${doorId}/sync-logs?venue_id=${venueId}`),

  // Auth (New)
  listAuths: (doorId: string, venueId: string): Promise<AxiosResponse> => api.get(`/access-control/doors/${doorId}/auths?venue_id=${venueId}`),
  createAuth: (doorId: string, name: string, venueId: string): Promise<AxiosResponse> => api.post(`/access-control/doors/${doorId}/auths?venue_id=${venueId}`, { name }),
  deleteAuth: (doorId: string, authId: string, venueId: string): Promise<AxiosResponse> => api.delete(`/access-control/doors/${doorId}/auths/${authId}?venue_id=${venueId}`),
  revokeAuth: (id: string, venueId: string): Promise<AxiosResponse> => api.delete(`/access-control/keypad/pins/${id}?venue_id=${venueId}`), // Keep for legacy if needed

  // Keypad
  listPins: (venueId: string, doorId?: string): Promise<AxiosResponse> => api.get(`/access-control/keypad/pins?venue_id=${venueId}${doorId ? `&door_id=${doorId}` : ''}`),
  createPin: (venueId: string, doorId: string, name: string, code: string, validFrom: string | null, validUntil: string | null): Promise<AxiosResponse> =>
    api.post(`/access-control/keypad/pins?venue_id=${venueId}`, {
      door_id: doorId, name, code: parseInt(code), valid_from: validFrom, valid_until: validUntil
    }),
  revokePin: (pinId: string): Promise<AxiosResponse> => api.delete(`/access-control/keypad/pins/${pinId}`)
};

export default api;
