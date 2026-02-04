// AuthService - Token Management (Single Source)
const TOKEN_KEY = 'restin_access_token';
const REFRESH_KEY = 'restin_refresh_token';
const EXPIRES_KEY = 'restin_token_expires';
const BUILD_KEY = 'restin_build_id';

export const AuthService = {
  getAccessToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY);
  },

  setTokens({ access_token, refresh_token, expires_at, build_id }) {
    if (access_token) localStorage.setItem(TOKEN_KEY, access_token);
    if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
    if (expires_at) localStorage.setItem(EXPIRES_KEY, expires_at);
    if (build_id) localStorage.setItem(BUILD_KEY, build_id);
  },

  clearTokens(reason) {
    console.log('[Auth] Clearing tokens:', reason);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EXPIRES_KEY);
  },

  getLastBuildId() {
    return localStorage.getItem(BUILD_KEY);
  },

  setLastBuildId(buildId) {
    localStorage.setItem(BUILD_KEY, buildId);
  }
};

export default AuthService;
