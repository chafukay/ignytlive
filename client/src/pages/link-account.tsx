import Layout from "@/components/layout";
import { ArrowLeft, Mail, Phone, Shield, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function LinkAccount() {
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState<'none' | 'email' | 'phone'>('none');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasRealEmail = user?.email && !user.email.includes('@phone.ignyt.live');
  const hasPhone = user?.phone && user?.phoneVerified;

  const handleLinkEmail = async () => {
    if (!user) return;
    if (!email || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/link-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data.user);
      toast({ title: "Email linked successfully!" });
      setActiveSection('none');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: err.message || "Failed to link email", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!user) return;
    if (!phoneNumber) {
      toast({ title: "Please enter a phone number", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/link-phone/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCodeSent(true);
      toast({ title: data.message });
    } catch (err: any) {
      toast({ title: err.message || "Failed to send code", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!user) return;
    if (!verificationCode) {
      toast({ title: "Please enter the verification code", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/link-phone/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, code: verificationCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data.user);
      toast({ title: "Phone number linked successfully!" });
      setActiveSection('none');
      setPhoneNumber('');
      setVerificationCode('');
      setCodeSent(false);
    } catch (err: any) {
      toast({ title: err.message || "Failed to verify phone", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkPhone = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/unlink-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data.user);
      toast({ title: "Phone number unlinked" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to unlink phone", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <Shield className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Login Required</h2>
          <p className="text-muted-foreground">Log in to manage your linked accounts</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 pb-24 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setLocation("/profile")}
            className="p-2 rounded-full bg-muted hover:bg-muted/80"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Link Account</h1>
        </div>

        <p className="text-muted-foreground text-sm mb-6">
          Link additional login methods to secure your account and make it easier to sign in.
        </p>

        {/* Email Section */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasRealEmail ? 'bg-green-500/20' : 'bg-muted'}`}>
                <Mail className={`w-5 h-5 ${hasRealEmail ? 'text-green-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Email</h3>
                {hasRealEmail ? (
                  <p className="text-sm text-green-500 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {user.email}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Not linked
                  </p>
                )}
              </div>
            </div>
            {!hasRealEmail && (
              <button
                onClick={() => setActiveSection(activeSection === 'email' ? 'none' : 'email')}
                className="bg-primary text-white text-sm px-4 py-2 rounded-full font-medium"
                data-testid="button-link-email"
              >
                {activeSection === 'email' ? 'Cancel' : 'Link'}
              </button>
            )}
          </div>

          {activeSection === 'email' && !hasRealEmail && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="input-link-email"
              />
              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="input-link-password"
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="input-link-confirm-password"
              />
              <button
                onClick={handleLinkEmail}
                disabled={loading}
                className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-submit-link-email"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Link Email
              </button>
            </div>
          )}
        </div>

        {/* Phone Section */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasPhone ? 'bg-green-500/20' : 'bg-muted'}`}>
                <Phone className={`w-5 h-5 ${hasPhone ? 'text-green-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Phone Number</h3>
                {hasPhone ? (
                  <p className="text-sm text-green-500 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {user.phone}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Not linked
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {hasPhone && hasRealEmail && (
                <button
                  onClick={handleUnlinkPhone}
                  disabled={loading}
                  className="bg-red-500/20 text-red-400 text-sm px-4 py-2 rounded-full font-medium"
                  data-testid="button-unlink-phone"
                >
                  Unlink
                </button>
              )}
              {!hasPhone && (
                <button
                  onClick={() => setActiveSection(activeSection === 'phone' ? 'none' : 'phone')}
                  className="bg-primary text-white text-sm px-4 py-2 rounded-full font-medium"
                  data-testid="button-link-phone"
                >
                  {activeSection === 'phone' ? 'Cancel' : 'Link'}
                </button>
              )}
            </div>
          </div>

          {activeSection === 'phone' && !hasPhone && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              {!codeSent ? (
                <>
                  <input
                    type="tel"
                    placeholder="Enter phone number (e.g. +1234567890)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="input-link-phone"
                  />
                  <button
                    onClick={handleSendCode}
                    disabled={loading}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="button-send-code"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Send Verification Code
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Enter the code sent to {phoneNumber}
                  </p>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-center text-2xl tracking-widest"
                    data-testid="input-verify-code"
                  />
                  <button
                    onClick={handleVerifyPhone}
                    disabled={loading}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="button-verify-phone"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Verify & Link
                  </button>
                  <button
                    onClick={() => { setCodeSent(false); setVerificationCode(''); }}
                    className="w-full text-muted-foreground text-sm py-2"
                    data-testid="button-resend-code"
                  >
                    Resend code
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Social Login Section */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.socialProvider ? 'bg-green-500/20' : 'bg-muted'}`}>
                <Shield className={`w-5 h-5 ${user.socialProvider ? 'text-green-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Social Login</h3>
                {user.socialProvider ? (
                  <p className="text-sm text-green-500 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Connected via {user.socialProvider}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Not connected
                  </p>
                )}
              </div>
            </div>
            {!user.socialProvider && (
              <a
                href="/api/login"
                className="bg-primary text-white text-sm px-4 py-2 rounded-full font-medium"
                data-testid="button-link-social"
              >
                Connect
              </a>
            )}
          </div>
        </div>

        {/* Security Tips */}
        <div className="bg-muted/50 rounded-2xl p-5 mt-6">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Security Tips
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Link multiple login methods to prevent losing access to your account.</li>
            <li>Use a strong password with at least 6 characters.</li>
            <li>Keep your phone number up to date for account recovery.</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
