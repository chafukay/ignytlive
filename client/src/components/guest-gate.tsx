import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { LogIn, Edit2, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Layout from "./layout";

export function GuestGate({ children, allowProfile }: { children: React.ReactNode; allowProfile?: boolean }) {
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  if (user?.isGuest) {
    if (allowProfile) {
      return (
        <Layout>
          <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
            <div className="w-20 h-20 bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">👤</span>
            </div>
            {editingName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New username"
                  className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white text-center placeholder:text-white/30 focus:outline-none focus:border-primary/50 w-48"
                  maxLength={20}
                  autoFocus
                  data-testid="input-guest-edit-name"
                />
                <button
                  onClick={async () => {
                    if (!newName.trim() || newName.trim().length < 3) {
                      toast({ title: "Username must be at least 3 characters", variant: "destructive" });
                      return;
                    }
                    setSaving(true);
                    try {
                      const updated = await api.updateUser(user.id, { username: newName.trim() });
                      setUser(updated);
                      toast({ title: "Username updated!" });
                      setEditingName(false);
                    } catch (err) {
                      const message = err instanceof Error ? err.message : "Failed to update username";
                      toast({ title: message, variant: "destructive" });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="p-2 bg-green-500/20 rounded-lg text-green-400 hover:bg-green-500/30"
                  data-testid="button-save-guest-name"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="p-2 bg-red-500/20 rounded-lg text-red-400 hover:bg-red-500/30"
                  data-testid="button-cancel-guest-name"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-white" data-testid="text-guest-username">{user.username}</h2>
                <button
                  onClick={() => { setNewName(user.username); setEditingName(true); }}
                  className="p-1.5 bg-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/20"
                  data-testid="button-edit-guest-name"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full mb-4">Guest Account</span>
            <p className="text-gray-400 text-sm mb-6 max-w-sm">
              You're browsing as a guest. Create a free account to unlock all features like live streaming, chat, gifting, and more.
            </p>
            <button
              onClick={() => setLocation("/login")}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              data-testid="button-guest-signup"
            >
              Create Account
            </button>
          </div>
        </Layout>
      );
    }

    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
          <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mb-6">
            <LogIn className="w-10 h-10 text-pink-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Account Required</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
            Create a free account or log in to access this feature. Guest accounts can only browse and watch streams.
          </p>
          <button
            onClick={() => setLocation("/login")}
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
            data-testid="button-guest-login"
          >
            Log In or Sign Up
          </button>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
}

export function useGuestCheck() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const isGuest = user?.isGuest === true;

  const requireAccount = (callback?: () => void) => {
    if (isGuest) {
      setLocation("/login");
      return true;
    }
    callback?.();
    return false;
  };

  return { isGuest, requireAccount };
}
