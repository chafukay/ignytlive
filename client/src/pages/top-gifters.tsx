import Layout from "@/components/layout";
import { ChevronRight, Gift, Crown } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";

export default function TopGifters() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const topGifters = [
    { rank: 1, username: "DiamondKing", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=DiamondKing", giftsReceived: 125000, level: 65 },
    { rank: 2, username: "GiftQueen", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=GiftQueen", giftsReceived: 98000, level: 58 },
    { rank: 3, username: "RoyalFan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=RoyalFan", giftsReceived: 75000, level: 52 },
    { rank: 4, username: "StarSupporter", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=StarSupporter", giftsReceived: 50000, level: 45 },
    { rank: 5, username: "GenGifter", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=GenGifter", giftsReceived: 35000, level: 38 },
  ];

  const getRankColor = (rank: number) => {
    if (rank === 1) return "from-yellow-500 to-yellow-600";
    if (rank === 2) return "from-gray-300 to-gray-400";
    if (rank === 3) return "from-orange-400 to-orange-500";
    return "from-primary to-accent";
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setLocation("/profile")} className="text-white">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-white">Top Gifters</h1>
        </div>

        <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl p-4 mb-6 border border-pink-500/30">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-pink-400" />
            <div>
              <p className="text-white font-bold">Your Top Supporters</p>
              <p className="text-white/50 text-sm">Users who sent you the most gifts</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {topGifters.map((gifter) => (
            <div 
              key={gifter.rank}
              className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/10"
            >
              <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getRankColor(gifter.rank)} flex items-center justify-center`}>
                {gifter.rank <= 3 ? (
                  <Crown className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-white font-bold text-sm">{gifter.rank}</span>
                )}
              </div>
              <img 
                src={gifter.avatar} 
                className="w-12 h-12 rounded-full"
                alt={gifter.username}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold">{gifter.username}</h3>
                  <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                    Lv.{gifter.level}
                  </span>
                </div>
                <p className="text-yellow-400 text-sm">{gifter.giftsReceived.toLocaleString()} coins gifted</p>
              </div>
              <button className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl">
                Thank
              </button>
            </div>
          ))}
        </div>

        {topGifters.length === 0 && (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/50">No gifters yet</p>
            <p className="text-white/30 text-sm">Go live to receive gifts!</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
