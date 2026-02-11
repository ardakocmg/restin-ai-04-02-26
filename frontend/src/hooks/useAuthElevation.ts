/**
 * useAuthElevation — Progressive Authentication Elevation Store
 *
 * Tracks the current session's auth level (pin → password → elevated/2FA).
 * product_owner always bypasses all elevation checks.
 *
 * Usage:
 *   const { requireElevation, isElevated } = useAuthElevation();
 *
 *   // Check if already elevated
 *   if (!isElevated('password')) {
 *     const granted = await requireElevation('password');
 *     if (!granted) return;
 *   }
 *
 *   // Or use the requestAndProceed helper
 *   requestAndProceed('elevated', () => { doSensitiveThing(); });
 */
import { create } from 'zustand';
import { useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────
export type AuthLevel = 'pin' | 'password' | 'elevated';

interface ElevationState {
    /** Current highest confirmed auth level */
    currentLevel: AuthLevel;
    /** Timestamp until password elevation is valid */
    passwordUntil: number | null;
    /** Timestamp until 2FA elevation is valid */
    elevatedUntil: number | null;
    /** Whether the elevation modal is currently showing */
    modalOpen: boolean;
    /** Which level the modal is requesting */
    requestedLevel: AuthLevel | null;
    /** Promise resolver for the current elevation request */
    resolveElevation: ((granted: boolean) => void) | null;

    // ─── Actions ─────────────────────────────────────
    setElevation: (level: AuthLevel, ttlMs: number) => void;
    clearElevation: () => void;
    openModal: (level: AuthLevel, resolver: (granted: boolean) => void) => void;
    closeModal: (granted: boolean) => void;
}

// TTLs
const PASSWORD_TTL_MS = 30 * 60 * 1000; // 30 minutes
const ELEVATED_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ─── Zustand Store ────────────────────────────────────────
export const useElevationStore = create<ElevationState>((set, get) => ({
    currentLevel: 'pin',
    passwordUntil: null,
    elevatedUntil: null,
    modalOpen: false,
    requestedLevel: null,
    resolveElevation: null,

    setElevation: (level: AuthLevel, ttlMs: number) => {
        const until = Date.now() + ttlMs;

        // Store in sessionStorage so it survives page refreshes (but not tab close)
        if (level === 'password') {
            sessionStorage.setItem('restin_pw_until', String(until));
            set({ currentLevel: level, passwordUntil: until });
        } else if (level === 'elevated') {
            sessionStorage.setItem('restin_elev_until', String(until));
            set({ currentLevel: level, elevatedUntil: until, passwordUntil: until });
        }
    },

    clearElevation: () => {
        sessionStorage.removeItem('restin_pw_until');
        sessionStorage.removeItem('restin_elev_until');
        set({
            currentLevel: 'pin',
            passwordUntil: null,
            elevatedUntil: null,
        });
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
        currentLevel: 'elevated',
        elevatedUntil: Number(storedElev),
        passwordUntil: Number(storedPw) || Number(storedElev),
    });
} else if (storedPw && Number(storedPw) > Date.now()) {
    useElevationStore.setState({
        currentLevel: 'password',
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
            // Super-admin bypasses all elevation
            if (isSuperAdmin) return true;

            // PIN level = always granted (base login)
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

    /** Request elevation — returns a promise that resolves to true/false */
    const requireElevation = useCallback(
        (level: AuthLevel): Promise<boolean> => {
            // Already elevated? Resolve immediately
            if (isElevated(level)) return Promise.resolve(true);

            // Prevent duplicate modals
            if (pendingRef.current) return pendingRef.current;

            const promise = new Promise<boolean>((resolve) => {
                store.openModal(level, (granted: boolean) => {
                    pendingRef.current = null;
                    if (granted) {
                        const ttl = level === 'elevated' ? ELEVATED_TTL_MS : PASSWORD_TTL_MS;
                        store.setElevation(level, ttl);
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
        /** Current auth level */
        currentLevel: isSuperAdmin ? 'elevated' as AuthLevel : store.currentLevel,
        /** Check if a level is met */
        isElevated,
        /** Request elevation (shows modal if needed) */
        requireElevation,
        /** Require then execute */
        requestAndProceed,
        /** Whether the elevation modal is open */
        modalOpen: store.modalOpen,
        /** The level being requested */
        requestedLevel: store.requestedLevel,
        /** Whether user is super-admin (never prompted) */
        isSuperAdmin,
        /** Clear all elevation (on logout) */
        clearElevation: store.clearElevation,
    };
}

export default useAuthElevation;
