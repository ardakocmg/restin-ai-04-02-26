'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from '@antigravity/ui';
import { Input } from '@antigravity/ui';
import { Label } from '@antigravity/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@antigravity/ui';
import { Building2, Lock, Shield, ChefHat, LayoutGrid, Monitor } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();

    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [loginTarget, setLoginTarget] = useState("admin"); // admin, pos, kds
    const [pinError, setPinError] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Auto-submit when PIN reaches 4 digits
    useEffect(() => {
        if (pin.length === 4 && !loading && !isSuccess) {
            handlePinLogin();
        }
    }, [pin]);

    const handlePinInput = (digit) => {
        if (pin.length < 4 && !loading && !isSuccess) {
            setPin(prev => prev + digit);
            setPinError(false);
        }
    };

    const handlePinClear = () => {
        setPin("");
        setPinError(false);
        setIsSuccess(false);
    };

    const handlePinLogin = async () => {
        if (pin.length !== 4) return;

        setLoading(true);
        // Mock Login Logic for Design Parity
        setTimeout(() => {
            if (pin === "1111" || pin === "1234") {
                setIsSuccess(true);
                toast.success("Welcome back!", {
                    style: { background: '#22c55e', color: 'white', border: 'none' }
                });
                // Delay for animation
                setTimeout(() => {
                    router.push("/dashboard");
                }, 800);
            } else {
                setPinError(true);
                toast.error("Incorrect PIN");
                setPin("");
                setLoading(false);
            }
        }, 500);
    };

    // RENDER: Main PIN Login
    return (
        <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: `url(https://images.unsplash.com/photo-1709396759771-07c3644794c8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwzfHxyZXN0YXVyYW50JTIwa2l0Y2hlbiUyMGJ1c3klMjBjaGVmJTIwcGxhdGluZyUyMGZpbmUlMjBkaW5pbmclMjBkYXJrJTIwYXRtb3NwaGVyZXxlbnwwfHx8fDE3NjkxMjMyNTZ8MA&ixlib=rb-4.1.0&q=85)`
                }}
            >
                <div className="absolute inset-0 bg-black/80" />
            </div>

            <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
                <div className="w-full max-w-md space-y-8 animate-fade-in">
                    {/* Logo */}
                    <div className="text-center">
                        <h1 className="text-5xl font-black font-heading text-white tracking-tight">
                            RESTIN<span className="text-red-600">.AI</span>
                        </h1>
                        <p className="mt-2 text-zinc-400 text-sm tracking-wide uppercase">
                            Enterprise Hospitality OS
                        </p>
                    </div>

                    {/* Login Target Selector */}
                    <div className="flex gap-2 justify-center">
                        <Button
                            variant={loginTarget === "admin" ? "default" : "outline"}
                            className={`${loginTarget === "admin" ? "bg-red-600 hover:bg-red-700 text-white border-0" : "bg-zinc-900 border-white/10 text-white hover:bg-zinc-800"}`}
                            onClick={() => setLoginTarget("admin")}
                        >
                            <LayoutGrid className="w-4 h-4 mr-2" />
                            Admin
                        </Button>
                        <Button
                            variant={loginTarget === "pos" ? "default" : "outline"}
                            className={`${loginTarget === "pos" ? "bg-red-600 hover:bg-red-700 text-white border-0" : "bg-zinc-900 border-white/10 text-white hover:bg-zinc-800"}`}
                            onClick={() => setLoginTarget("pos")}
                        >
                            <Monitor className="w-4 h-4 mr-2" />
                            POS
                        </Button>
                        <Button
                            variant={loginTarget === "kds" ? "default" : "outline"}
                            className={`${loginTarget === "kds" ? "bg-red-600 hover:bg-red-700 text-white border-0" : "bg-zinc-900 border-white/10 text-white hover:bg-zinc-800"}`}
                            onClick={() => setLoginTarget("kds")}
                        >
                            <ChefHat className="w-4 h-4 mr-2" />
                            KDS
                        </Button>
                    </div>

                    <Card className="bg-zinc-900/90 border-white/10 backdrop-blur-xl">
                        <CardHeader className="text-center pb-4">
                            <CardTitle className="text-white text-2xl font-heading">
                                {isSuccess ? (
                                    <span className="text-green-500 animate-pulse">ACCESS GRANTED</span>
                                ) : (
                                    "ENTER PIN"
                                )}
                            </CardTitle>
                            <CardDescription className={isSuccess ? "text-green-500/80" : "text-zinc-400"}>
                                {isSuccess ? "Redirecting to Dashboard..." : "Enter your 4-digit PIN"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* PIN Display */}
                                <div className="space-y-2">
                                    <Label className="text-zinc-300 uppercase text-xs tracking-wide flex items-center gap-2">
                                        <Lock className={`w-4 h-4 ${isSuccess ? 'text-green-500' : ''}`} />
                                        PIN Code
                                    </Label>
                                    <div className={`flex justify-center gap-3 ${pinError ? 'animate-shake' : ''}`}>
                                        {[0, 1, 2, 3].map(i => (
                                            <div
                                                key={i}
                                                className={`w-14 h-14 rounded-lg bg-zinc-800 border flex items-center justify-center transition-all duration-300 ${isSuccess ? 'scale-110' : ''}`}
                                                style={{
                                                    borderColor: isSuccess ? '#22c55e' : (pinError ? '#DC2626' : 'rgba(255, 255, 255, 0.1)'),
                                                    boxShadow: isSuccess ? '0 0 20px rgba(34, 197, 94, 0.4)' : (pinError ? '0 0 8px rgba(220, 38, 38, 0.5)' : 'none'),
                                                    transform: isSuccess ? `scale(1.1) translateY(${i % 2 === 0 ? '-2px' : '2px'})` : 'none'
                                                }}
                                            >
                                                {pin[i] ? (
                                                    <div
                                                        className={`w-3 h-3 rounded-full transition-colors duration-300 ${isSuccess ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-red-600'}`}
                                                    />
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                    {pinError && (
                                        <p className="text-xs text-center text-red-500">
                                            Incorrect PIN
                                        </p>
                                    )}
                                </div>

                                {/* PIN Pad */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                        <Button
                                            key={num}
                                            variant="outline"
                                            className="h-14 text-xl font-mono bg-zinc-800 border-white/10 text-white hover:bg-zinc-700"
                                            onClick={() => handlePinInput(String(num))}
                                            disabled={loading}
                                        >
                                            {num}
                                        </Button>
                                    ))}
                                    <Button
                                        variant="outline"
                                        className="h-14 text-sm font-bold bg-zinc-800 border-white/10 hover:bg-zinc-700 text-red-500"
                                        onClick={handlePinClear}
                                        disabled={loading}
                                    >
                                        CLEAR
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-14 text-xl font-mono bg-zinc-800 border-white/10 text-white hover:bg-zinc-700"
                                        onClick={() => handlePinInput("0")}
                                        disabled={loading}
                                    >
                                        0
                                    </Button>
                                    <Button
                                        className="h-14 text-sm font-bold text-white border-0 bg-red-600 hover:bg-red-700"
                                        onClick={handlePinLogin}
                                        disabled={loading || pin.length !== 4}
                                    >
                                        {loading ? "..." : "ENTER"}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <p className="text-center text-zinc-500 text-xs text-red-500">
                        Use PIN 1111 for Demo Access
                    </p>
                </div>
            </div>
        </div>
    );
}
