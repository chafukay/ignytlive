import Layout from "@/components/layout";
import { ChevronRight, User, Bell, Lock, Eye, Globe, Moon, Sun, HelpCircle, Info, LogOut, Video, Coins } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-context";

export default function Settings() {
  const { user, logout, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  
  const [availableForPrivateCall, setAvailableForPrivateCall] = useState(user?.availableForPrivateCall || false);
  const [privateCallRate, setPrivateCallRate] = useState(user?.privateCallRate || 50);
  const [billingMode, setBillingMode] = useState(user?.privateCallBillingMode || "per_minute");
  const [sessionPrice, setSessionPrice] = useState(user?.privateCallSessionPrice || 500);
  const [showCallSettings, setShowCallSettings] = useState(false);

  useEffect(() => {
    if (user) {
      setAvailableForPrivateCall(user.availableForPrivateCall || false);
      setPrivateCallRate(user.privateCallRate || 50);
      setBillingMode(user.privateCallBillingMode || "per_minute");
      setSessionPrice(user.privateCallSessionPrice || 500);
    }
  }, [user]);

  const updateSettingsMutation = useMutation({
    mutationFn: () => api.updatePrivateCallSettings(user!.id, {
      availableForPrivateCall,
      privateCallRate,
      privateCallBillingMode: billingMode,
      privateCallSessionPrice: sessionPrice,
    }),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({ title: "Settings saved", description: "Your private call settings have been updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    },
  });

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const settingsItems: Array<{
    icon: typeof User;
    label: string;
    href?: string;
    toggle?: boolean;
    value?: boolean;
    onChange?: (val: boolean) => void;
    extra?: string;
    isTheme?: boolean;
  }> = [
    { icon: User, label: "Edit Profile", href: "/edit-profile" },
    { icon: Bell, label: "Notifications", toggle: true, value: notifications, onChange: setNotifications },
    { icon: Lock, label: "Privacy", href: "/privacy" },
    { icon: Eye, label: "Private Account", toggle: true, value: privateAccount, onChange: setPrivateAccount },
    { icon: Globe, label: "Language", extra: "English" },
    { icon: theme === "dark" ? Moon : Sun, label: "Dark Mode", toggle: true, value: theme === "dark", isTheme: true },
    { icon: HelpCircle, label: "Help & Support", href: "/help" },
    { icon: Info, label: "About", href: "/about" },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/profile")} className="text-white">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-white">Settings</h1>
        </div>

        <div className="space-y-1">
          {settingsItems.map((item) => (
            <div key={item.label}>
              {item.href ? (
                <Link href={item.href}>
                  <div className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5">
                    <item.icon className="w-5 h-5 text-white/70" />
                    <span className="flex-1 text-white">{item.label}</span>
                    {item.extra && <span className="text-white/50 text-sm">{item.extra}</span>}
                    <ChevronRight className="w-5 h-5 text-white/30" />
                  </div>
                </Link>
              ) : item.toggle ? (
                <div 
                  onClick={() => item.isTheme ? toggleTheme() : item.onChange?.(!item.value)}
                  className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5"
                  data-testid={item.isTheme ? "toggle-dark-mode" : undefined}
                >
                  <item.icon className={`w-5 h-5 ${item.isTheme && theme === "dark" ? "text-indigo-400" : item.isTheme ? "text-yellow-500" : "text-white/70"}`} />
                  <span className="flex-1 text-white">{item.label}</span>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors ${item.value ? (item.isTheme ? "bg-indigo-500" : "bg-primary") : "bg-white/20"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${item.value ? "translate-x-6" : "translate-x-0"}`} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5">
                  <item.icon className="w-5 h-5 text-white/70" />
                  <span className="flex-1 text-white">{item.label}</span>
                  {item.extra && <span className="text-white/50 text-sm">{item.extra}</span>}
                  <ChevronRight className="w-5 h-5 text-white/30" />
                </div>
              )}
            </div>
          ))}

          <div 
            onClick={() => setShowCallSettings(!showCallSettings)}
            className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5"
          >
            <Video className="w-5 h-5 text-pink-400" />
            <span className="flex-1 text-white">Private Call Settings</span>
            <ChevronRight className={`w-5 h-5 text-white/30 transition-transform ${showCallSettings ? 'rotate-90' : ''}`} />
          </div>

          {showCallSettings && (
            <div className="bg-white/5 p-4 space-y-4">
              <div 
                onClick={() => setAvailableForPrivateCall(!availableForPrivateCall)}
                className="flex items-center gap-4 cursor-pointer"
              >
                <span className="flex-1 text-white">Available for Private Calls</span>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${availableForPrivateCall ? "bg-pink-500" : "bg-white/20"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${availableForPrivateCall ? "translate-x-6" : "translate-x-0"}`} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">Billing Mode</label>
                <div className="flex gap-2">
                  <Button
                    variant={billingMode === "per_minute" ? "default" : "outline"}
                    size="sm"
                    className={billingMode === "per_minute" ? "bg-pink-500" : ""}
                    onClick={() => setBillingMode("per_minute")}
                  >
                    Per Minute
                  </Button>
                  <Button
                    variant={billingMode === "per_session" ? "default" : "outline"}
                    size="sm"
                    className={billingMode === "per_session" ? "bg-pink-500" : ""}
                    onClick={() => setBillingMode("per_session")}
                  >
                    Per Session
                  </Button>
                </div>
              </div>

              {billingMode === "per_minute" ? (
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 flex items-center gap-1">
                    <Coins className="w-4 h-4" /> Rate per Minute
                  </label>
                  <Input
                    type="number"
                    value={privateCallRate}
                    onChange={(e) => setPrivateCallRate(Number(e.target.value))}
                    className="bg-white/10 border-white/20 text-white"
                    min={10}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 flex items-center gap-1">
                    <Coins className="w-4 h-4" /> Session Price
                  </label>
                  <Input
                    type="number"
                    value={sessionPrice}
                    onChange={(e) => setSessionPrice(Number(e.target.value))}
                    className="bg-white/10 border-white/20 text-white"
                    min={50}
                  />
                </div>
              )}

              <Button 
                className="w-full bg-pink-500 hover:bg-pink-600"
                onClick={() => updateSettingsMutation.mutate()}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          )}

          <div 
            onClick={handleLogout}
            className="flex items-center gap-4 p-4 hover:bg-red-500/10 cursor-pointer transition-colors mt-4"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-medium">Log Out</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
