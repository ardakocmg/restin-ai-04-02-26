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

        if (storedToken && storedUser && authStore.isTokenValid()) {
            setToken(storedToken);
            setUser(storedUser);
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
        authStore.setAuth(authToken, userData);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        authStore.clearAuth();
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
