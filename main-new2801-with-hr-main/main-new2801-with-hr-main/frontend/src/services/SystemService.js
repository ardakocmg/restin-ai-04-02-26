// SystemService - Version Management (Server-Authoritative)
import api from '../lib/api';

class SystemService {
  constructor() {
    this.cachedVersion = null;
  }

  async getVersion() {
    try {
      const response = await api.get('/system/version');
      this.cachedVersion = response.data;
      
      // Cache in localStorage for offline display
      localStorage.setItem('restin_system_version', JSON.stringify(response.data));
      
      return response.data;
    } catch (error) {
      console.error('[SystemService] Failed to fetch version:', error);
      
      // Fallback to cache
      const cached = localStorage.getItem('restin_system_version');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
      
      // Ultimate fallback
      return {
        version_name: 'restin.ai v1.0.0',
        version_code: '1.0.0',
        release_channel: 'dev',
        source: 'fallback'
      };
    }
  }

  getVersionString() {
    if (this.cachedVersion) {
      return this.cachedVersion.version_name || 'restin.ai';
    }
    return 'restin.ai';
  }
}

const systemService = new SystemService();
export default systemService;
