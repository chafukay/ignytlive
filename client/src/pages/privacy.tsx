import Layout from "@/components/layout";
import { ChevronRight, Shield, Eye, UserX, Lock, MessageCircle, Users, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PrivacySettings {
  privateProfile: boolean;
  hideOnlineStatus: boolean;
  blockScreenshots: boolean;
  whoCanMessage: "everyone" | "followers" | "nobody";
  showLocation: boolean;
}

export default function Privacy() {
  const [, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<PrivacySettings>({
    privateProfile: false,
    hideOnlineStatus: false,
    blockScreenshots: true,
    whoCanMessage: "everyone",
    showLocation: true,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user?.privacySettings) {
      try {
        const parsed = typeof user.privacySettings === 'string' 
          ? JSON.parse(user.privacySettings) 
          : user.privacySettings;
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse privacy settings");
      }
    }
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: () => api.updateUserProfile(user!.id, { 
      privacySettings: JSON.stringify(settings) 
    }),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setHasChanges(false);
      toast({ title: "Privacy settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const updateSetting = <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const messageOptions: { value: "everyone" | "followers" | "nobody"; label: string }[] = [
    { value: "everyone", label: "Everyone" },
    { value: "followers", label: "Followers" },
    { value: "nobody", label: "Nobody" },
  ];

  const toggleSettings = [
    { icon: Eye, key: "privateProfile" as const, label: "Private Profile", description: "Only followers can see your content" },
    { icon: UserX, key: "hideOnlineStatus" as const, label: "Hide Online Status", description: "Others won't see when you're online" },
    { icon: Lock, key: "blockScreenshots" as const, label: "Block Screenshots", description: "Prevent screenshots in your streams" },
    { icon: MapPin, key: "showLocation" as const, label: "Show Location", description: "Display your location on streams" },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/settings")} className="text-foreground">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Privacy</h1>
        </div>

        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-4 mb-6 border border-blue-500/30">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-foreground font-bold">Your Privacy Matters</p>
              <p className="text-muted-foreground text-sm">Control who can see your content</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {toggleSettings.map((setting) => (
            <div 
              key={setting.label}
              onClick={() => updateSetting(setting.key, !settings[setting.key])}
              className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border cursor-pointer"
              data-testid={`toggle-${setting.key}`}
            >
              <setting.icon className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-foreground font-medium">{setting.label}</p>
                <p className="text-muted-foreground text-sm">{setting.description}</p>
              </div>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings[setting.key] ? "bg-primary" : "bg-muted"}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings[setting.key] ? "translate-x-6" : "translate-x-0"}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <h2 className="text-foreground font-bold mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Who Can Message You
          </h2>
          <div className="flex gap-2 flex-wrap">
            {messageOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => updateSetting("whoCanMessage", option.value)}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  settings.whoCanMessage === option.value
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                data-testid={`message-option-${option.value}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-foreground font-bold mb-3">Blocked Users</h2>
          <div className="bg-card rounded-xl p-6 text-center border border-border">
            <UserX className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground">No blocked users</p>
          </div>
        </div>

        {hasChanges && (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full mt-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            data-testid="button-save-privacy"
          >
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>
    </Layout>
  );
}
