import { createContext, useContext, useState, useEffect } from "react";
import authStore from "../lib/AuthStore";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
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

  const login = (authToken, userData) => {
    console.log('[AuthContext] Login called with token:', !!authToken);
    setUser(userData);
    setToken(authToken);
    authStore.setAuth(authToken, userData);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    authStore.clearAuth();
  };

  const isOwner = () => user?.role === "owner";
  const isManager = () => user?.role === "manager" || isOwner();
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
