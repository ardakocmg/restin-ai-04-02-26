import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import { authAPI } from "../../lib/api";
import { toast } from "sonner";
import { ChefHat, LayoutGrid, Monitor, Undo2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { LoginResponse } from "./types";
import { User } from "../../types";

export default function Login() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { login } = useAuth();

    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [loginTarget, setLoginTarget] = useState<"pos" | "kds" | "admin">("pos");
    const [pinError, setPinError] = useState(false);
    const [pinSuccess, setPinSuccess] = useState(false);

    const [showVenueSelection, setShowVenueSelection] = useState(false);
    const [allowedVenues, setAllowedVenues] = useState<string[]>([]);
    const [selectedVenue, setSelectedVenue] = useState("");
    const [userToken, setUserToken] = useState("");
    const [userData, setUserData] = useState<LoginResponse | null>(null);

    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaUserId, setMfaUserId] = useState("");
    const [totpCode, setTotpCode] = useState("");

    // Auto-submit when PIN reaches 4 digits
    useEffect(() => {
        if (pin.length === 4 && !loading && !showVenueSelection && !pinError) {
            handlePinLogin();
        }
    }, [pin]);

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
        setPinError(true);
        setTimeout(() => {
            setPin("");
            setPinError(false);
        }, 400);
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
                setTimeout(() => handleLoginSuccess(data), 300);
            }
        } catch (error: unknown) {
            const axiosError = error as { response?: { status?: number; data?: { detail?: string } } };
            const status = axiosError.response?.status;
            const message = axiosError.response?.data?.detail || "Login failed";

            if (status === 401) {
                resetPinWithError();
                toast.error(t('auth.invalidCredentials'));
            } else {
                toast.error(message);
                setLoading(false);
            }
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
        } else if (data.user?.user_id) {
            localStorage.setItem('restin_user_id', data.user.user_id);
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
            else navigate("/admin/dashboard");
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

    const handleVenueSelect = () => {
        if (!selectedVenue || !userData) return;

        login({ ...userData.user, venueId: selectedVenue } as User, userToken);

        if (loginTarget === "pos") navigate("/pos/setup");
        else if (loginTarget === "kds") navigate("/kds/setup");
        else navigate("/admin/dashboard");
    };

    // PIN display boxes
    const pinBoxes = Array(4).fill(0).map((_, i) => (
        <div
            key={i}
            className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold transition-all duration-200 ${pinError ? 'animate-shake' : ''
                } ${pinSuccess ? 'success-pulse' : ''
                }`}
            style={{
                backgroundColor: pin[i]
                    ? (pinError ? 'rgba(239, 68, 68, 0.2)' : pinSuccess ? 'rgba(74, 222, 128, 0.2)' : 'rgba(229, 57, 53, 0.15)')
                    : 'rgba(255, 255, 255, 0.05)',
                border: pin[i]
                    ? (pinError ? '2px solid #EF4444' : pinSuccess ? '2px solid #4ADE80' : '2px solid rgba(229, 57, 53, 0.4)')
                    : '2px solid rgba(255, 255, 255, 0.1)',
                boxShadow: pin[i] && !pinError && !pinSuccess
                    ? '0 0 20px rgba(229, 57, 53, 0.3)'
                    : 'none',
                color: '#F5F5F7'
            }}
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
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: `url(https://images.unsplash.com/photo-1709396759771-07c3644794c8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwzfHxyZXN0YXVyYW50JTIwa2l0Y2hlbiUyMGJ1c3klMjBjaGVmJTIwcGxhdGluZyUyMGZpbmUlMjBkaW5pbmclMjBkYXJrJTIwYXRtb3NwaGVyZXxlbnwwfHx8fDE3NjkxMjMyNTZ8MA&ixlib=rb-4.1.0&q=85)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.15
                }}
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 z-0" style={{ backgroundColor: 'rgba(10, 10, 11, 0.85)' }} />

            {/* Content */}
            <div className="relative z-10 w-full max-w-md space-y-8">{!showVenueSelection ? (
                <div className="w-full max-w-md space-y-8">
                    {/* Logo */}
                    <div className="text-center mb-12">
                        <h1 className="text-6xl font-bold mb-2" style={{ color: '#F5F5F7' }}>
                            RESTIN<span style={{ color: '#E53935' }}>.AI</span>
                        </h1>
                        <p className="text-sm" style={{ color: '#A1A1AA' }}>ENTERPRISE HOSPITALITY OS</p>
                    </div>

                    {mfaRequired ? (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold mb-2" style={{ color: '#F5F5F7' }}>MFA VERIFICATION</h2>
                                <p className="text-sm" style={{ color: '#A1A1AA' }}>Enter your 6-digit authenticator code</p>
                            </div>
                            <input
                                type="text"
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full text-center text-2xl tracking-widest py-4 rounded-xl bg-black/40 text-white border border-white/10"
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
                                    <h2 className="text-2xl font-bold mb-2" style={{ color: '#F5F5F7' }}>{t('auth.pin', 'ENTER PIN')}</h2>
                                    <p className="text-sm" style={{ color: '#A1A1AA' }}>{t('validation.minLength', { count: 4 })}</p>
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
                                                    style={{
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
                                                    }}
                                                >
                                                    {btn === 'UNDO' ? <Undo2 className="w-6 h-6 mx-auto" /> : btn}
                                                </button>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </div>

                                {loading && (
                                    <p className="text-sm" style={{ color: '#A1A1AA' }}>{t('common.loading')}</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                // Venue selection screen
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2" style={{ color: '#F5F5F7' }}>SELECT VENUE</h2>
                        <p className="text-sm" style={{ color: '#A1A1AA' }}>Choose your venue to continue</p>
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
