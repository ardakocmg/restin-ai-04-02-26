/**
 * UIContext - Global UI state (loading, modals, errors)
 * @module context/UIContext
 */
import { createContext,ReactNode,useCallback,useContext,useState } from 'react';

export interface LoadingState {
    open: boolean;
    title: string;
    body: string;
}

export interface ModalErrorState {
    title: string;
    body: string;
    onRetry?: () => void;
}

export interface UIContextValue {
    loading: LoadingState;
    showLoading: (title?: string, body?: string) => void;
    hideLoading: () => void;
    modalError: ModalErrorState | null;
    showErrorModal: (title: string, body: string, onRetry?: () => void) => void;
    hideErrorModal: () => void;
    authExpiredModalOpen: boolean;
    openAuthExpiredModal: () => void;
    closeAuthExpiredModal: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

interface UIProviderProps {
    children: ReactNode;
}

export function UIProvider({ children }: UIProviderProps): JSX.Element {
    const [loading, setLoading] = useState<LoadingState>({ open: false, title: 'Loading…', body: 'Please wait…' });
    const [modalError, setModalError] = useState<ModalErrorState | null>(null);
    const [authExpiredModalOpen, setAuthExpiredModalOpen] = useState(false);

    const showLoading = useCallback((title?: string, body?: string) => {
        setLoading({ open: true, title: title || 'Loading…', body: body || 'Please wait…' });
    }, []);

    const hideLoading = useCallback(() => {
        setLoading((p) => ({ ...p, open: false }));
    }, []);

    const showErrorModal = useCallback((title: string, body: string, onRetry?: () => void) => {
        setModalError({ title, body, onRetry });
    }, []);

    const hideErrorModal = useCallback(() => setModalError(null), []);

    const openAuthExpiredModal = useCallback(() => {
        setAuthExpiredModalOpen(true);
    }, []);

    const closeAuthExpiredModal = useCallback(() => {
        setAuthExpiredModalOpen(false);
    }, []);

    const value: UIContextValue = {
        loading,
        showLoading,
        hideLoading,
        modalError,
        showErrorModal,
        hideErrorModal,
        authExpiredModalOpen,
        openAuthExpiredModal,
        closeAuthExpiredModal
    };

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
}

export function useUI(): UIContextValue {
    const ctx = useContext(UIContext);
    if (!ctx) throw new Error('useUI must be used within UIProvider');
    return ctx;
}
