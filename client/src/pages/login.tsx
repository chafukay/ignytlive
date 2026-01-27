import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Flame, ChevronRight, Shield, Crown, Star, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const demoUsers = [
  { username: "SuperAdmin", password: "admin123", role: "superadmin", icon: Shield, color: "from-red-500 to-orange-500" },
  { username: "AdminMike", password: "admin123", role: "admin", icon: Crown, color: "from-purple-500 to-pink-500" },
  { username: "NeonQueen", password: "demo123", role: "user", icon: Star, color: "from-cyan-500 to-blue-500" },
  { username: "NewUser123", password: "demo123", role: "user", icon: User, color: "from-green-500 to-teal-500" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
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

  const handleDemoLogin = async (demoUser: typeof demoUsers[0]) => {
    setIsLoading(true);
    try {
      const { user: loggedInUser } = await api.login(demoUser.username, demoUser.password);
      login(loggedInUser);
      toast({ title: `Logged in as ${loggedInUser.username}` });
      setLocation("/");
    } catch (error) {
      toast({ title: "Demo login failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1 className="text-4xl font-bold font-display"><span className="text-white">IGNYT</span><span className="text-pink-500">LIVE</span></h1>
          </div>
          <p className="text-white/50">Sign in to continue</p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleLogin}
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
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-center"
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 w-full max-w-sm"
        >
          <p className="text-white/30 text-xs text-center mb-4">DEMO ACCOUNTS</p>
          <div className="space-y-2">
            {demoUsers.map((demo) => (
              <button
                key={demo.username}
                onClick={() => handleDemoLogin(demo)}
                disabled={isLoading}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
                data-testid={`demo-${demo.username}`}
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${demo.color} flex items-center justify-center`}>
                  <demo.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-medium">{demo.username}</p>
                  <p className="text-white/50 text-xs capitalize">{demo.role}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/30" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
