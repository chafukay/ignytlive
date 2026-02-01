import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Flame, Phone, Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type LoginMode = "select" | "username" | "phone" | "verify";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<LoginMode>("select");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({ title: "Please enter username and password", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { user: loggedInUser } = await api.login(username, password);
      login(loggedInUser);
      toast({ title: `Welcome back, ${loggedInUser.username}!` });
      setLocation("/");
    } catch (error) {
      toast({ title: "Invalid credentials", description: "Please check your username and password", variant: "destructive" });
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
      const { user: loggedInUser } = await api.verifyPhoneCode(phone, verificationCode);
      login(loggedInUser);
      toast({ title: `Welcome, ${loggedInUser.username}!` });
      setLocation("/");
    } catch (error) {
      toast({ title: "Invalid code", description: "Please check the code and try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const renderSelectMode = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm space-y-4"
    >
      <button
        onClick={() => setMode("username")}
        className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        data-testid="button-login-username"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <div className="text-left">
          <p className="text-white font-medium">Continue with Username</p>
          <p className="text-white/50 text-sm">Sign in with your account</p>
        </div>
      </button>

      <button
        onClick={() => setMode("phone")}
        className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        data-testid="button-login-phone"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
          <Phone className="w-6 h-6 text-white" />
        </div>
        <div className="text-left">
          <p className="text-white font-medium">Continue with Phone</p>
          <p className="text-white/50 text-sm">We'll text you a code</p>
        </div>
      </button>
    </motion.div>
  );

  const renderUsernameMode = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm"
    >
      <button
        onClick={() => setMode("select")}
        className="flex items-center gap-2 text-white/50 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <form onSubmit={handleUsernameLogin} className="space-y-4">
        <div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
            data-testid="input-username"
          />
        </div>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
            data-testid="input-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50"
          >
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
    </motion.div>
  );

  const renderPhoneMode = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm"
    >
      <button
        onClick={() => setMode("select")}
        className="flex items-center gap-2 text-white/50 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <form onSubmit={handleSendCode} className="space-y-4">
        <div>
          <label className="text-white/70 text-sm mb-2 block">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
            data-testid="input-phone"
          />
          <p className="text-white/40 text-xs mt-2">Include country code (e.g., +1 for US)</p>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          data-testid="button-send-code"
        >
          {isLoading ? "Sending..." : "Send Verification Code"}
        </button>
      </form>
    </motion.div>
  );

  const renderVerifyMode = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm"
    >
      <button
        onClick={() => setMode("phone")}
        className="flex items-center gap-2 text-white/50 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="text-center mb-6">
        <p className="text-white/70">We sent a code to</p>
        <p className="text-white font-medium">{phone}</p>
      </div>

      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter 6-digit code"
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white text-center text-2xl tracking-widest placeholder:text-white/30 focus:outline-none focus:border-primary/50"
            maxLength={6}
            data-testid="input-verification-code"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || verificationCode.length !== 6}
          className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          data-testid="button-verify-code"
        >
          {isLoading ? "Verifying..." : "Verify & Sign In"}
        </button>
        <button
          type="button"
          onClick={handleSendCode}
          disabled={isLoading}
          className="w-full text-white/50 hover:text-white text-sm"
        >
          Resend code
        </button>
      </form>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0015] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold font-display"><span className="text-white">Ignyt</span><span className="text-pink-500">LIVE</span></h1>
          </div>
          <p className="text-white/50">
            {mode === "select" && "Choose how to sign in"}
            {mode === "username" && "Sign in with your account"}
            {mode === "phone" && "Sign in with your phone"}
            {mode === "verify" && "Enter verification code"}
          </p>
        </motion.div>

        {mode === "select" && renderSelectMode()}
        {mode === "username" && renderUsernameMode()}
        {mode === "phone" && renderPhoneMode()}
        {mode === "verify" && renderVerifyMode()}

        {mode === "select" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8 text-center"
          >
            <p className="text-white/50 text-sm mb-2">Don't have an account?</p>
            <button
              onClick={() => setLocation("/register")}
              className="text-primary font-medium hover:underline"
              data-testid="link-register"
            >
              Create Account
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
