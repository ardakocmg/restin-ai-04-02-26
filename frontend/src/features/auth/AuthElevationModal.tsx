/**
 * AuthElevationModal — Password or Google Authenticator verification
 *
 * Dual-mode elevation:
 *   - Password mode: for sensitive areas (HR, inventory, settings)
 *   - TOTP mode: for critical areas (finance, payroll, access control)
 *
 * product_owner never sees this (bypassed in useAuthElevation).
 */
import React, { useState, useEffect, useRef } from 'react';
import { Shield, Fingerprint, Lock, X, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useElevationStore } from '../../hooks/useAuthElevation';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../lib/api';
import { toast } from 'sonner';

export default function AuthElevationModal() {
    const { user } = useAuth();
    const { modalOpen, requestedLevel, closeModal } = useElevationStore();

    const [password, setPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    const isPasswordMode = requestedLevel === 'password';
    const isCritical = requestedLevel === 'elevated';

    // Focus input when modal opens
    useEffect(() => {
        if (modalOpen) {
            setPassword('');
            setTotpCode('');
            setShowPassword(false);
            setError('');
            setShake(false);
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [modalOpen]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if (isPasswordMode && !password) return;
        if (isCritical && totpCode.length < 6) return;
        if (loading) return;

        setLoading(true);
        setError('');

        try {
            const body = isPasswordMode
                ? { method: 'password', password }
                : { method: 'totp', totp_code: totpCode, requested_level: requestedLevel };

            await authAPI.elevateAuth(body);

            toast.success(
                isPasswordMode
                    ? 'Password verified — access granted (30 min)'
                    : 'Google Authenticator verified — access granted (15 min)',
                { duration: 2000 }
            );
            closeModal(true);
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { detail?: string } } };
            const msg = axiosErr.response?.data?.detail || 'Verification failed';
            setError(msg);
            setShake(true);
            setTimeout(() => setShake(false), 500);
            if (isCritical) {
                setTotpCode('');
            }
            setTimeout(() => inputRef.current?.focus(), 100);
        } finally {
            setLoading(false);
        }
    };

    // Auto-submit TOTP when 6 digits entered
    useEffect(() => {
        if (isCritical && totpCode.length === 6 && !loading) {
            handleSubmit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totpCode]);

    const handleCancel = () => {
        closeModal(false);
    };

    const accentColor = isCritical ? '#E53935' : '#F59E0B';
    const accentColorRgb = isCritical ? '229, 57, 53' : '245, 158, 11';

    return (
        <AnimatePresence>
            {modalOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={shake
                            ? { scale: 1, opacity: 1, y: 0, x: [0, -10, 10, -10, 10, 0] }
                            : { scale: 1, opacity: 1, y: 0 }
                        }
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ duration: 0.3, type: 'spring', damping: 20 }}
                        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
                        style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                            background: 'linear-gradient(145deg, rgba(39, 39, 42, 0.95) 0%, rgba(24, 24, 27, 0.98) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: `0 25px 50px rgba(0,0,0,0.5), 0 0 100px rgba(${accentColorRgb}, 0.07)`,
                        }}
                    >
                        {/* Close button */}
                        <button
                            onClick={handleCancel}
                            title="Close verification"
                            className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-secondary-foreground hover:bg-secondary/50 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 text-center">
                            <div
                                className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                                style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    background: `linear-gradient(135deg, rgba(${accentColorRgb}, 0.15) 0%, rgba(${accentColorRgb}, 0.05) 100%)`,
                                    border: `1px solid rgba(${accentColorRgb}, 0.25)`,
                                }}
                            >
                                {isPasswordMode ? (
                                    <Lock className="w-7 h-7" style={{ color: accentColor }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                ) : (
                                    <Fingerprint className="w-7 h-7" style={{ color: accentColor }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                )}
                            </div>

                            <h2 className="text-lg font-semibold text-foreground">
                                {isPasswordMode ? 'Password Required' : 'Google Authenticator'}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {isPasswordMode
                                    ? 'Enter your password to access this area'
                                    : 'Enter your 6-digit code to access this area'}
                            </p>
                        </div>

                        {/* User badge */}
                        <div className="px-6 pb-3">
                            <div
                                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                            >
                                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-secondary-foreground">
                                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-secondary-foreground truncate">{user?.name || 'User'}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
                                </div>
                                <Shield className="w-4 h-4 text-muted-foreground" />
                            </div>
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 space-y-4">
                            {isPasswordMode ? (
                                /* Password Input */
                                <div className="relative">
                                    <input aria-label="Input"
                                        ref={inputRef}
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) = aria-label="Input field"> setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder-zinc-600 outline-none transition-all pr-10"
                                        style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                            background: 'rgba(0,0,0,0.3)',
                                            border: error ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                                        }}
                                        data-testid="elevation-password-input"
                                    />
                                    <button
                                        type="button"
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            ) : (
                                /* TOTP Input */
                                <div>
                                    <input aria-label="Input"
                                        ref={inputRef}
                                        type="text"
                                        value={totpCode}
                                        onChange={(e) = aria-label="Input field"> setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000 000"
                                        className="w-full text-center text-2xl tracking-[0.5em] py-3 rounded-xl text-foreground placeholder-zinc-600 outline-none transition-all font-mono"
                                        style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                            background: 'rgba(0,0,0,0.3)',
                                            border: error ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                                        }}
                                        data-testid="elevation-totp-input"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                    />
                                    {/* Progress dots */}
                                    <div className="flex justify-center gap-2 mt-3">
                                        {Array(6).fill(0).map((_, i) => (
                                            <div
                                                key={i}
                                                className="w-2 h-2 rounded-full transition-all duration-200"
                                                style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                                    backgroundColor: i < totpCode.length
                                                        ? accentColor
                                                        : 'rgba(255,255,255,0.1)',
                                                    boxShadow: i < totpCode.length
                                                        ? `0 0 8px rgba(${accentColorRgb}, 0.4)`
                                                        : 'none',
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div
                                    className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                                >
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                    <span className="text-red-300">{error}</span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-secondary-foreground"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || (isPasswordMode ? !password : totpCode.length < 6)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-foreground transition-all disabled:opacity-40"
                                    style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        background: `linear-gradient(135deg, ${accentColor} 0%, ${isCritical ? '#C62828' : '#D97706'} 100%)`,
                                        boxShadow: `0 4px 12px rgba(${accentColorRgb}, 0.3)`,
                                    }}
                                    data-testid="elevation-submit"
                                >
                                    {loading ? 'Verifying...' : 'Verify'}
                                </button>
                            </div>

                            {/* TTL info */}
                            <p className="text-center text-[11px] text-muted-foreground">
                                {isPasswordMode
                                    ? 'Access valid for 30 minutes'
                                    : 'Access valid for 15 minutes'}
                            </p>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
