import { useState, useEffect } from "react";
import { Link } from "wouter";
import { X } from "lucide-react";

const COOKIE_CONSENT_KEY = "ignyt_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const dismiss = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "dismissed");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      data-testid="cookie-consent-banner"
      className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[60] animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm text-gray-200 leading-relaxed">
              We use cookies and local storage to improve your experience.
              By continuing, you agree to our{" "}
              <Link
                href="/privacy-policy"
                className="text-purple-400 underline hover:text-purple-300"
                data-testid="link-privacy-policy-cookie"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-gray-400 hover:text-white shrink-0 mt-0.5"
            data-testid="button-dismiss-cookie"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={accept}
            data-testid="button-accept-cookies"
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Accept
          </button>
          <button
            onClick={dismiss}
            data-testid="button-decline-cookies"
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
