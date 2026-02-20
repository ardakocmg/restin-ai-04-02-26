// @ts-nocheck
/**
 * SystemService - Version Management (Server-Authoritative)
 * @module services/SystemService
 */
import api from '../lib/api';
import { logger } from '../lib/logger';

export interface VersionInfo {
    version_name: string;
    version_code: string;
    build_id?: string;
    release_channel: 'dev' | 'staging' | 'production';
    source?: 'api' | 'cache' | 'fallback';
}

const FALLBACK_VERSION: VersionInfo = {
    version_name: 'restin.ai v1.0.0',
    version_code: '1.0.0',
    release_channel: 'dev',
    source: 'fallback'
};

class SystemService {
    private cachedVersion: VersionInfo | null = null;

    async getVersion(): Promise<VersionInfo> {
        try {
            const response = await api.get('/system/version');
            this.cachedVersion = { ...response.data, source: 'api' };

            // Cache in localStorage for offline display
            localStorage.setItem('restin_system_version', JSON.stringify(this.cachedVersion));

            return this.cachedVersion as VersionInfo;
        } catch (error: any) {
            logger.error('[SystemService] Failed to fetch version', { error });

            // Fallback to cache
            const cached = localStorage.getItem('restin_system_version');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached) as VersionInfo;
                    return { ...parsed, source: 'cache' };
                } catch {
                    // Parse failed, continue to fallback
                }
            }

            // Ultimate fallback
            return FALLBACK_VERSION;
        }
    }

    getVersionString(): string {
        if (this.cachedVersion) {
            return this.cachedVersion.version_name || 'restin.ai';
        }
        return 'restin.ai';
    }
}

const systemService = new SystemService();
export default systemService;
