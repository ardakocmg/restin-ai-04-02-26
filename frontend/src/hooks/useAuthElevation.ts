/**
 * useAuthElevation — Progressive Authentication Store
 *
 * Two elevation methods:
 *   - 'password' → 30 min TTL (HR, inventory, settings)
 *   - 'elevated' → 15 min TTL via Google Authenticator (finance, payroll, access control)
 *
 * product_owner bypasses ALL elevation — never sees any modal.
 *
 * Usage:
 *   const { requireElevation, isElevated } = useAuthElevation();
 *   const granted = await requireElevation('password');
 */
import { create } from 'zustand';
import { useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthLevel, AUTH_LEVEL_TTL } from '../lib/roles';

// ─── Zustand Store ────────────────────────────────────────
interface ElevationState {
    /** Timestamp until 'password' level is valid */
    passwordUntil: number | null;
    /** Timestamp until 'elevated' level is valid */
    elevatedUntil: number | null;
    /** Whether the elevation modal is currently showing */
    modalOpen: boolean;
    /** Which level the modal is requesting */
    requestedLevel: AuthLevel | null;
    /** Promise resolver for the current elevation request */
    resolveElevation: ((granted: boolean) => void) | null;

    // Actions
    setElevation: (level: AuthLevel) => void;
    clearElevation: () => void;
    openModal: (level: AuthLevel, resolver: (granted: boolean) => void) => void;
    closeModal: (granted: boolean) => void;
}

export const useElevationStore = create<ElevationState>((set, get) => ({
    passwordUntil: null,
    elevatedUntil: null,
    modalOpen: false,
    requestedLevel: null,
    resolveElevation: null,

    setElevation: (level: AuthLevel) => {
        const ttl = AUTH_LEVEL_TTL[level] ?? 30 * 60 * 1000;
        const until = Date.now() + ttl;

        if (level === 'elevated') {
            // Elevated also grants password-level access
            sessionStorage.setItem('restin_elev_until', String(until));
            sessionStorage.setItem('restin_pw_until', String(until));
            set({ elevatedUntil: until, passwordUntil: until });
        } else if (level === 'password') {
            sessionStorage.setItem('restin_pw_until', String(until));
            set({ passwordUntil: until });
        }
    },

    clearElevation: () => {
        sessionStorage.removeItem('restin_pw_until');
        sessionStorage.removeItem('restin_elev_until');
        set({ passwordUntil: null, elevatedUntil: null });
    },

    openModal: (level: AuthLevel, resolver: (granted: boolean) => void) => {
        set({
            modalOpen: true,
            requestedLevel: level,
            resolveElevation: resolver,
        });
    },

    closeModal: (granted: boolean) => {
        const { resolveElevation } = get();
        resolveElevation?.(granted);
        set({
            modalOpen: false,
            requestedLevel: null,
            resolveElevation: null,
        });
    },
}));

// ─── Restore from sessionStorage on module load ──────────
const storedPw = sessionStorage.getItem('restin_pw_until');
const storedElev = sessionStorage.getItem('restin_elev_until');
if (storedElev && Number(storedElev) > Date.now()) {
    useElevationStore.setState({
        elevatedUntil: Number(storedElev),
        passwordUntil: Number(storedPw) || Number(storedElev),
    });
} else if (storedPw && Number(storedPw) > Date.now()) {
    useElevationStore.setState({
        passwordUntil: Number(storedPw),
    });
}

// ─── Hook ─────────────────────────────────────────────────
export function useAuthElevation() {
    const { user } = useAuth();
    const store = useElevationStore();
    const pendingRef = useRef<Promise<boolean> | null>(null);

    const isSuperAdmin = user?.role?.toLowerCase() === 'product_owner';

    /** Check if current session meets the required auth level */
    const isElevated = useCallback(
        (requiredLevel: AuthLevel): boolean => {
            if (isSuperAdmin) return true;
            if (requiredLevel === 'pin') return true;

            const now = Date.now();
            if (requiredLevel === 'password') {
                return !!(store.passwordUntil && store.passwordUntil > now);
            }
            if (requiredLevel === 'elevated') {
                return !!(store.elevatedUntil && store.elevatedUntil > now);
            }
            return false;
        },
        [isSuperAdmin, store.passwordUntil, store.elevatedUntil]
    );

    /** Request elevation — shows appropriate modal if needed */
    const requireElevation = useCallback(
        (level: AuthLevel): Promise<boolean> => {
            if (isElevated(level)) return Promise.resolve(true);
            if (pendingRef.current) return pendingRef.current;

            const promise = new Promise<boolean>((resolve) => {
                store.openModal(level, (granted: boolean) => {
                    pendingRef.current = null;
                    if (granted) {
                        store.setElevation(level);
                    }
                    resolve(granted);
                });
            });

            pendingRef.current = promise;
            return promise;
        },
        [isElevated, store]
    );

    /** Convenience: require elevation then execute callback */
    const requestAndProceed = useCallback(
        async (level: AuthLevel, onGranted: () => void) => {
            const granted = await requireElevation(level);
            if (granted) onGranted();
        },
        [requireElevation]
    );

    return {
        currentLevel: isSuperAdmin ? 'elevated' as AuthLevel : 'pin' as AuthLevel,
        isElevated,
        requireElevation,
        requestAndProceed,
        modalOpen: store.modalOpen,
        requestedLevel: store.requestedLevel,
        isSuperAdmin,
        clearElevation: store.clearElevation,
    };
}

export default useAuthElevation;
