/**
 * AuthService - Token Management (Single Source)
 * @module services/AuthService
 */
import { logger } from '../lib/logger';

const TOKEN_KEY = 'restin_access_token';
const REFRESH_KEY = 'restin_refresh_token';
const EXPIRES_KEY = 'restin_token_expires';
const BUILD_KEY = 'restin_build_id';

export interface TokenData {
    access_token?: string;
    refresh_token?: string;
    expires_at?: string;
    build_id?: string;
}

export const AuthService = {
    getAccessToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    },

    getRefreshToken(): string | null {
        return localStorage.getItem(REFRESH_KEY);
    },

    setTokens({ access_token, refresh_token, expires_at, build_id }: TokenData): void {
        if (access_token) localStorage.setItem(TOKEN_KEY, access_token);
        if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
        if (expires_at) localStorage.setItem(EXPIRES_KEY, expires_at);
        if (build_id) localStorage.setItem(BUILD_KEY, build_id);
    },

    clearTokens(reason?: string): void {
        logger.info('Clearing tokens', { reason });
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(EXPIRES_KEY);
    },

    getLastBuildId(): string | null {
        return localStorage.getItem(BUILD_KEY);
    },

    setLastBuildId(buildId: string): void {
        localStorage.setItem(BUILD_KEY, buildId);
    },

    isTokenExpired(): boolean {
        const expiresAt = localStorage.getItem(EXPIRES_KEY);
        if (!expiresAt) return true;
        return new Date(expiresAt) < new Date();
    }
};

export default AuthService;
