import { ChefHat,KeyRound,LayoutGrid,Mail,Monitor,Undo2 } from "lucide-react";
import React,{ useCallback,useEffect,useRef,useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate,useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import api,{ authAPI } from "../../lib/api";
import { logger } from "../../lib/logger";
import { User } from "../../types";
import { useAuth } from "./AuthContext";
import './Login.css';
import { LoginResponse } from "./types";

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { t } = useTranslation();
    const { login } = useAuth();

    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [loginTarget, setLoginTarget] = useState<"pos" | "kds" | "admin">("pos");
    const [pinError, setPinError] = useState(false);
    const [pinSuccess, setPinSuccess] = useState(false);

    // Login mode toggle: PIN vs Credentials
    const [loginMode, setLoginMode] = useState<'pin' | 'credentials'>(
        searchParams.get('mode') === 'pin' ? 'pin' : 'credentials'
    );
    const [credEmail, setCredEmail] = useState('');
    const [credPassword, setCredPassword] = useState('');

    const [showVenueSelection, setShowVenueSelection] = useState(false);
    const [allowedVenues, setAllowedVenues] = useState<string[]>([]);
    const [selectedVenue, setSelectedVenue] = useState("");
    const [userToken, setUserToken] = useState("");
    const [userData, setUserData] = useState<LoginResponse | null>(null);

    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaUserId, setMfaUserId] = useState("");
    const [totpCode, setTotpCode] = useState("");

    // Google SSO state
    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleClientId, setGoogleClientId] = useState<string | null>(null);
    const _googleBtnRef = useRef<HTMLDivElement>(null);

    // Fetch Google SSO config on mount + prefetch dashboard chunks
    useEffect(() => {
        // Prefetch dashboard so it's ready instantly after login
        import("../../pages/manager/SystemDashboard");
        import("../../pages/manager/ManagerLayout");

        const fetchSSOConfig = async () => {
            try {
                const res = await api.get('/auth/google/config');
                if (res.data?.google_client_id) {
                    setGoogleClientId(res.data.google_client_id);
                }
            } catch {
                // SSO not configured — silently skip
            }
        };
        fetchSSOConfig();
    }, []);

    // Auto-submit when PIN reaches 4 digits
    useEffect(() => {
        if (pin.length === 4 && !loading && !showVenueSelection && !pinError) {
            handlePinLogin();
        }
    }, [pin]);

    // Keyboard support: type PIN with number keys, Backspace to undo, Escape to clear
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (mfaRequired || showVenueSelection) return;

            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handlePinInput(e.key);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                // Enter confirms PIN if 4 digits entered
                if (pin.length === 4 && !loading) handlePinLogin();
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                handlePinUndo();
            } else if (e.key === 'Escape' || e.key === 'Delete') {
                e.preventDefault();
                handlePinClear();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mfaRequired, showVenueSelection, pin, loading, pinError]);

    const handlePinInput = (digit: string) => {
        if (pin.length < 4 && !loading && !pinError) {
            setPin(prev => prev + digit);
        }
    };

    const handlePinClear = () => {
        setPin("");
        setPinError(false);
    };

    const handleMfaBack = () => {
        setMfaRequired(false);
        setTotpCode("");
        setLoading(false);
        handlePinClear();
    };

    const handlePinUndo = () => {
        if (pin.length > 0) {
            setPin(prev => prev.slice(0, -1));
            setPinError(false);
        }
    };

    const resetPinWithError = () => {
        setLoading(false);
        setPinError(true);
        setPinSuccess(false);
        setTimeout(() => {
            setPin("");
            setPinError(false);
        }, 200);
    };

    const handlePinLogin = async () => {
        if (pin.length !== 4) return;

        setLoading(true);
        try {
            const deviceId = localStorage.getItem("restin_device_id") ||
                `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem("restin_device_id", deviceId);

            const response = await authAPI.loginWithPin(pin, loginTarget, deviceId);
            const data: LoginResponse = response.data;

            if (data.requires_mfa) {
                setMfaRequired(true);
                setMfaUserId(data.user_id || "");
                setAllowedVenues(data.allowedVenueIds || []);
                toast.info("MFA verification required");
            } else {
                setPinSuccess(true);
                // Brief pause so user sees the green pulse before navigating
                await new Promise(r => setTimeout(r, 150));
                handleLoginSuccess(data);
            }
        } catch (error: unknown) {
            const axiosError = error as { response?: { status?: number; data?: { detail?: string } } };
            const status = axiosError.response?.status;
            const message = axiosError.response?.data?.detail || "Login failed";

            if (status === 401) {
                resetPinWithError();
                toast.error(t('auth.invalidCredentials'));
            } else {
                resetPinWithError();
                toast.error(message);
            }
        }
    };

    // ── Credentials (email/password) login handler ──
    const handleCredentialsLogin = async () => {
        if (!credEmail || !credPassword || loading) return;
        setLoading(true);
        setPinError(false);
        try {
            const response = await authAPI.loginWithCredentials({
                identifier: credEmail,
                password: credPassword,
                target: loginTarget,
                deviceId: `web-${navigator.userAgent.slice(0, 32)}`,
            });
            const data: LoginResponse = response.data;

            if (data.requires_mfa) {
                setMfaRequired(true);
                setMfaUserId(data.user_id || "");
                setAllowedVenues(data.allowedVenueIds || []);
                toast.info("MFA verification required — enter your Google Authenticator code");
            } else {
                setPinSuccess(true);
                await new Promise(r => setTimeout(r, 150));
                handleLoginSuccess(data);
            }
        } catch (error: unknown) {
            const axiosError = error as { response?: { status?: number; data?: { detail?: string } } };
            const status = axiosError.response?.status;
            const message = axiosError.response?.data?.detail || "Login failed";

            if (status === 401) {
                toast.error(t('auth.invalidCredentials'));
            } else if (status === 429) {
                toast.error("Too many attempts. Please try again in 5 minutes.");
            } else {
                toast.error(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLoginSuccess = (data: LoginResponse) => {
        // Backend returns "accessToken" - normalize to "token"
        const token = data.token || data.accessToken;

        if (!token) {
            toast.error('Authentication failed - no token');
            setLoading(false);
            return;
        }

        // Store token and user ID
        localStorage.setItem('restin_token', token);
        if (data.user?.id) {
            localStorage.setItem('restin_user_id', data.user.id);
        }

        // Fire-and-forget: prefetch critical data so dashboard loads instantly
        const venueId = data.allowedVenueIds?.[0] || data.defaultVenueId || data.user?.venueId;
        if (venueId) {
            const headers = { Authorization: `Bearer ${token}` };
            // These calls warm the browser HTTP cache + React Query will pick up stale data
            api.get(`/venues`, { headers }).catch(() => { });
            api.get(`/venues/${venueId}/stats`, { headers }).catch(() => { });
        }

        if (data.allowedVenueIds && data.allowedVenueIds.length > 1) {
            setAllowedVenues(data.allowedVenueIds);
            setUserToken(token);
            setUserData(data);
            setShowVenueSelection(true);
            setLoading(false);
        } else {
            const venueId = data.allowedVenueIds?.[0] || data.defaultVenueId || data.user?.venueId;
            // Ensure venueId fits User type if we were strictly checking it everywhere
            // For now we cast or assume backend aligns with types
            login({ ...data.user, venueId: venueId || '' } as User, token);

            if (loginTarget === "pos") navigate("/pos/setup");
            else if (loginTarget === "kds") navigate("/kds/setup");
            else navigate("/manager/dashboard");
        }
    };

    const handleMfaVerify = async () => {
        if (totpCode.length < 6) {
            toast.error(t('validation.minLength', { count: 6 }));
            return;
        }

        setLoading(true);
        try {
            const deviceId = localStorage.getItem("restin_device_id");
            const response = await authAPI.verifyMFA(mfaUserId, totpCode, deviceId);

            const loginData: LoginResponse = {
                ...response.data,
                accessToken: response.data.accessToken || response.data.token,
                allowedVenueIds: allowedVenues,
                defaultVenueId: allowedVenues?.[0]
            };

            setMfaRequired(false);
            setTotpCode("");
            handleLoginSuccess(loginData);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { detail?: string } } };
            toast.error(axiosError.response?.data?.detail || 'MFA verification failed');
            setLoading(false);
        }
    };

    // ─── Google SSO Handler ──────────────────────────────────────────────
    const handleGoogleLogin = useCallback(async () => {
        if (!googleClientId) {
            toast.error('Google SSO is not configured');
            return;
        }

        setGoogleLoading(true);

        try {
            // Load Google Identity Services if not already loaded
            if (!(window as/**/any as /**/any).google) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://accounts.google.com/gsi/client';
                    script.async = true;
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Failed to load Google SSO'));
                    document.head.appendChild(script);
                });
            }

            const google = (window as/**/any as /**/any).google as {
                accounts: {
                    id: {
                        initialize: (config: /**/any) => void;
                        prompt: (callback?: (notification: { isNotDisplayed: () => boolean; getNotDisplayedReason: () => string }) => void) => void;
                    };
                };
            };

            google.accounts.id.initialize({
                client_id: googleClientId,
                callback: async (response: { credential: string }) => {
                    try {
                        const result = await api.post('/auth/google/login', {
                            id_token: response.credential,
                        });

                        const data: LoginResponse = {
                            accessToken: result.data.accessToken,
                            user: result.data.user,
                            allowedVenueIds: result.data.allowedVenueIds || [],
                            defaultVenueId: result.data.defaultVenueId || '',
                        };

                        handleLoginSuccess(data);
                        toast.success('Signed in with Google');
                    } catch (err: unknown) {
                        const axiosErr = err as { response?: { data?: { detail?: string | { message?: string } } } };
                        const detail = axiosErr.response?.data?.detail;
                        const msg = typeof detail === 'string'
                            ? detail
                            : (detail as { message?: string })?.message || 'Google SSO failed';
                        toast.error(msg as string);
                        logger.error('Google SSO error', { error: msg });
                    } finally {
                        setGoogleLoading(false);
                    }
                },
                auto_select: false,
                context: 'signin',
            });

            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed()) {
                    logger.warn('Google prompt not displayed', {
                        reason: notification.getNotDisplayedReason()
                    });
                    setGoogleLoading(false);
                    toast.error('Google popup blocked. Please allow popups.');
                }
            });

        } catch (error) {
            logger.error('Google SSO init error', { error });
            toast.error('Failed to initialize Google Sign-In');
            setGoogleLoading(false);
        }
    }, [googleClientId, handleLoginSuccess]);

    const handleVenueSelect = () => {
        if (!selectedVenue || !userData) return;

        login({ ...userData.user, venueId: selectedVenue } as User, userToken);

        if (loginTarget === "pos") navigate("/pos/setup");
        else if (loginTarget === "kds") navigate("/kds/setup");
        else navigate("/manager/dashboard");
    };

    // PIN display boxes
    const pinBoxes = Array(4).fill(0).map((_, i) => (
        <div
            key={i}
            className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold transition-all duration-200 pin-box ${pin[i] ? (pinError ? 'error' : pinSuccess ? 'success' : 'filled') : ''
                } ${pinError ? 'animate-shake' : ''
                } ${pinSuccess ? 'success-pulse' : ''
                }`}
        >
            {pin[i] ? '•' : ''}
        </div>
    ));

    // Number pad
    const numpadButtons = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['CLEAR', '0', 'UNDO']
    ];

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 z-0 login-bg-image"
                style={{ backgroundImage: `url(https://images.unsplash.com/photo-1709396759771-07c3644794c8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwzfHxyZXN0YXVyYW50JTIwa2l0Y2hlbiUyMGJ1c3klMjBjaGVmJTIwcGxhdGluZyUyMGZpbmUlMjBkaW5pbmclMjBkYXJrJTIwYXRtb3NwaGVyZXxlbnwwfHx8fDE3NjkxMjMyNTZ8MA&ixlib=rb-4.1.0&q=85)`  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 z-0 login-overlay" />

            {/* Content — frosted glass card */}
            <div className="relative z-10 w-full max-w-md">{!showVenueSelection ? (
                <div className="w-full max-w-md space-y-8 rounded-2xl p-8 login-glass-card">
                    {/* Logo */}
                    <div className="text-center mb-12">
                        <h1 className="text-6xl font-bold mb-2" style={{ color: '#F5F5F7'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                            RESTIN<span style={{ color: '#E53935'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>.AI</span>
                        </h1>
                        <p className="text-sm" style={{ color: '#A1A1AA'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>ENTERPRISE HOSPITALITY OS</p>
                    </div>

                    {mfaRequired ? (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold mb-2" style={{ color: '#F5F5F7'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>MFA VERIFICATION</h2>
                                <p className="text-sm" style={{ color: '#A1A1AA'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>Enter your 6-digit authenticator code</p>
                            </div>
                            <input aria-label="Input"
                                type="text"
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full text-center text-2xl tracking-widest py-4 rounded-xl bg-black/40 text-foreground border border-border"
                                placeholder="••••••"
                                data-testid="mfa-code-input"
                            />
                            <Button onClick={handleMfaVerify} disabled={loading} data-testid="mfa-verify-button">
                                Verify & Continue
                            </Button>
                            <Button variant="outline" onClick={handleMfaBack} data-testid="mfa-back-button">
                                Back to PIN
                            </Button>
                        </div>
                    ) : (
                        <>

                            {/* Module Selection */}
                            <div className="flex justify-center gap-3 mb-8">
                                <button
                                    onClick={() => setLoginTarget('admin')}
                                    data-testid="login-mode-admin"
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all touch-target`}
                                    style={loginTarget === 'admin' ? {
                                        backgroundColor: 'rgba(229, 57, 53, 0.15)',
                                        color: '#E53935',
                                        border: '2px solid rgba(229, 57, 53, 0.4)',
                                        boxShadow: '0 0 20px rgba(229, 57, 53, 0.3)'
                                    } : {
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        color: '#A1A1AA',
                                        border: '2px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    ADMIN
                                </button>
                                <button
                                    onClick={() => setLoginTarget('pos')}
                                    data-testid="login-mode-pos"
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all touch-target`}
                                    style={loginTarget === 'pos' ? {
                                        backgroundColor: 'rgba(229, 57, 53, 0.15)',
                                        color: '#E53935',
                                        border: '2px solid rgba(229, 57, 53, 0.4)',
                                        boxShadow: '0 0 20px rgba(229, 57, 53, 0.3)'
                                    } : {
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        color: '#A1A1AA',
                                        border: '2px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                >
                                    <Monitor className="w-4 h-4" />
                                    POS
                                </button>
                                <button
                                    onClick={() => setLoginTarget('kds')}
                                    data-testid="login-mode-kds"
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all touch-target`}
                                    style={loginTarget === 'kds' ? {
                                        backgroundColor: 'rgba(229, 57, 53, 0.15)',
                                        color: '#E53935',
                                        border: '2px solid rgba(229, 57, 53, 0.4)',
                                        boxShadow: '0 0 20px rgba(229, 57, 53, 0.3)'
                                    } : {
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        color: '#A1A1AA',
                                        border: '2px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                >
                                    <ChefHat className="w-4 h-4" />
                                    KDS
                                </button>
                            </div>

                            {/* PIN Entry */}
                            <div className="text-center space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold mb-2" style={{ color: '#F5F5F7'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{t('auth.pin', 'ENTER PIN')}</h2>
                                    <p className="text-sm" style={{ color: '#A1A1AA'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{t('validation.minLength', { count: 4 })}</p>
                                </div>

                                {/* PIN Boxes */}
                                <div className="flex justify-center gap-3">
                                    {pinBoxes}
                                </div>

                                {/* Number Pad */}
                                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                                    {numpadButtons.map((row, rowIdx) => (
                                        <React.Fragment key={rowIdx}>
                                            {row.map((btn) => (
                                                <button
                                                    key={btn}
                                                    onClick={() => {
                                                        if (btn === 'CLEAR') handlePinClear();
                                                        else if (btn === 'UNDO') handlePinUndo();
                                                        else handlePinInput(btn);
                                                    }}
                                                    disabled={loading}
                                                    data-testid={`login-pin-${String(btn).toLowerCase()}`}
                                                    className={`numpad-button rounded-xl font-bold transition-all touch-feedback ${btn === 'CLEAR' || btn === 'UNDO' ? 'col-span-1' : ''
                                                        }`}
                                                    style={{ /* keep-inline */
                                                        backgroundColor: btn === 'CLEAR' ? 'rgba(239, 68, 68, 0.15)' :
                                                            btn === 'UNDO' ? 'rgba(251, 140, 0, 0.15)' :
                                                                'rgba(255, 255, 255, 0.05)',
                                                        color: btn === 'CLEAR' ? '#EF4444' :
                                                            btn === 'UNDO' ? '#FB8C00' :
                                                                '#F5F5F7',
                                                        border: btn === 'CLEAR' ? '2px solid rgba(239, 68, 68, 0.3)' :
                                                            btn === 'UNDO' ? '2px solid rgba(251, 140, 0, 0.3)' :
                                                                '2px solid rgba(255, 255, 255, 0.1)',
                                                        fontSize: btn === 'CLEAR' || btn === 'UNDO' ? '14px' : '24px'
                                                     /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                                                >
                                                    {btn === 'UNDO' ? <Undo2 className="w-6 h-6 mx-auto" /> : btn}
                                                </button>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </div>

                                {loading && (
                                    <p className="text-sm" style={{ color: '#A1A1AA'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{t('common.loading')}</p>
                                )}

                                {/* Toggle: PIN ↔ Credentials */}
                                <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                    <button
                                        onClick={() => setLoginMode(loginMode === 'pin' ? 'credentials' : 'pin')}
                                        className="w-full flex items-center justify-center gap-2 text-sm py-2 rounded-lg transition-all"
                                        style={{ color: '#A1A1AA'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                                        data-testid="login-mode-toggle"
                                    >
                                        {loginMode === 'pin' ? (
                                            <><Mail className="w-4 h-4" /> Sign in with Email & Password</>
                                        ) : (
                                            <><KeyRound className="w-4 h-4" /> Sign in with PIN</>
                                        )}
                                    </button>
                                </div>

                                {/* Credentials Form */}
                                {loginMode === 'credentials' && (
                                    <div className="mt-4 space-y-3">
                                        <input aria-label="Input"
                                            type="email"
                                            placeholder="Email, username, or employee ID"
                                            value={credEmail}
                                            onChange={e => setCredEmail(e.target.value)}
                                            autoComplete="email"
                                            data-testid="login-email"
                                            className="w-full px-4 py-3 rounded-xl text-sm transition-all outline-none"
                                            style={{ /* keep-inline */
                                                backgroundColor: 'rgba(255,255,255,0.05)',
                                                color: '#F5F5F7',
                                                border: '2px solid rgba(255,255,255,0.1)',
                                             /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                                            onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                        />
                                        <input aria-label="Input"
                                            type="password"
                                            placeholder="Password"
                                            value={credPassword}
                                            onChange={e => setCredPassword(e.target.value)}
                                            autoComplete="current-password"
                                            data-testid="login-password"
                                            className="w-full px-4 py-3 rounded-xl text-sm transition-all outline-none"
                                            style={{ /* keep-inline */
                                                backgroundColor: 'rgba(255,255,255,0.05)',
                                                color: '#F5F5F7',
                                                border: '2px solid rgba(255,255,255,0.1)',
                                             /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                                            onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                            onKeyDown={e => { if (e.key === 'Enter') handleCredentialsLogin(); }}
                                        />
                                        <button
                                            onClick={handleCredentialsLogin}
                                            disabled={loading || !credEmail || !credPassword}
                                            data-testid="login-credentials-submit"
                                            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all"
                                            style={{ /* keep-inline */
                                                backgroundColor: (!credEmail || !credPassword) ? 'rgba(255,255,255,0.05)' : 'rgba(34, 197, 94, 0.2)',
                                                color: (!credEmail || !credPassword) ? '#71717A' : '#22C55E',
                                                border: (!credEmail || !credPassword) ? '2px solid rgba(255,255,255,0.05)' : '2px solid rgba(34, 197, 94, 0.3)',
                                             /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                                        >
                                            {loading ? t('common.loading') : 'Sign In'}
                                        </button>
                                    </div>
                                )}

                                {/* Google SSO — visible when configured */}
                                {googleClientId && (
                                    <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.1)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                        <button
                                            onClick={handleGoogleLogin}
                                            disabled={googleLoading || loading}
                                            data-testid="google-sso-button"
                                            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-medium transition-all"
                                            style={{ /* keep-inline */
                                                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                                                color: '#F5F5F7',
                                                border: '2px solid rgba(255, 255, 255, 0.12)',
                                             /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                                        >
                                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            {googleLoading ? 'Signing in...' : 'Sign in with Google'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                // Venue selection screen
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2" style={{ color: '#F5F5F7'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>SELECT VENUE</h2>
                        <p className="text-sm" style={{ color: '#A1A1AA'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>Choose your venue to continue</p>
                    </div>
                    {/* Venue selection logic to be implemented based on allowedVenues */}
                    <div className="grid gap-3">
                        {allowedVenues.map(vid => (
                            <Button key={vid} onClick={() => { setSelectedVenue(vid); handleVenueSelect(); }}>
                                Select {vid}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}
