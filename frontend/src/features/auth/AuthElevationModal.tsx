/**
 * AuthElevationModal — In-app elevation prompt
 *
 * Appears when a sensitive area requires password or 2FA verification.
 * Premium glassmorphism design matching Restin.AI dark theme.
 *
 * product_owner never sees this modal (bypassed in useAuthElevation).
 */
import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, Fingerprint, X, Eye, EyeOff, AlertTriangle } from 'lucide-react';
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [shake, setShake] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when modal opens
    useEffect(() => {
        if (modalOpen) {
            setPassword('');
            setTotpCode('');
            setError('');
            setShake(false);
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [modalOpen]);

    const isPasswordMode = requestedLevel === 'password';
    const is2FAMode = requestedLevel === 'elevated';

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setLoading(true);
        setError('');

        try {
            const body = isPasswordMode
                ? { method: 'password', password }
                : { method: 'totp', totp_code: totpCode };

            await authAPI.elevateAuth(body);

            toast.success(
                isPasswordMode ? 'Session elevated — password verified' : 'Session elevated — 2FA verified',
                { duration: 2000 }
            );
            closeModal(true);
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { detail?: string } } };
            const msg = axiosErr.response?.data?.detail || 'Verification failed';
            setError(msg);
            setShake(true);
            setTimeout(() => setShake(false), 500);

            // Clear input on failure
            if (isPasswordMode) setPassword('');
            else setTotpCode('');

            setTimeout(() => inputRef.current?.focus(), 100);
        } finally {
            setLoading(false);
        }
    };

    // Auto-submit 2FA when 6 digits entered
    useEffect(() => {
        if (is2FAMode && totpCode.length === 6 && !loading) {
            handleSubmit();
        }
    }, [totpCode]);

    const handleCancel = () => {
        closeModal(false);
    };

    return (
        <AnimatePresence>
            {modalOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
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
                        style={{
                            background: 'linear-gradient(145deg, rgba(39, 39, 42, 0.95) 0%, rgba(24, 24, 27, 0.98) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 100px rgba(229, 57, 53, 0.07)',
                        }}
                    >
                        {/* Close button */}
                        <button
                            onClick={handleCancel}
                            className="absolute top-4 right-4 p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 text-center">
                            <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                                style={{
                                    background: is2FAMode
                                        ? 'linear-gradient(135deg, rgba(229, 57, 53, 0.15) 0%, rgba(229, 57, 53, 0.05) 100%)'
                                        : 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 100%)',
                                    border: `1px solid ${is2FAMode ? 'rgba(229, 57, 53, 0.25)' : 'rgba(251, 191, 36, 0.25)'}`,
                                }}
                            >
                                {is2FAMode
                                    ? <Fingerprint className="w-7 h-7" style={{ color: '#E53935' }} />
                                    : <Lock className="w-6 h-6" style={{ color: '#FBBF24' }} />}
                            </div>
                            <h2 className="text-lg font-semibold text-zinc-100">
                                {is2FAMode ? 'Two-Factor Required' : 'Password Required'}
                            </h2>
                            <p className="text-sm text-zinc-500 mt-1">
                                {is2FAMode
                                    ? 'This area requires 2FA verification'
                                    : 'Verify your identity to continue'}
                            </p>
                        </div>

                        {/* User badge */}
                        <div className="px-6 pb-3">
                            <div className="flex items-center gap-3 px-3 py-2 rounded-lg"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                            >
                                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-200 truncate">{user?.name || 'User'}</p>
                                    <p className="text-xs text-zinc-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                                </div>
                                <Shield className="w-4 h-4 text-zinc-600" />
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 space-y-4">
                            {isPasswordMode ? (
                                <div className="relative">
                                    <input
                                        ref={inputRef}
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full px-4 py-3 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all"
                                        style={{
                                            background: 'rgba(0,0,0,0.3)',
                                            border: error ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                                        }}
                                        data-testid="elevation-password-input"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={totpCode}
                                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="6-digit code"
                                        className="w-full text-center text-2xl tracking-[0.5em] py-3 rounded-xl text-zinc-100 placeholder-zinc-600 outline-none transition-all font-mono"
                                        style={{
                                            background: 'rgba(0,0,0,0.3)',
                                            border: error ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                                        }}
                                        data-testid="elevation-totp-input"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                    />
                                    {/* TOTP progress dots */}
                                    <div className="flex justify-center gap-2 mt-3">
                                        {Array(6).fill(0).map((_, i) => (
                                            <div
                                                key={i}
                                                className="w-2 h-2 rounded-full transition-all duration-200"
                                                style={{
                                                    backgroundColor: i < totpCode.length
                                                        ? '#E53935'
                                                        : 'rgba(255,255,255,0.1)',
                                                    boxShadow: i < totpCode.length
                                                        ? '0 0 8px rgba(229, 57, 53, 0.4)'
                                                        : 'none',
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
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
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || (isPasswordMode ? !password : totpCode.length < 6)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                                    style={{
                                        background: 'linear-gradient(135deg, #E53935 0%, #C62828 100%)',
                                        boxShadow: '0 4px 12px rgba(229, 57, 53, 0.3)',
                                    }}
                                    data-testid="elevation-submit"
                                >
                                    {loading ? 'Verifying...' : 'Verify'}
                                </button>
                            </div>

                            {/* TTL info */}
                            <p className="text-center text-[11px] text-zinc-600">
                                {is2FAMode
                                    ? 'Verification valid for 15 minutes'
                                    : 'Verification valid for 30 minutes'}
                            </p>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
