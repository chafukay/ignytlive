import Layout from "@/components/layout";
import { ChevronRight, User, Bell, Lock, Eye, Globe, Moon, HelpCircle, Info, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { useState } from "react";

export default function Settings() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [notifications, setNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);

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
  }> = [
    { icon: User, label: "Edit Profile", href: "/edit-profile" },
    { icon: Bell, label: "Notifications", toggle: true, value: notifications, onChange: setNotifications },
    { icon: Lock, label: "Privacy", href: "/privacy" },
    { icon: Eye, label: "Private Account", toggle: true, value: privateAccount, onChange: setPrivateAccount },
    { icon: Globe, label: "Language", extra: "English" },
    { icon: Moon, label: "Dark Mode", extra: "On" },
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
                  onClick={() => item.onChange?.(!item.value)}
                  className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5"
                >
                  <item.icon className="w-5 h-5 text-white/70" />
                  <span className="flex-1 text-white">{item.label}</span>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors ${item.value ? "bg-primary" : "bg-white/20"}`}>
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
