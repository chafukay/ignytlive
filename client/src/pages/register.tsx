import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Flame, ArrowLeft, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pw)) return "Must include at least one uppercase letter";
  if (!/[a-z]/.test(pw)) return "Must include at least one lowercase letter";
  if (!/[0-9]/.test(pw)) return "Must include at least one number";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Must include at least one special character";
  return null;
}

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ageError, setAgeError] = useState("");

  const validateAge = (dob: string): boolean => {
    if (!dob) return false;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 18;
  };

  const handleBirthdateChange = (value: string) => {
    setBirthdate(value);
    if (value && !validateAge(value)) {
      setAgeError("You must be at least 18 years old to use IgnytLIVE");
    } else {
      setAgeError("");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !email.trim() || !password.trim() || !birthdate) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (!validateAge(birthdate)) {
      toast({ title: "You must be at least 18 years old", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    const pwError = validatePassword(password);
    if (pwError) {
      toast({ title: pwError, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { user: newUser } = await api.register(username, email, password, birthdate);
      login(newUser);
      toast({ title: `Welcome to Ignyt Live, ${newUser.username}!` });
      setLocation("/");
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.message || "Please try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#16082a] to-[#0d0015] flex flex-col">
      <div className="p-4">
        <button
          onClick={() => setLocation("/login")}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Login
        </button>
      </div>

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
          <p className="text-white/50">Create your account</p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleRegister}
          className="w-full max-w-sm space-y-4"
        >
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
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
              data-testid="input-email"
            />
          </div>
          <div>
            <label className="block text-white/50 text-sm mb-1 px-1">Date of Birth</label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => handleBirthdateChange(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className={`w-full bg-white/5 border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary/50 ${
                ageError ? "border-red-500" : "border-white/10"
              }`}
              data-testid="input-birthdate"
            />
            {ageError && (
              <div className="flex items-center gap-2 mt-1 px-1">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-xs" data-testid="text-age-error">{ageError}</p>
              </div>
            )}
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
          {password.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1" data-testid="password-requirements">
              {[
                { test: password.length >= 8, label: "8+ chars" },
                { test: /[A-Z]/.test(password), label: "A-Z" },
                { test: /[a-z]/.test(password), label: "a-z" },
                { test: /[0-9]/.test(password), label: "0-9" },
                { test: /[^A-Za-z0-9]/.test(password), label: "!@#$" },
              ].map(({ test, label }) => (
                <span key={label} className={`text-xs px-2 py-0.5 rounded-full ${test ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/30"}`}>
                  {test ? "✓" : "○"} {label}
                </span>
              ))}
            </div>
          )}
          <div>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
              data-testid="input-confirm-password"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !!ageError}
            className="w-full bg-gradient-to-r from-primary to-pink-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            data-testid="button-register"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </motion.form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-white/30 text-xs text-center max-w-xs"
        >
          By creating an account, you confirm you are 18+ and agree to our{" "}
          <span onClick={() => setLocation("/terms")} className="text-primary/70 hover:text-primary cursor-pointer underline" data-testid="link-terms">Terms of Service</span>
          {" "}and{" "}
          <span onClick={() => setLocation("/privacy")} className="text-primary/70 hover:text-primary cursor-pointer underline" data-testid="link-privacy">Privacy Policy</span>
        </motion.p>
      </div>
    </div>
  );
}
