import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useVenue } from "../context/VenueContext";
import { authAPI } from "../lib/api";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Building2, Lock, Shield, ChefHat, LayoutGrid, Monitor } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginTarget, setLoginTarget] = useState("admin"); // admin, pos, kds
  const [pinError, setPinError] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  // Stage 2: Venue selection after successful PIN
  const [showVenueSelection, setShowVenueSelection] = useState(false);
  const [allowedVenues, setAllowedVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState("");
  const [userToken, setUserToken] = useState("");
  const [userData, setUserData] = useState(null);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaUserId, setMfaUserId] = useState("");
  const [totpCode, setTotpCode] = useState("");

  // Auto-submit when PIN reaches 4 digits
  useEffect(() => {
    if (pin.length === 4 && !loading && !showVenueSelection) {
      handlePinLogin();
    }
  }, [pin]);

  const handlePinInput = (digit) => {
    if (pin.length < 4 && !loading) {
      setPin(prev => prev + digit);
      setPinError(false);
    }
  };

  const handlePinClear = () => {
    setPin("");
    setPinError(false);
  };

  const resetPinWithError = () => {
    setPinError(true);
    setTimeout(() => {
      setPin("");
      setPinError(false);
    }, 500);
  };

  const handlePinLogin = async () => {
    if (pin.length !== 4) return;

    setLoading(true);
    try {
      const deviceId = localStorage.getItem("restin_device_id") ||
        `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("restin_device_id", deviceId);

      const response = await authAPI.loginWithPin(pin, loginTarget, deviceId);

      if (response.data.requires_mfa) {
        setMfaRequired(true);
        setMfaUserId(response.data.user_id);
        setAllowedVenues(response.data.allowedVenueIds || []);
        toast.info("MFA verification required");
      } else {
        // Show success animation before proceeding
        setPinSuccess(true);
        setTimeout(() => {
          handleLoginSuccess(response.data);
        }, 600);
      }
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.detail || "Login failed";

      if (status === 401) {
        toast.error("Incorrect PIN");
      } else if (status === 403) {
        toast.error("Outside scheduled hours");
      } else if (status === 429) {
        toast.error("Too many attempts. Wait 5 minutes.");
      } else {
        toast.error(message);
      }

      resetPinWithError();
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (data) => {
    const { accessToken, user, allowedVenueIds, defaultVenueId } = data;

    // Save token and user data
    setUserToken(accessToken);
    setUserData(user);

    // If only one venue, auto-select and proceed
    if (allowedVenueIds.length === 1) {
      const venueId = allowedVenueIds[0];
      completeLogin(accessToken, user, venueId);
    }
    // If multiple venues, show selection screen
    else {
      setAllowedVenues(allowedVenueIds);
      setSelectedVenue(defaultVenueId || "");
      setShowVenueSelection(true);
    }
  };

  const handleVenueSelection = () => {
    if (!selectedVenue) {
      toast.error("Please select a venue");
      return;
    }
    completeLogin(userToken, userData, selectedVenue);
  };

  const completeLogin = (token, user, venueId) => {
    // Update user with selected venue
    const userWithVenue = { ...user, venueId };

    // Save to context and storage
    login(userWithVenue, token);
    localStorage.setItem("activeVenueId", venueId);

    toast.success(`Welcome, ${user.name}`);

    // Navigate based on login target
    switch (loginTarget) {
      case "pos":
        navigate("/pos/setup");
        break;
      case "kds":
        navigate("/kds/setup");
        break;
      default:
        navigate("/admin/dashboard");
    }
  };

  const handleMFAVerify = async () => {
    if (totpCode.length !== 6) {
      toast.error("Enter 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const deviceId = localStorage.getItem("restin_device_id");
      const response = await authAPI.verifyMFA(mfaUserId, totpCode, deviceId);
      handleLoginSuccess(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "MFA verification failed");
    } finally {
      setLoading(false);
    }
  };

  // RENDER: Venue Selection Screen
  if (showVenueSelection) {
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
          <Card className="w-full max-w-md bg-zinc-900/90 border-white/10 backdrop-blur-xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-white text-2xl font-heading">SELECT VENUE</CardTitle>
              <CardDescription className="text-zinc-400">
                Choose your venue to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="venue-select" className="text-zinc-300 uppercase text-xs tracking-wide flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Venue
                </Label>
                <Select id="venue-select" value={selectedVenue} onValueChange={setSelectedVenue}>
                  <SelectTrigger id="venue-select" className="bg-zinc-800 border-white/10 text-white h-12">
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {allowedVenues.map(venueId => (
                      <SelectItem
                        key={venueId}
                        value={venueId}
                        className="text-white hover:bg-zinc-800"
                      >
                        {venueId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full h-12 text-white border-0"
                style={{ backgroundColor: 'var(--brand-accent)' }}
                onClick={handleVenueSelection}
                disabled={!selectedVenue}
              >
                CONTINUE
              </Button>

              <Button
                variant="link"
                className="w-full text-zinc-400 hover:text-white"
                onClick={() => {
                  setShowVenueSelection(false);
                  setPin("");
                  setAllowedVenues([]);
                  setSelectedVenue("");
                }}
              >
                Back to PIN login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <h1 className="text-5xl font-heading font-bold text-white tracking-tight">
              RESTIN<span style={{ color: 'var(--brand-accent)' }}>.AI</span>
            </h1>
            <p className="mt-2 text-zinc-400 text-sm tracking-wide uppercase">
              Enterprise Hospitality OS
            </p>
          </div>

          {/* Login Target Selector */}
          <div className="flex gap-2 justify-center">
            <Button
              variant={loginTarget === "admin" ? "default" : "outline"}
              className={`${loginTarget === "admin" ? "text-white border-0" : "bg-zinc-900 border-white/10 text-white hover:bg-zinc-800"}`}
              style={loginTarget === "admin" ? { backgroundColor: 'var(--brand-accent)' } : {}}
              onClick={() => setLoginTarget("admin")}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Admin
            </Button>
            <Button
              variant={loginTarget === "pos" ? "default" : "outline"}
              className={`${loginTarget === "pos" ? "text-white border-0" : "bg-zinc-900 border-white/10 text-white hover:bg-zinc-800"}`}
              style={loginTarget === "pos" ? { backgroundColor: 'var(--brand-accent)' } : {}}
              onClick={() => setLoginTarget("pos")}
            >
              <Monitor className="w-4 h-4 mr-2" />
              POS
            </Button>
            <Button
              variant={loginTarget === "kds" ? "default" : "outline"}
              className={`${loginTarget === "kds" ? "text-white border-0" : "bg-zinc-900 border-white/10 text-white hover:bg-zinc-800"}`}
              style={loginTarget === "kds" ? { backgroundColor: 'var(--brand-accent)' } : {}}
              onClick={() => setLoginTarget("kds")}
            >
              <ChefHat className="w-4 h-4 mr-2" />
              KDS
            </Button>
          </div>

          <Card className="bg-zinc-900/90 border-white/10 backdrop-blur-xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-white text-2xl font-heading">
                {mfaRequired ? "VERIFY IDENTITY" : "ENTER PIN"}
              </CardTitle>
              <CardDescription className="text-zinc-400">
                {mfaRequired ? "Enter your authenticator code" : "Enter your 4-digit PIN"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!mfaRequired ? (
                <div className="space-y-6">
                  {/* PIN Display */}
                  <div className="space-y-2">
                    <Label className="text-zinc-300 uppercase text-xs tracking-wide flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      PIN Code
                    </Label>
                    <div className={`flex justify-center gap-3 ${pinError ? 'animate-shake' : ''}`}>
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          className={`w-14 h-14 rounded-lg bg-zinc-800 border flex items-center justify-center transition-all ${pinSuccess ? 'animate-pulse' : ''}`}
                          style={{
                            borderColor: pinError ? 'var(--brand-accent)' : pinSuccess ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                            boxShadow: pinError ? '0 0 8px var(--brand-accent-soft)' : pinSuccess ? '0 0 12px rgba(16, 185, 129, 0.5)' : 'none',
                            backgroundColor: pinSuccess ? 'rgba(16, 185, 129, 0.1)' : '#27272a'
                          }}
                        >
                          {pin[i] ? (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: pinSuccess ? '#10b981' : 'var(--brand-accent)' }}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {pinError && (
                      <p className="text-xs text-center" style={{ color: 'var(--brand-accent)' }}>
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
                        data-testid={`login-pin-digit-${num}`}
                      >
                        {num}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      className="h-14 text-sm font-bold bg-zinc-800 border-white/10 hover:bg-zinc-700"
                      style={{ color: 'var(--brand-accent)' }}
                      onClick={handlePinClear}
                      disabled={loading}
                      data-testid="login-pin-clear"
                    >
                      CLEAR
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 text-xl font-mono bg-zinc-800 border-white/10 text-white hover:bg-zinc-700"
                      onClick={() => handlePinInput("0")}
                      disabled={loading}
                      data-testid="login-pin-digit-0"
                    >
                      0
                    </Button>
                    <Button
                      className="h-14 text-sm font-bold text-white border-0"
                      style={{ backgroundColor: 'var(--brand-accent)' }}
                      onClick={handlePinLogin}
                      disabled={loading || pin.length !== 4}
                      data-testid="login-pin-submit"
                    >
                      {loading ? "..." : "ENTER"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="mfa-code" className="text-zinc-300 uppercase text-xs tracking-wide flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Authenticator Code
                    </Label>
                    <Input
                      id="mfa-code"
                      type="text"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="bg-zinc-800 border-white/10 text-white text-center text-2xl font-mono h-14 tracking-[0.5em]"
                    />
                  </div>

                  <Button
                    className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold uppercase"
                    onClick={handleMFAVerify}
                    disabled={loading || totpCode.length !== 6}
                  >
                    {loading ? "Verifying..." : "Verify"}
                  </Button>

                  <Button
                    variant="link"
                    className="w-full text-zinc-400 hover:text-white"
                    onClick={() => {
                      setMfaRequired(false);
                      setMfaUserId("");
                      setTotpCode("");
                      setPin("");
                    }}
                  >
                    Back to PIN login
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-zinc-500 text-xs">
            Test PINs: Owner 1234 | Manager 2345 | Staff 1111
          </p>
        </div>
      </div>
    </div>
  );
}
