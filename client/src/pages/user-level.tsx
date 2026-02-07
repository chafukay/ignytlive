import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { ChevronRight, Star, Trophy, Gift, Zap, MessageSquare, UserPlus, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { getXPProgress, XP_REWARDS } from "@shared/level-utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";

export default function UserLevel() {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  
  // Check if daily bonus was already claimed today based on lastDailyLoginBonus
  const checkDailyClaimed = () => {
    if (!user?.lastDailyLoginBonus) return false;
    const lastBonus = new Date(user.lastDailyLoginBonus);
    const now = new Date();
    return lastBonus.getUTCFullYear() === now.getUTCFullYear() &&
           lastBonus.getUTCMonth() === now.getUTCMonth() &&
           lastBonus.getUTCDate() === now.getUTCDate();
  };
  
  const [dailyClaimed, setDailyClaimed] = useState(checkDailyClaimed());
  
  useEffect(() => {
    setDailyClaimed(checkDailyClaimed());
  }, [user?.lastDailyLoginBonus]);
  
  const xpProgress = getXPProgress(user?.xp || 0);
  const currentLevel = xpProgress.currentLevel;
  const currentXP = xpProgress.currentXP;
  const xpInCurrentLevel = xpProgress.xpInCurrentLevel;
  const xpNeededForLevel = xpProgress.xpForNextLevel;
  const progress = xpProgress.progressPercent;

  const levelPerks = [
    { level: 5, perk: "Custom profile frame", unlocked: currentLevel >= 5 },
    { level: 10, perk: "Send animated gifts", unlocked: currentLevel >= 10 },
    { level: 15, perk: "Priority in discovery", unlocked: currentLevel >= 15 },
    { level: 20, perk: "Exclusive badges", unlocked: currentLevel >= 20 },
    { level: 30, perk: "VIP chat colors", unlocked: currentLevel >= 30 },
    { level: 50, perk: "Verified badge eligible", unlocked: currentLevel >= 50 },
  ];

  const claimDailyBonus = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/users/${user?.id}/daily-login`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.eligible) {
        setDailyClaimed(true);
        refreshUser?.();
      }
    }
  });

  const xpActivities = [
    { icon: Gift, activity: "Send gifts", xp: `+${XP_REWARDS.SEND_GIFT} XP/gift` },
    { icon: Star, activity: "Receive gifts", xp: `+${XP_REWARDS.RECEIVE_GIFT} XP/gift` },
    { icon: UserPlus, activity: "Follow users", xp: `+${XP_REWARDS.FOLLOW_USER} XP` },
    { icon: UserPlus, activity: "Get followed", xp: `+${XP_REWARDS.GET_FOLLOWED} XP` },
    { icon: MessageSquare, activity: "Send messages", xp: `+${XP_REWARDS.SEND_MESSAGE} XP` },
    { icon: Calendar, activity: "Daily login", xp: `+${XP_REWARDS.DAILY_LOGIN} XP` },
    { icon: Zap, activity: "Watch streams", xp: `+${XP_REWARDS.WATCH_STREAM_PER_MINUTE} XP/min` },
    { icon: Star, activity: "Go live", xp: `+${XP_REWARDS.STREAM_PER_MINUTE} XP/min` },
    { icon: Trophy, activity: "Win PK battles", xp: `+${XP_REWARDS.WIN_PK_BATTLE} XP` },
  ];

  return (
    <GuestGate>
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/profile")} className="text-white">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-white">User Level</h1>
        </div>

        <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl p-6 mb-6 border border-primary/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/50 text-sm">Current Level</p>
              <p className="text-4xl font-bold text-white">{currentLevel}</p>
            </div>
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
              <Star className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white/70">{xpInCurrentLevel.toLocaleString()} XP</span>
              <span className="text-white/70">{xpNeededForLevel.toLocaleString()} XP</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <p className="text-center text-white/50 text-sm">
            {(xpNeededForLevel - xpInCurrentLevel).toLocaleString()} XP to Level {currentLevel + 1}
          </p>
          <p className="text-center text-white/30 text-xs mt-1">
            Total XP: {currentXP.toLocaleString()}
          </p>
        </div>

        {/* Daily Login Bonus */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-4 mb-6 border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-white font-medium">Daily Login Bonus</p>
                <p className="text-white/50 text-sm">+{XP_REWARDS.DAILY_LOGIN} XP</p>
              </div>
            </div>
            <button
              onClick={() => claimDailyBonus.mutate()}
              disabled={dailyClaimed || claimDailyBonus.isPending}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                dailyClaimed
                  ? 'bg-green-500/20 text-green-400 cursor-default'
                  : 'bg-yellow-500 text-black hover:bg-yellow-400'
              }`}
              data-testid="claim-daily-bonus"
            >
              {dailyClaimed ? '✓ Claimed' : claimDailyBonus.isPending ? '...' : 'Claim'}
            </button>
          </div>
        </div>

        <h2 className="text-white font-bold mb-4">How to Earn XP</h2>
        <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-3">
          {xpActivities.map((item) => (
            <div key={item.activity} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <item.icon className="w-6 h-6 text-primary mb-2" />
              <p className="text-white text-sm font-medium">{item.activity}</p>
              <p className="text-green-400 text-xs">{item.xp}</p>
            </div>
          ))}
        </div>

        <h2 className="text-white font-bold mb-4">Level Perks</h2>
        <div className="space-y-2">
          {levelPerks.map((item) => (
            <div 
              key={item.level} 
              className={`flex items-center gap-4 p-4 rounded-xl border ${
                item.unlocked 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                item.unlocked ? 'bg-green-500' : 'bg-white/10'
              }`}>
                <span className="text-white font-bold text-sm">{item.level}</span>
              </div>
              <span className={item.unlocked ? 'text-white' : 'text-white/50'}>{item.perk}</span>
              {item.unlocked && <span className="ml-auto text-green-400">✓</span>}
            </div>
          ))}
        </div>
      </div>
    </Layout>
    </GuestGate>
  );
}
