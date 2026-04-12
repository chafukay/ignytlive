import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Phone, ArrowLeft, User, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { GoogleLogin } from "@react-oauth/google";
import { isNative } from "@/lib/capacitor";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"main" | "username" | "phone" | "verify" | "guest">("main");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [guestUsername, setGuestUsername] = useState("");
  const [guestBirthdate, setGuestBirthdate] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const handleNativeGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'https://ignyt.replit.app';
      const googleClientIdVal = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = `${serverUrl}/api/auth/google/callback`;
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientIdVal}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('openid email profile')}&prompt=select_account`;

      const { App } = await import('@capacitor/app');

      App.addListener('appUrlOpen', async (event: { url: string }) => {
        try {
          const url = new URL(event.url);
          const token = url.searchParams.get('token');
          const userJson = url.searchParams.get('user');
          const needsAge = url.searchParams.get('needsAge') === 'true';

          if (token && userJson) {
            const user = JSON.parse(decodeURIComponent(userJson));
            login(user, token);
            if (needsAge) {
              toast({ title: `Welcome, ${user.username}!`, description: "Please verify your age in settings" });
            } else {
              toast({ title: `Welcome, ${user.username}!` });
            }
            setLocation("/");
          }
        } catch (err) {
          toast({ title: "Google sign in failed", description: "Could not parse response", variant: "destructive" });
        }
        setIsLoading(false);
      });

      window.open(authUrl, '_system');
    } catch (error: any) {
      toast({ title: "Google sign in failed", description: error?.message || "Please try again", variant: "destructive" });
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    setIsLoading(true);
    try {
      const result = await api.googleLogin(credentialResponse.credential);
      login(result.user, result.token);

      if (result.needsAge) {
        toast({ title: `Welcome, ${result.user.username}!`, description: "Please verify your age in settings" });
      } else {
        toast({ title: `Welcome, ${result.user.username}!` });
      }
      setLocation("/");
    } catch (error: any) {
      toast({ title: "Google sign in failed", description: error?.message || "Please try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({ title: "Please enter username and password", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.login(username, password);
      if (!result.user) {
        throw new Error("No user in response");
      }
      login(result.user, result.token);
      if (result.verifyToken) {
        localStorage.setItem("verifyToken", result.verifyToken);
      }
      toast({ title: `Welcome back, ${result.user.username}!` });
      setLocation("/");
    } catch (error: any) {
      toast({ title: "Login failed", description: error?.message || "Please check your username and password", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast({ title: "Please enter your phone number", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.sendPhoneCode(phone);
      toast({ title: result.message });
      setMode("verify");
    } catch (error) {
      toast({ title: "Failed to send code", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      toast({ title: "Please enter the verification code", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.verifyPhoneCode(phone, verificationCode);
      login(result.user, result.token);
      toast({ title: `Welcome, ${result.user.username}!` });
      setLocation("/");
    } catch (error) {
      toast({ title: "Invalid code", description: "Please check the code and try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestBirthdate) {
      toast({ title: "Please enter your date of birth", variant: "destructive" });
      return;
    }
    if (!disclaimerAccepted) {
      toast({ title: "Please accept the content disclaimer", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const guestResult = await api.guestLogin({
        username: guestUsername.trim() || undefined,
        birthdate: guestBirthdate,
        disclaimerAccepted,
      });
      login(guestResult.user, guestResult.token);
      toast({ title: `Welcome${guestResult.user.username.startsWith('guest_') ? '' : `, ${guestResult.user.username}`}! You're browsing as a guest`, description: "Some features are limited" });
      setLocation("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start guest session";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "username") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0015] flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <button onClick={() => setMode("main")} className="flex items-center gap-2 text-white/50 hover:text-white mb-6" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h2 className="text-xl font-bold text-white mb-1">Sign in</h2>
          <p className="text-white/40 text-sm mb-6">Enter your username and password</p>
          <form onSubmit={handleUsernameLogin} className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
              data-testid="input-username"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
                data-testid="input-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-pink-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              data-testid="button-login"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="text-center text-white/40 text-sm mt-6">
            Don't have an account?{" "}
            <button onClick={() => setLocation("/register")} className="text-primary hover:underline" data-testid="link-register">Sign up</button>
          </p>
        </motion.div>
      </div>
    );
  }

  if (mode === "phone") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0015] flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <button onClick={() => setMode("main")} className="flex items-center gap-2 text-white/50 hover:text-white mb-6" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h2 className="text-xl font-bold text-white mb-1">Phone sign in</h2>
          <p className="text-white/40 text-sm mb-6">We'll text you a verification code</p>
          <form onSubmit={handleSendCode} className="space-y-4">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
              data-testid="input-phone"
            />
            <p className="text-white/30 text-xs">Include country code (e.g., +1 for US)</p>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-pink-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              data-testid="button-send-code"
            >
              {isLoading ? "Sending..." : "Send Code"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (mode === "guest") {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 18);
    const maxDateStr = maxDate.toISOString().split("T")[0];

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0015] flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <button onClick={() => setMode("main")} className="flex items-center gap-2 text-white/50 hover:text-white mb-6" data-testid="button-back-guest">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h2 className="text-xl font-bold text-white mb-1">Browse as Guest</h2>
          <p className="text-white/40 text-sm mb-6">View-only access — some features are limited</p>
          <form onSubmit={handleGuestLogin} className="space-y-4">
            <div>
              <label className="text-white/60 text-xs mb-1 block">Display Name (optional)</label>
              <input
                type="text"
                value={guestUsername}
                onChange={(e) => setGuestUsername(e.target.value)}
                placeholder="Pick a username"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
                maxLength={20}
                data-testid="input-guest-username"
              />
              <p className="text-white/30 text-xs mt-1">3-20 characters, letters, numbers, underscores</p>
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Date of Birth <span className="text-red-400">*</span></label>
              <input
                type="date"
                value={guestBirthdate}
                onChange={(e) => setGuestBirthdate(e.target.value)}
                max={maxDateStr}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 [color-scheme:dark]"
                required
                data-testid="input-guest-birthdate"
              />
              <p className="text-white/30 text-xs mt-1">You must be at least 18 years old</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white/90 text-sm font-medium mb-2">Content Disclaimer</p>
                  <p className="text-white/60 text-xs leading-relaxed mb-3">
                    This platform contains live streaming content that may include adult-oriented material. By continuing, you confirm you are at least 18 years old and understand you may encounter such content.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={disclaimerAccepted}
                      onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                      className="w-4 h-4 rounded accent-primary"
                      data-testid="input-guest-disclaimer"
                    />
                    <span className="text-white/80 text-xs">I am 18+ and accept this disclaimer</span>
                  </label>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !guestBirthdate || !disclaimerAccepted}
              className="w-full bg-gradient-to-r from-primary to-pink-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              data-testid="button-guest-submit"
            >
              {isLoading ? "Starting..." : "Continue as Guest"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (mode === "verify") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0015] flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <button onClick={() => setMode("phone")} className="flex items-center gap-2 text-white/50 hover:text-white mb-6" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-1">Enter code</h2>
            <p className="text-white/40 text-sm">Sent to {phone}</p>
          </div>
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white text-center text-2xl tracking-widest placeholder:text-white/30 focus:outline-none focus:border-primary/50"
              maxLength={6}
              data-testid="input-verification-code"
            />
            <button
              type="submit"
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full bg-gradient-to-r from-primary to-pink-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              data-testid="button-verify-code"
            >
              {isLoading ? "Verifying..." : "Verify & Sign In"}
            </button>
            <button type="button" onClick={handleSendCode} disabled={isLoading} className="w-full text-white/50 hover:text-white text-sm">
              Resend code
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0015] flex flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <div className="flex flex-col items-center justify-center mb-2">
          <img src="/logo-ignyt.png" alt="IgnytLIVE" className="w-24 h-24 rounded-2xl" />
        </div>
        <p className="text-white/50">Live streaming, reimagined</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-3">
        {googleClientId && !isNative() && (
          <div className="relative w-full" data-testid="button-login-google">
            <div className="w-full bg-white/10 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-3 border border-white/10 pointer-events-none">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </div>
            <div className="absolute inset-0 overflow-hidden rounded-xl opacity-0 cursor-pointer [&>div]:!w-full [&>div]:!max-w-full [&_iframe]:!w-full [&_iframe]:!h-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  toast({ title: "Google sign in failed", description: "Please try again", variant: "destructive" });
                }}
                size="large"
                width="400"
                text="continue_with"
              />
            </div>
          </div>
        )}

        {googleClientId && isNative() && (
          <button
            onClick={handleNativeGoogleSignIn}
            className="w-full bg-white/10 text-white font-semibold py-3.5 rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-3 border border-white/10"
            data-testid="button-login-google-native"
            disabled={isLoading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        )}

        <button
          onClick={() => setMode("username")}
          className="w-full bg-white/10 text-white font-semibold py-3.5 rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-3 border border-white/10"
          data-testid="button-login-username"
        >
          <User className="w-5 h-5" />
          Sign in with Username
        </button>

        {/* Phone sign-in disabled for now
        <button
          onClick={() => setMode("phone")}
          className="w-full bg-white/10 text-white font-semibold py-3.5 rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-3 border border-white/10"
          data-testid="button-login-phone"
        >
          <Phone className="w-5 h-5" />
          Sign in with Phone
        </button>
        */}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-8 space-y-4 text-center">
        <button
          onClick={() => setMode("guest")}
          className="text-white/50 hover:text-white text-sm transition-colors"
          data-testid="button-login-guest"
        >
          Browse as Guest
        </button>

        <div className="flex items-center gap-2 justify-center">
          <span className="text-white/40 text-sm">New here?</span>
          <button onClick={() => setLocation("/register")} className="text-primary font-medium text-sm hover:underline" data-testid="link-register">
            Create Account
          </button>
        </div>

        <p className="text-white/30 text-xs px-8">
          By continuing, you confirm you are 18+ and agree to our Terms of Service
        </p>
      </motion.div>
    </div>
  );
}
