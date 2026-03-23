import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    } else if (user.emailVerified) {
      setVerified(true);
    }
  }, [user]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !code.trim()) return;

    setIsVerifying(true);
    try {
      const result = await api.verifyEmail(user.id, code.trim());
      setUser(result.user);
      setVerified(true);
      toast({ title: "Email verified successfully!" });
    } catch (error: any) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!user || cooldown > 0) return;

    setIsResending(true);
    try {
      await api.sendEmailVerification(user.id);
      toast({ title: "Verification code sent", description: "Check your email for the new code" });
      setCooldown(60);
    } catch (error: any) {
      toast({ title: "Failed to resend", description: error.message, variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0015] flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="text-center"
        >
          <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
          <p className="text-white/50 mb-6">Your email has been successfully verified.</p>
          <button
            onClick={() => setLocation("/")}
            className="bg-gradient-to-r from-primary to-pink-500 text-white font-bold py-3 px-8 rounded-xl hover:opacity-90 transition-opacity"
            data-testid="button-continue-home"
          >
            Continue to App
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0015] flex flex-col">
      <div className="p-4">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
          Skip for now
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verify Your Email</h1>
          <p className="text-white/50 text-sm max-w-xs">
            We sent a 6-digit verification code to{" "}
            <span className="text-primary font-medium">{user?.email}</span>
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleVerify}
          className="w-full max-w-sm space-y-4"
        >
          <div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 6-digit code"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white text-center text-2xl tracking-[0.5em] placeholder:text-white/20 placeholder:text-base placeholder:tracking-normal focus:outline-none focus:border-primary/50"
              data-testid="input-verification-code"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || code.length !== 6}
            className="w-full bg-gradient-to-r from-primary to-pink-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            data-testid="button-verify"
          >
            {isVerifying ? "Verifying..." : "Verify Email"}
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-center"
        >
          <p className="text-white/30 text-sm mb-2">Didn't receive the code?</p>
          <button
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm disabled:text-white/20 mx-auto"
            data-testid="button-resend"
          >
            <RefreshCw className={`w-4 h-4 ${isResending ? "animate-spin" : ""}`} />
            {cooldown > 0 ? `Resend in ${cooldown}s` : isResending ? "Sending..." : "Resend Code"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
