import { useState } from "react";
import { useLocation } from "wouter";
import { Mail, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.isGuest || user.emailVerified || dismissed) return null;

  return (
    <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 mx-4 mb-3 flex items-center gap-3" data-testid="banner-verify-email">
      <Mail className="w-5 h-5 text-amber-400 shrink-0" />
      <p className="text-foreground text-sm flex-1">
        Verify your email to secure your account.
      </p>
      <button
        onClick={() => setLocation("/verify-email")}
        className="bg-amber-500 text-black px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap"
        data-testid="button-verify-email-banner"
      >
        Verify
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-white/30 hover:text-white/60"
        data-testid="button-dismiss-verify-banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
