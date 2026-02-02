import Layout from "@/components/layout";
import { ChevronRight, User, Bell, Lock, Moon, Sun, HelpCircle, Info, Video, Coins, X, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { useState, useEffect, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-context";
import type { User as UserType } from "@shared/schema";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
];

interface NotificationSettings {
  pushEnabled: boolean;
  streamAlerts: boolean;
  messageAlerts: boolean;
  giftAlerts: boolean;
  followerAlerts: boolean;
}

export default function Settings() {
  const { user, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(user?.language || "en");
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    streamAlerts: true,
    messageAlerts: true,
    giftAlerts: true,
    followerAlerts: true,
  });
  
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
      setSelectedLanguage(user.language || "en");
      
      if (user.notificationSettings) {
        try {
          const parsed = typeof user.notificationSettings === 'string' 
            ? JSON.parse(user.notificationSettings) 
            : user.notificationSettings;
          setNotificationSettings(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error("Failed to parse notification settings");
        }
      }
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

  const updateLanguageMutation = useMutation({
    mutationFn: (language: string) => api.updateUser(user!.id, { language }),
    onSuccess: (updatedUser: UserType) => {
      setUser(updatedUser);
      setShowLanguageModal(false);
      toast({ title: "Language updated" });
    },
    onError: () => {
      toast({ title: "Failed to update language", variant: "destructive" });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: (settings: NotificationSettings) => 
      api.updateUser(user!.id, { notificationSettings: JSON.stringify(settings) }),
    onSuccess: (updatedUser: UserType) => {
      setUser(updatedUser);
      toast({ title: "Notifications updated" });
    },
    onError: () => {
      toast({ title: "Failed to update notifications", variant: "destructive" });
    },
  });

  const handleNotificationToggle = () => {
    const newSettings = { ...notificationSettings, pushEnabled: !notificationSettings.pushEnabled };
    setNotificationSettings(newSettings);
    updateNotificationsMutation.mutate(newSettings);
  };

  const currentLanguage = LANGUAGES.find(l => l.code === selectedLanguage) || LANGUAGES[0];

  const settingsItems: Array<{
    icon: typeof User;
    label: string;
    href?: string;
    toggle?: boolean;
    value?: boolean;
    onChange?: () => void;
    extra?: ReactNode;
    isTheme?: boolean;
    onClick?: () => void;
    testId?: string;
  }> = [
    { icon: User, label: "Edit Profile", href: "/edit-profile" },
    { icon: Bell, label: "Notifications", toggle: true, value: notificationSettings.pushEnabled, onChange: handleNotificationToggle, testId: "toggle-notifications" },
    { icon: Lock, label: "Privacy", href: "/privacy" },
    // Language selector hidden for now - only English supported
    // { icon: Globe, label: "Language", extra: <span className="flex items-center gap-2">{currentLanguage.flag} {currentLanguage.name}</span>, onClick: () => setShowLanguageModal(true), testId: "open-language" },
    { icon: theme === "dark" ? Moon : Sun, label: "Dark Mode", toggle: true, value: theme === "dark", onChange: toggleTheme, isTheme: true, testId: "toggle-dark-mode" },
    { icon: HelpCircle, label: "Help & Support", href: "/help" },
    { icon: Info, label: "About", href: "/about" },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/profile")} className="text-foreground">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
        </div>

        <div className="space-y-1">
          {settingsItems.map((item) => (
            <div key={item.label}>
              {item.href ? (
                <Link href={item.href}>
                  <div className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="flex-1 text-foreground">{item.label}</span>
                    {item.extra && <span className="text-muted-foreground text-sm">{item.extra}</span>}
                    <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                </Link>
              ) : item.toggle ? (
                <div 
                  onClick={item.onChange}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border"
                  data-testid={item.testId}
                >
                  <item.icon className={`w-5 h-5 ${item.isTheme && theme === "dark" ? "text-indigo-400" : item.isTheme ? "text-yellow-500" : "text-muted-foreground"}`} />
                  <span className="flex-1 text-foreground">{item.label}</span>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors ${item.value ? (item.isTheme ? "bg-indigo-500" : "bg-primary") : "bg-muted"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${item.value ? "translate-x-6" : "translate-x-0"}`} />
                  </div>
                </div>
              ) : item.onClick ? (
                <div 
                  onClick={item.onClick}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border"
                  data-testid={item.testId}
                >
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-foreground">{item.label}</span>
                  {item.extra && <span className="text-muted-foreground text-sm">{item.extra}</span>}
                  <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-foreground">{item.label}</span>
                  {item.extra && <span className="text-muted-foreground text-sm">{item.extra}</span>}
                  <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                </div>
              )}
            </div>
          ))}

          <div 
            onClick={() => setShowCallSettings(!showCallSettings)}
            className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border"
            data-testid="toggle-call-settings"
          >
            <Video className="w-5 h-5 text-pink-400" />
            <span className="flex-1 text-foreground">Private Call Settings</span>
            <ChevronRight className={`w-5 h-5 text-muted-foreground/50 transition-transform ${showCallSettings ? 'rotate-90' : ''}`} />
          </div>

          {showCallSettings && (
            <div className="bg-muted/30 p-4 space-y-4">
              <div 
                onClick={() => setAvailableForPrivateCall(!availableForPrivateCall)}
                className="flex items-center gap-4 cursor-pointer"
              >
                <span className="flex-1 text-foreground">Available for Private Calls</span>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${availableForPrivateCall ? "bg-pink-500" : "bg-muted"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${availableForPrivateCall ? "translate-x-6" : "translate-x-0"}`} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Billing Mode</label>
                <div className="flex gap-2">
                  <Button
                    variant={billingMode === "per_minute" ? "default" : "outline"}
                    size="sm"
                    className={billingMode === "per_minute" ? "bg-pink-500 hover:bg-pink-600" : ""}
                    onClick={() => setBillingMode("per_minute")}
                  >
                    Per Minute
                  </Button>
                  <Button
                    variant={billingMode === "per_session" ? "default" : "outline"}
                    size="sm"
                    className={billingMode === "per_session" ? "bg-pink-500 hover:bg-pink-600" : ""}
                    onClick={() => setBillingMode("per_session")}
                  >
                    Per Session
                  </Button>
                </div>
              </div>

              {billingMode === "per_minute" ? (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground flex items-center gap-1">
                    <Coins className="w-4 h-4" /> Rate per Minute
                  </label>
                  <Input
                    type="number"
                    value={privateCallRate}
                    onChange={(e) => setPrivateCallRate(Number(e.target.value))}
                    className="bg-background border-border text-foreground"
                    min={10}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground flex items-center gap-1">
                    <Coins className="w-4 h-4" /> Session Price
                  </label>
                  <Input
                    type="number"
                    value={sessionPrice}
                    onChange={(e) => setSessionPrice(Number(e.target.value))}
                    className="bg-background border-border text-foreground"
                    min={50}
                  />
                </div>
              )}

              <Button 
                className="w-full bg-pink-500 hover:bg-pink-600"
                onClick={() => updateSettingsMutation.mutate()}
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-call-settings"
              >
                {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          )}

        </div>
      </div>

      {showLanguageModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-card w-full max-w-md rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Select Language</h2>
              <button onClick={() => setShowLanguageModal(false)} className="text-muted-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLanguage(lang.code);
                    updateLanguageMutation.mutate(lang.code);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedLanguage === lang.code 
                      ? "bg-primary/20 text-primary" 
                      : "hover:bg-muted text-foreground"
                  }`}
                  data-testid={`language-${lang.code}`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.name}</span>
                  {selectedLanguage === lang.code && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
