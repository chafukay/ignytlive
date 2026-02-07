import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { LogIn } from "lucide-react";
import Layout from "./layout";

export function GuestGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (user?.isGuest) {
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
            onClick={() => {
              setLocation("/login");
            }}
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
