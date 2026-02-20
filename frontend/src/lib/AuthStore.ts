// @ts-nocheck
// AuthStore - Single Source of Truth for Authentication
class AuthStore {
  constructor() {
    this.TOKEN_KEY = 'restin_token';
    this.USER_KEY = 'restin_user';
    this.API_HOST_KEY = 'restin_api_host';
    this.listeners = [];
  }

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token) {
    if (!token) {
      console.error('Attempted to set null/undefined token');
      return;
    }
    localStorage.setItem(this.TOKEN_KEY, token);
    this.notify({ type: 'TOKEN_UPDATED', token });
  }

  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.notify({ type: 'TOKEN_CLEARED' });
  }

  getUser() {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  setUser(user) {
    if (!user) {
      console.error('Attempted to set null/undefined user');
      return;
    }
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.notify({ type: 'USER_UPDATED', user });
  }

  setAuth(token, user) {
    this.setToken(token);
    this.setUser(user);
  }

  clearAuth() {
    this.clearToken();
  }

  // BaseURL guard
  getLastKnownApiHost() {
    return localStorage.getItem(this.API_HOST_KEY);
  }

  setLastKnownApiHost(host) {
    localStorage.setItem(this.API_HOST_KEY, host);
  }

  checkApiHostChanged(currentHost) {
    const lastHost = this.getLastKnownApiHost();
    if (lastHost && lastHost !== currentHost) {
      console.warn(`API host changed: ${lastHost} → ${currentHost}`);
      this.clearAuth();
      this.setLastKnownApiHost(currentHost);
      return true; // Changed
    }
    if (!lastHost) {
      this.setLastKnownApiHost(currentHost);
    }
    return false; // Not changed
  }

  // Token validation
  isTokenValid() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      return exp > Date.now();
    } catch {
      return false;
    }
  }

  getTokenExpiry() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // milliseconds
    } catch {
      return null;
    }
  }

  // Subscribe to auth changes
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify(event) {
    this.listeners.forEach(cb => cb(event));
  }
}

// Singleton instance
const authStore = new AuthStore();
export default authStore;
