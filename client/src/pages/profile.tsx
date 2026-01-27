import Layout from "@/components/layout";
import { Settings, User, Wallet, Award, ChevronRight, LogOut, Moon, Trophy, Clapperboard, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import BadgesDisplay from "@/components/badges-display";
import { useState } from "react";

export default function Profile() {
  const { user, logout, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dndEnabled, setDndEnabled] = useState(user?.dndEnabled || false);

  const dndMutation = useMutation({
    mutationFn: (enabled: boolean) => api.toggleDND(user!.id, enabled),
    onSuccess: (updatedUser) => {
      setDndEnabled(updatedUser.dndEnabled);
      setUser(updatedUser);
      toast({ title: updatedUser.dndEnabled ? "Do Not Disturb enabled" : "Do Not Disturb disabled" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  if (!user) {
    return (
      <Layout>
        <div className="p-4 pb-24 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-12 h-12 text-white/30" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Not Logged In</h2>
            <p className="text-white/50 mb-6">Log in to access your profile</p>
            <button 
              onClick={() => setLocation("/")}
              className="bg-primary text-white font-bold px-8 py-3 rounded-full"
              data-testid="button-login"
            >
              Go to Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 pb-24 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-white">Profile</h1>
          <Settings className="w-6 h-6 text-white cursor-pointer" />
        </div>

        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent p-1">
            <img 
              src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
              alt={user.username}
              className="w-full h-full rounded-full bg-background object-cover"
              data-testid="img-profile-avatar"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-white" data-testid="text-username">
                {user.username}
              </h2>
              <BadgesDisplay userId={user.id} size="md" />
            </div>
            <p className="text-white/60 text-sm mb-3">
              ID: {user.id.slice(0, 8)} • Lv. {user.level}
            </p>
            <div className="flex gap-6 text-center">
              <div>
                <div className="font-bold text-white" data-testid="text-following">
                  {formatNumber(user.followingCount)}
                </div>
                <div className="text-xs text-white/50">Following</div>
              </div>
              <div>
                <div className="font-bold text-white" data-testid="text-followers">
                  {formatNumber(user.followersCount)}
                </div>
                <div className="text-xs text-white/50">Followers</div>
              </div>
              <div>
                <div className="font-bold text-white" data-testid="text-likes">
                  {formatNumber(user.totalLikes)}
                </div>
                <div className="text-xs text-white/50">Likes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Card */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 mb-6 border border-white/10 relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-white/60 text-sm mb-1">My Balance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white" data-testid="text-coins">
                  {user.coins.toLocaleString()}
                </span>
                <span className="text-yellow-500 font-bold">Coins</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-white/50 text-sm">Diamonds:</span>
                <span className="text-cyan-400 font-bold" data-testid="text-diamonds">
                  {user.diamonds.toLocaleString()}
                </span>
              </div>
            </div>
            <button 
              className="bg-yellow-500 text-black font-bold px-4 py-2 rounded-full hover:scale-105 transition-transform"
              data-testid="button-topup"
            >
              Top Up
            </button>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10">
            <Wallet className="w-32 h-32 text-white" />
          </div>
        </div>

        {/* Go Live Button */}
        <Link href="/go-live">
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl p-4 mb-6 flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform" data-testid="link-golive">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Clapperboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-bold">Go Live</p>
                <p className="text-white/70 text-sm">Start streaming now</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-white" />
          </div>
        </Link>

        {/* Quick Access */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Link href="/shorts">
            <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-2xl p-4 text-center cursor-pointer hover:scale-105 transition-transform" data-testid="link-shorts">
              <Clapperboard className="w-6 h-6 text-pink-400 mx-auto mb-2" />
              <span className="text-white text-sm font-medium">Shorts</span>
            </div>
          </Link>
          <Link href="/leaderboard">
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-4 text-center cursor-pointer hover:scale-105 transition-transform" data-testid="link-leaderboard">
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <span className="text-white text-sm font-medium">Leaderboard</span>
            </div>
          </Link>
          <Link href="/groups">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl p-4 text-center cursor-pointer hover:scale-105 transition-transform" data-testid="link-groups">
              <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <span className="text-white text-sm font-medium">Groups</span>
            </div>
          </Link>
        </div>

        {/* VIP Status */}
        {user.vipTier > 0 && (
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl p-4 mb-6 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold">VIP {user.vipTier}</p>
                  <p className="text-white/50 text-xs">Premium Member</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30" />
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="space-y-2">
          {[
            { icon: User, label: "Edit Profile", color: "text-blue-400" },
            { icon: Award, label: "My Level", color: "text-purple-400" },
            { icon: Wallet, label: "My Wallet", color: "text-green-400" },
            { icon: Settings, label: "Settings", color: "text-gray-400" },
          ].map((item) => (
            <div 
              key={item.label} 
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
              data-testid={`menu-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="flex-1 text-white font-medium">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-white/30" />
            </div>
          ))}

          <div 
            onClick={() => dndMutation.mutate(!dndEnabled)}
            className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-colors ${
              dndEnabled ? "bg-purple-500/20" : "bg-white/5 hover:bg-white/10"
            }`}
            data-testid="menu-dnd"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              dndEnabled ? "bg-purple-500/30 text-purple-400" : "bg-white/5 text-gray-400"
            }`}>
              <Moon className="w-5 h-5" />
            </div>
            <span className="flex-1 text-white font-medium">Do Not Disturb</span>
            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${
              dndEnabled ? "bg-purple-500" : "bg-white/20"
            }`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                dndEnabled ? "translate-x-6" : "translate-x-0"
              }`} />
            </div>
          </div>
          
          <div 
            onClick={handleLogout}
            className="flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 cursor-pointer transition-colors"
            data-testid="menu-logout"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="flex-1 text-red-400 font-medium">Log Out</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
