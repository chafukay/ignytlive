import Layout from "@/components/layout";
import { ChevronRight, Shield, Eye, UserX, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Privacy() {
  const [, setLocation] = useLocation();
  const [privateProfile, setPrivateProfile] = useState(false);
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);
  const [blockScreenshots, setBlockScreenshots] = useState(true);

  const privacySettings = [
    { icon: Eye, label: "Private Profile", description: "Only followers can see your content", value: privateProfile, onChange: setPrivateProfile },
    { icon: UserX, label: "Hide Online Status", description: "Others won't see when you're online", value: hideOnlineStatus, onChange: setHideOnlineStatus },
    { icon: Lock, label: "Block Screenshots", description: "Prevent screenshots in your streams", value: blockScreenshots, onChange: setBlockScreenshots },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/settings")} className="text-white">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-white">Privacy</h1>
        </div>

        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-4 mb-6 border border-blue-500/30">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-white font-bold">Your Privacy Matters</p>
              <p className="text-white/50 text-sm">Control who can see your content</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {privacySettings.map((setting) => (
            <div 
              key={setting.label}
              onClick={() => setting.onChange(!setting.value)}
              className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer"
            >
              <setting.icon className="w-5 h-5 text-white/70" />
              <div className="flex-1">
                <p className="text-white font-medium">{setting.label}</p>
                <p className="text-white/50 text-sm">{setting.description}</p>
              </div>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors ${setting.value ? "bg-primary" : "bg-white/20"}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${setting.value ? "translate-x-6" : "translate-x-0"}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <h2 className="text-white font-bold mb-3">Blocked Users</h2>
          <div className="bg-white/5 rounded-xl p-6 text-center border border-white/10">
            <UserX className="w-12 h-12 text-white/20 mx-auto mb-2" />
            <p className="text-white/50">No blocked users</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
