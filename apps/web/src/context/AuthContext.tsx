'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({
    user: { id: 'user_1', name: 'Admin User', role: 'admin' },
    isAuthenticated: true,
    loading: false,
    login: () => { },
    logout: () => { }
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <AuthContext.Provider value={{
            user: { id: 'user_1', name: 'Admin User', role: 'admin' },
            isAuthenticated: true,
            loading: false,
            login: () => { },
            logout: () => { }
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
