import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import authStore from "../../lib/AuthStore";
import { User } from "../../types";
import { AuthContextType } from "./types";
import { logger } from "../../lib/logger";

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load from AuthStore (Single Source of Truth)
        const storedToken = authStore.getToken();
        const storedUser = authStore.getUser();

        // Guard: detect corrupt data from login param swap bug
        // If token looks like JSON (starts with { or [), it's actually user data stored as token
        if (storedToken && (storedToken.startsWith('{') || storedToken.startsWith('['))) {
            logger.warn('Corrupt auth detected (token is JSON object), clearing');
            authStore.clearAuth();
            setLoading(false);
            return;
        }

        if (storedToken && storedUser && authStore.isTokenValid()) {
            // Extra check: ensure user has required fields
            if (storedUser.id && storedUser.role) {
                setToken(storedToken);
                setUser(storedUser as unknown as User);
            } else {
                logger.warn('Stored user missing required fields, clearing auth');
                authStore.clearAuth();
            }
        } else if (storedToken && !authStore.isTokenValid()) {
            // Token expired, clear it
            authStore.clearAuth();
        }
        setLoading(false);
    }, []);

    const login = (userData: User, authToken: string) => {
        logger.info('Login called', { hasToken: !!authToken, userName: userData?.name });
        setUser(userData);
        setToken(authToken);
        authStore.setAuth(authToken, userData as any);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        authStore.clearAuth();
        // Clear progressive auth elevation
        sessionStorage.removeItem('restin_pw_until');
        sessionStorage.removeItem('restin_elev_until');
    };

    const isOwner = () => {
        const role = user?.role?.toLowerCase();
        return role === "owner" || role === "product_owner";
    };
    const isManager = () => {
        const role = user?.role?.toLowerCase();
        return role === "manager" || isOwner();
    };
    const isStaff = () => !!user;

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            login,
            logout,
            isOwner,
            isManager,
            isStaff,
            isAuthenticated: !!token
        }}>
            {children}
        </AuthContext.Provider>
    );
};
