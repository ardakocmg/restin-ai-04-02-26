import { logger } from './logger';

// AuthStore - Single Source of Truth for Authentication

interface AuthEvent {
  type: 'TOKEN_UPDATED' | 'TOKEN_CLEARED' | 'USER_UPDATED';
  token?: string;
  user?: /**/any;
}

type AuthListener = (event: AuthEvent) => void;

class AuthStore {
  private readonly TOKEN_KEY = 'restin_token';
  private readonly USER_KEY = 'restin_user';
  private readonly API_HOST_KEY = 'restin_api_host';
  private listeners: AuthListener[] = [];

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    if (!token) {
      logger.error('Attempted to set null/undefined token');
      return;
    }
    localStorage.setItem(this.TOKEN_KEY, token);
    this.notify({ type: 'TOKEN_UPDATED', token });
  }

  clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.notify({ type: 'TOKEN_CLEARED' });
  }

  getUser(): /**/any | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  setUser(user: /**/any): void {
    if (!user) {
      logger.error('Attempted to set null/undefined user');
      return;
    }
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.notify({ type: 'USER_UPDATED', user });
  }

  setAuth(token: string, user: /**/any): void {
    this.setToken(token);
    this.setUser(user);
  }

  clearAuth(): void {
    this.clearToken();
  }

  // BaseURL guard
  getLastKnownApiHost(): string | null {
    return localStorage.getItem(this.API_HOST_KEY);
  }

  setLastKnownApiHost(host: string): void {
    localStorage.setItem(this.API_HOST_KEY, host);
  }

  checkApiHostChanged(currentHost: string): boolean {
    const lastHost = this.getLastKnownApiHost();
    if (lastHost && lastHost !== currentHost) {
      logger.warn(`API host changed: ${lastHost} → ${currentHost}`);
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
  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = (payload.exp as number) * 1000;
      return exp > Date.now();
    } catch {
      return false;
    }
  }

  getTokenExpiry(): number | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return (payload.exp as number) * 1000; // milliseconds
    } catch {
      return null;
    }
  }

  // Subscribe to auth changes
  subscribe(callback: AuthListener): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notify(event: AuthEvent): void {
    this.listeners.forEach(cb => cb(event));
  }
}

// Singleton instance
const authStore = new AuthStore();
export default authStore;
