import Layout from "@/components/layout";
import { ChevronRight, Gift, Crown, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api, TopGifter } from "@/lib/api";
import UserAvatar from "@/components/user-avatar";

export default function TopGifters() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: topGifters = [], isLoading } = useQuery<TopGifter[]>({
    queryKey: ['top-gifters', user?.id],
    queryFn: () => api.getTopGifters(user!.id, 20),
    enabled: !!user,
  });

  const getRankColor = (rank: number) => {
    if (rank === 1) return "from-yellow-500 to-yellow-600";
    if (rank === 2) return "from-gray-300 to-gray-400";
    if (rank === 3) return "from-orange-400 to-orange-500";
    return "from-primary to-accent";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/profile")} className="text-foreground" data-testid="btn-back">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Top Gifters</h1>
        </div>

        <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl p-4 mb-6 border border-pink-500/30">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-pink-400" />
            <div>
              <p className="text-foreground font-bold">Your Top Supporters</p>
              <p className="text-muted-foreground text-sm">Users who sent you the most gifts</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : topGifters.length > 0 ? (
          <div className="space-y-3">
            {topGifters.map((gifter, index) => {
              const rank = index + 1;
              return (
                <div 
                  key={gifter.user.id}
                  className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-border"
                  data-testid={`gifter-row-${rank}`}
                  onClick={() => setLocation(`/user/${gifter.user.id}`)}
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getRankColor(rank)} flex items-center justify-center`}>
                    {rank <= 3 ? (
                      <span className="text-sm">{getRankIcon(rank)}</span>
                    ) : (
                      <span className="text-white font-bold text-sm">{rank}</span>
                    )}
                  </div>
                  <UserAvatar
                    userId={gifter.user.id}
                    username={gifter.user.username}
                    avatar={gifter.user.avatar}
                    size="md"
                    linkToProfile={false}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-foreground font-bold truncate">{gifter.user.username}</h3>
                      <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full shrink-0">
                        Lv.{gifter.user.level}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-yellow-400">{gifter.totalCoins.toLocaleString()} coins</span>
                      <span className="text-muted-foreground">• {gifter.giftCount} gifts</span>
                    </div>
                  </div>
                  <button 
                    className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/chat/${gifter.user.id}`);
                    }}
                    data-testid={`thank-btn-${rank}`}
                  >
                    Thank
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground">No gifters yet</p>
            <p className="text-muted-foreground/50 text-sm">Go live to receive gifts!</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
