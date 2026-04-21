import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getServerUrl } from "@/lib/capacitor";
import { api } from "@/lib/api";

const API_BASE = getServerUrl();

function looksLikePhone(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (t.startsWith("+")) return true;
  // Mostly digits, no @, no letters beyond a few separators
  return /^[\d\s().-]{7,}$/.test(t);
}

function countryToFlag(iso: string): string {
  if (!iso || iso.length !== 2) return "";
  const A = 0x1f1e6;
  const upper = iso.toUpperCase();
  return String.fromCodePoint(A + upper.charCodeAt(0) - 65, A + upper.charCodeAt(1) - 65);
}

async function postJson(path: string, body: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

type Step = "request" | "reset" | "done";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [channelHint, setChannelHint] = useState("");
  const [countryInfo, setCountryInfo] = useState<{ valid: boolean; supported: boolean; country?: string; countryName?: string } | null>(null);

  // Debounced inline check when identifier looks like a phone number
  useEffect(() => {
    if (step !== "request") {
      setCountryInfo(null);
      return;
    }
    const trimmed = identifier.trim();
    if (!looksLikePhone(trimmed) || trimmed.length < 6) {
      setCountryInfo(null);
      return;
    }
    const t = setTimeout(() => {
      api.checkPhoneCountry(trimmed)
        .then((info) => setCountryInfo(info))
        .catch(() => setCountryInfo(null));
    }, 200);
    return () => clearTimeout(t);
  }, [identifier, step]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast({ title: "Please enter your email, phone, or username", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res: any = await postJson("/api/auth/forgot-password", { identifier: identifier.trim() });
      setChannelHint(res?.hint ? `Code sent to ${res.hint}` : "If an account exists, a reset code was sent.");
      setStep("reset");
      toast({ title: "Reset code sent", description: res?.hint ? `Check ${res.hint}` : "Check your email or messages." });
    } catch (err: any) {
      toast({ title: "Request failed", description: err?.message || "Please try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await postJson("/api/auth/reset-password", {
        identifier: identifier.trim(),
        code,
        newPassword,
      });
      setStep("done");
      toast({ title: "Password reset!", description: "You can now log in with your new password." });
    } catch (err: any) {
      toast({ title: "Reset failed", description: err?.message || "Invalid or expired code", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <button
          onClick={() => setLocation("/login")}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-6"
          data-testid="button-back-login"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Sign In
        </button>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          {step === "request" && (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Forgot Password</h1>
              <p className="text-white/60 text-sm mb-6">
                Enter the email, phone number, or username for your account. We'll send a code to reset your password.
              </p>
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Email, phone, or username"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
                    data-testid="input-identifier"
                    autoFocus
                  />
                </div>
                {countryInfo?.country && countryInfo.countryName && (
                  <p
                    className={`text-xs flex items-center gap-1 ${countryInfo.valid && !countryInfo.supported ? "text-amber-400" : "text-white/50"}`}
                    data-testid="text-country-info"
                  >
                    <span className="text-base">{countryToFlag(countryInfo.country)}</span>
                    <span>{countryInfo.countryName}</span>
                    {countryInfo.valid && !countryInfo.supported && (
                      <span className="ml-1">— SMS not supported. Try your email instead.</span>
                    )}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isLoading || !!(countryInfo && countryInfo.valid && !countryInfo.supported)}
                  className="w-full bg-gradient-to-r from-primary to-pink-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                  data-testid="button-send-code"
                >
                  {isLoading ? "Sending..." : "Send Reset Code"}
                </button>
              </form>
            </>
          )}

          {step === "reset" && (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
              <p className="text-white/60 text-sm mb-2">{channelHint}</p>
              <p className="text-white/40 text-xs mb-6">Code expires in 15 minutes.</p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-center text-2xl tracking-widest"
                  data-testid="input-reset-code"
                  autoFocus
                />
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
                    data-testid="input-confirm-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary to-pink-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                  data-testid="button-reset-password"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep("request"); setCode(""); setNewPassword(""); setConfirmPassword(""); }}
                  className="w-full text-white/60 hover:text-white text-sm py-2"
                  data-testid="button-resend"
                >
                  Didn't get a code? Try again
                </button>
              </form>
            </>
          )}

          {step === "done" && (
            <div className="text-center py-6">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Password Reset!</h1>
              <p className="text-white/60 mb-6">Your password has been updated. You can now sign in with your new password.</p>
              <button
                onClick={() => setLocation("/login")}
                className="w-full bg-gradient-to-r from-primary to-pink-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                data-testid="button-go-login"
              >
                Go to Sign In
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
