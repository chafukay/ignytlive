import Layout from "@/components/layout";
import { ChevronRight, Star, Trophy, Gift, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";

export default function UserLevel() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const currentLevel = user?.level || 1;
  const currentXP = 2500;
  const nextLevelXP = 5000;
  const progress = (currentXP / nextLevelXP) * 100;

  const levelPerks = [
    { level: 5, perk: "Custom profile frame", unlocked: currentLevel >= 5 },
    { level: 10, perk: "Send animated gifts", unlocked: currentLevel >= 10 },
    { level: 15, perk: "Priority in discovery", unlocked: currentLevel >= 15 },
    { level: 20, perk: "Exclusive badges", unlocked: currentLevel >= 20 },
    { level: 30, perk: "VIP chat colors", unlocked: currentLevel >= 30 },
    { level: 50, perk: "Verified badge eligible", unlocked: currentLevel >= 50 },
  ];

  const xpActivities = [
    { icon: Zap, activity: "Watch streams", xp: "+5 XP/min" },
    { icon: Gift, activity: "Send gifts", xp: "+10 XP/gift" },
    { icon: Star, activity: "Go live", xp: "+20 XP/min" },
    { icon: Trophy, activity: "Win PK battles", xp: "+100 XP" },
  ];

  return (
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
              <span className="text-white/70">{currentXP.toLocaleString()} XP</span>
              <span className="text-white/70">{nextLevelXP.toLocaleString()} XP</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <p className="text-center text-white/50 text-sm">
            {(nextLevelXP - currentXP).toLocaleString()} XP to Level {currentLevel + 1}
          </p>
        </div>

        <h2 className="text-white font-bold mb-4">How to Earn XP</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
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
  );
}
