import React, { createContext, useContext, useState, useCallback } from "react";

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [loading, setLoading] = useState({ open: false, title: "Loading…", body: "Please wait…" });
  const [modalError, setModalError] = useState(null); // {title, body, onRetry}
  const [authExpiredModalOpen, setAuthExpiredModalOpen] = useState(false);

  const showLoading = useCallback((title, body) => {
    setLoading({ open: true, title: title || "Loading…", body: body || "Please wait…" });
  }, []);

  const hideLoading = useCallback(() => {
    setLoading((p) => ({ ...p, open: false }));
  }, []);

  const showErrorModal = useCallback((title, body, onRetry) => {
    setModalError({ title, body, onRetry });
  }, []);

  const hideErrorModal = useCallback(() => setModalError(null), []);

  const openAuthExpiredModal = useCallback(() => {
    setAuthExpiredModalOpen(true);
  }, []);

  const closeAuthExpiredModal = useCallback(() => {
    setAuthExpiredModalOpen(false);
  }, []);

  return (
    <UIContext.Provider value={{
      loading, showLoading, hideLoading,
      modalError, showErrorModal, hideErrorModal,
      authExpiredModalOpen, openAuthExpiredModal, closeAuthExpiredModal
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
