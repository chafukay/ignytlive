import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { Medal, Lock, CheckCircle, ArrowLeft, Trophy, Star, Gift, Users, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  requirement: string;
  rewardXp: number;
  rewardCoins: number;
  isActive: boolean;
}

interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
  achievement: Achievement;
}

const categoryColors: Record<string, string> = {
  leveling: "text-blue-400 bg-blue-500/20 border-blue-500/30",
  social: "text-pink-400 bg-pink-500/20 border-pink-500/30",
  gifting: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  spending: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  streaming: "text-red-400 bg-red-500/20 border-red-500/30",
};

const categoryIcons: Record<string, React.ReactNode> = {
  leveling: <Star className="w-5 h-5" />,
  social: <Users className="w-5 h-5" />,
  gifting: <Gift className="w-5 h-5" />,
  spending: <Crown className="w-5 h-5" />,
  streaming: <Trophy className="w-5 h-5" />,
};

export default function Achievements() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: allAchievements = [], isLoading: loadingAll } = useQuery<Achievement[]>({
    queryKey: ['achievements'],
    queryFn: async () => {
      const res = await fetch('/api/achievements');
      if (!res.ok) throw new Error('Failed to fetch achievements');
      return res.json();
    },
  });

  const { data: userAchievements = [], isLoading: loadingUser } = useQuery<UserAchievement[]>({
    queryKey: ['user-achievements', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user!.id}/achievements`);
      if (!res.ok) throw new Error('Failed to fetch user achievements');
      return res.json();
    },
    enabled: !!user,
  });

  const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));
  const unlockedCount = userAchievements.length;
  const totalCount = allAchievements.length;
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  const categories = ['leveling', 'social', 'gifting', 'spending', 'streaming'];

  if (!user) {
    return (
      <GuestGate>
      <Layout>
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <Medal className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Login Required</h2>
          <p className="text-muted-foreground">Log in to view your achievements</p>
        </div>
      </Layout>
      </GuestGate>
    );
  }

  return (
    <GuestGate>
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
          <h1 className="text-2xl font-bold">Achievements</h1>
        </div>

        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
              <Medal className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">Your Progress</h2>
              <p className="text-muted-foreground text-sm">
                {unlockedCount} / {totalCount} achievements unlocked
              </p>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <p className="text-right text-sm text-muted-foreground mt-2">{progressPercent.toFixed(0)}%</p>
        </div>

        {loadingAll || loadingUser ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map(category => {
              const categoryAchievements = allAchievements.filter(a => a.category === category);
              if (categoryAchievements.length === 0) return null;

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    {categoryIcons[category]}
                    <h3 className="font-bold capitalize">{category}</h3>
                  </div>
                  <div className="grid gap-3">
                    {categoryAchievements.map(achievement => {
                      const isUnlocked = unlockedIds.has(achievement.id);
                      const colorClass = categoryColors[achievement.category] || categoryColors.leveling;
                      
                      return (
                        <motion.div
                          key={achievement.id}
                          className={`${colorClass} border rounded-xl p-4 ${!isUnlocked ? 'opacity-50' : ''}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: isUnlocked ? 1 : 0.5, y: 0 }}
                          data-testid={`achievement-${achievement.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-3xl">{achievement.emoji}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold">{achievement.name}</h4>
                                {isUnlocked ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Lock className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                              <div className="flex items-center gap-3 text-xs">
                                {achievement.rewardXp > 0 && (
                                  <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                                    +{achievement.rewardXp} XP
                                  </span>
                                )}
                                {achievement.rewardCoins > 0 && (
                                  <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                                    +{achievement.rewardCoins} Coins
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
    </GuestGate>
  );
}
