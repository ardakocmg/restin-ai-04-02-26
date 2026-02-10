import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../lib/api";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Shield, Check, Eye, EyeOff, Crown, ArrowRight, Lock } from "lucide-react";

interface PasswordStrength {
    score: number;
    label: string;
    color: string;
}

function evaluatePasswordStrength(password: string): PasswordStrength {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 4) return { score, label: "Medium", color: "bg-yellow-500" };
    return { score, label: "Strong", color: "bg-emerald-500" };
}

const STEPS = [
    { id: "welcome", title: "Welcome", icon: Crown },
    { id: "password", title: "Set Password", icon: Lock },
    { id: "2fa", title: "Enable 2FA", icon: Shield },
];

export default function SetupWizard() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Password step
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // 2FA step
    const [qrCode, setQrCode] = useState("");
    const [secret, setSecret] = useState("");
    const [totpCode, setTotpCode] = useState("");
    const [mfaSetupDone, setMfaSetupDone] = useState(false);

    // Check if setup is needed
    useEffect(() => {
        authAPI.checkSetupRequired()
            .then((res) => {
                if (!res.data.setupRequired) {
                    navigate("/login");
                }
            })
            .catch(() => {
                // If endpoint doesn't exist yet, allow wizard to proceed
            });
    }, [navigate]);

    const passwordStrength = evaluatePasswordStrength(password);
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
    const passwordValid = password.length >= 8 && passwordsMatch && passwordStrength.score >= 3;

    const handleSetPassword = async () => {
        if (!passwordValid) {
            toast.error("Password must be 8+ characters with mix of upper, lower, numbers, and symbols");
            return;
        }
        setCurrentStep(2);
    };

    const handleSetup2FA = async () => {
        setLoading(true);
        try {
            const res = await authAPI.setupSuperOwner({
                name: "Arda Koc",
                email: "arda@restin.ai",
                password,
                totpCode: totpCode || undefined,
            });

            if (res.data.qrCodeUrl) {
                setQrCode(res.data.qrCodeUrl);
                setSecret(res.data.secret || "");
            } else {
                setMfaSetupDone(true);
                toast.success("Super Owner account created!");
                setTimeout(() => navigate("/login"), 2000);
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || "Setup failed");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2FA = async () => {
        setLoading(true);
        try {
            await authAPI.setupSuperOwner({
                name: "Arda Koc",
                email: "arda@restin.ai",
                password,
                totpCode,
                enable2fa: true,
            });
            setMfaSetupDone(true);
            toast.success("2FA enabled. Super Owner setup complete!");
            setTimeout(() => navigate("/login"), 2000);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || "2FA verification failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSkip2FA = async () => {
        setLoading(true);
        try {
            await authAPI.setupSuperOwner({
                name: "Arda Koc",
                email: "arda@restin.ai",
                password,
                enable2fa: false,
            });
            toast.success("Super Owner created (2FA skipped). You can enable it later.");
            setTimeout(() => navigate("/login"), 2000);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || "Setup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-zinc-950 to-purple-950/20" />

            <div className="relative w-full max-w-lg space-y-6 z-10">
                {/* Logo */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-4">
                        <Crown className="w-5 h-5 text-indigo-400" />
                        <span className="text-sm font-semibold text-indigo-300">First Time Setup</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Restin.AI</h1>
                    <p className="text-zinc-500 text-sm">Configure your Super Owner account</p>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2">
                    {STEPS.map((step, i) => {
                        const StepIcon = step.icon;
                        const isActive = i === currentStep;
                        const isDone = i < currentStep || mfaSetupDone;
                        return (
                            <div key={step.id} className="flex items-center gap-2">
                                {i > 0 && (
                                    <div className={`w-8 h-0.5 rounded ${isDone ? 'bg-indigo-500' : 'bg-zinc-800'}`} />
                                )}
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isDone ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                        isActive ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' :
                                            'bg-zinc-900 text-zinc-600 border border-zinc-800'
                                    }`}>
                                    {isDone ? <Check className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                                    {step.title}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Step Content */}
                <Card className="bg-zinc-900/90 border-zinc-800 backdrop-blur-xl">
                    {/* Step 0: Welcome */}
                    {currentStep === 0 && (
                        <>
                            <CardHeader className="text-center">
                                <CardTitle className="text-white text-xl">Welcome, Arda Koc</CardTitle>
                                <CardDescription className="text-zinc-400">
                                    Let&apos;s secure your Super Owner account. This is a one-time setup.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                                            <Shield className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-200">Full System Access</p>
                                            <p className="text-xs text-zinc-500">All permissions, all venues, all operations</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                                            <Lock className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-200">Password + Optional 2FA</p>
                                            <p className="text-xs text-zinc-500">Maximum security for the highest authority</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                                        <div className="p-2 bg-amber-500/10 rounded-lg">
                                            <Crown className="w-5 h-5 text-amber-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-200">Irrevocable Role</p>
                                            <p className="text-xs text-zinc-500">Super Owner cannot be deleted or demoted</p>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                                    onClick={() => setCurrentStep(1)}
                                >
                                    Get Started
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </>
                    )}

                    {/* Step 1: Set Password */}
                    {currentStep === 1 && (
                        <>
                            <CardHeader className="text-center">
                                <CardTitle className="text-white text-xl">Create Your Password</CardTitle>
                                <CardDescription className="text-zinc-400">
                                    Use for arda@restin.ai — minimum 8 characters
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300 text-xs uppercase tracking-wide">Password</Label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter a strong password"
                                            className="bg-zinc-800 border-zinc-700 text-white h-12 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Strength Meter */}
                                    {password.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1 flex-1 rounded ${i <= passwordStrength.score ? passwordStrength.color : 'bg-zinc-800'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <p className={`text-[11px] ${passwordStrength.label === 'Strong' ? 'text-emerald-400' :
                                                    passwordStrength.label === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                                                }`}>
                                                {passwordStrength.label}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-zinc-300 text-xs uppercase tracking-wide">Confirm Password</Label>
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repeat your password"
                                        className={`bg-zinc-800 border-zinc-700 text-white h-12 ${confirmPassword.length > 0
                                                ? passwordsMatch
                                                    ? 'border-emerald-500/50'
                                                    : 'border-red-500/50'
                                                : ''
                                            }`}
                                    />
                                    {confirmPassword.length > 0 && !passwordsMatch && (
                                        <p className="text-[11px] text-red-400">Passwords don&apos;t match</p>
                                    )}
                                </div>

                                <Button
                                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                                    onClick={handleSetPassword}
                                    disabled={!passwordValid}
                                >
                                    Continue to 2FA
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </>
                    )}

                    {/* Step 2: 2FA Setup */}
                    {currentStep === 2 && (
                        <>
                            <CardHeader className="text-center">
                                <CardTitle className="text-white text-xl">
                                    {mfaSetupDone ? "Setup Complete!" : "Two-Factor Authentication"}
                                </CardTitle>
                                <CardDescription className="text-zinc-400">
                                    {mfaSetupDone
                                        ? "Redirecting to login..."
                                        : qrCode
                                            ? "Scan this QR code with your authenticator app"
                                            : "Would you like to enable 2FA for maximum security?"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {mfaSetupDone ? (
                                    <div className="text-center py-8">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                                            <Check className="w-8 h-8 text-emerald-400" />
                                        </div>
                                        <p className="text-zinc-300 text-sm">Your Super Owner account is ready.</p>
                                    </div>
                                ) : qrCode ? (
                                    <>
                                        <div className="flex justify-center">
                                            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg bg-white p-2" />
                                        </div>
                                        {secret && (
                                            <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 text-center">
                                                <p className="text-[11px] text-zinc-500 mb-1">Manual Entry Code</p>
                                                <p className="text-sm font-mono text-zinc-300 tracking-wider select-all">{secret}</p>
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300 text-xs uppercase tracking-wide">Verification Code</Label>
                                            <Input
                                                type="text"
                                                maxLength={6}
                                                value={totpCode}
                                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                                placeholder="000000"
                                                className="bg-zinc-800 border-zinc-700 text-white text-center text-2xl font-mono h-14 tracking-[0.5em]"
                                            />
                                        </div>
                                        <Button
                                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                                            onClick={handleVerify2FA}
                                            disabled={loading || totpCode.length !== 6}
                                        >
                                            {loading ? "Verifying..." : "Verify & Complete Setup"}
                                        </Button>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <Button
                                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                                            onClick={handleSetup2FA}
                                            disabled={loading}
                                        >
                                            {loading ? "Setting up..." : "Enable 2FA (Recommended)"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full h-12 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                                            onClick={handleSkip2FA}
                                            disabled={loading}
                                        >
                                            Skip for now
                                        </Button>
                                        <p className="text-center text-zinc-600 text-[11px]">
                                            You can always enable 2FA later from Settings → Security
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </>
                    )}
                </Card>

                <p className="text-center text-zinc-600 text-xs">
                    Restin.AI — Restaurant Operating System
                </p>
            </div>
        </div>
    );
}
