import Layout from "@/components/layout";
import { Trophy, Crown, Medal } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  const { data: leaders, isLoading } = useQuery({
    queryKey: ['leaderboard', activeTab],
    queryFn: () => api.getLeaderboard(activeTab),
  });

  const getRankIcon = (index: number) => {
    switch(index) {
        case 0: return <Crown className="w-6 h-6 text-yellow-400 fill-yellow-400" />;
        case 1: return <Medal className="w-6 h-6 text-gray-300 fill-gray-300" />;
        case 2: return <Medal className="w-6 h-6 text-amber-600 fill-amber-600" />;
        default: return <span className="font-bold text-white/50 w-6 text-center">{index + 1}</span>;
    }
  };

  const topThree = leaders?.slice(0, 3) || [];
  const restOfList = leaders?.slice(3) || [];

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto pb-24">
        <h1 className="text-3xl font-display font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            Leaderboard
        </h1>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
            <div className="bg-white/10 p-1 rounded-full flex">
                {(['daily', 'weekly'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${
                            activeTab === tab 
                            ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg' 
                            : 'text-white/60 hover:text-white'
                        }`}
                        data-testid={`button-tab-${tab}`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-white">Loading leaderboard...</div>
          </div>
        ) : topThree.length >= 3 ? (
          <>
            {/* Top 3 Podium */}
            <div className="flex justify-center items-end gap-4 mb-8 h-48">
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full border-2 border-gray-300 relative mb-2">
                        <img 
                          src={topThree[1].avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + topThree[1].username} 
                          className="w-full h-full rounded-full object-cover" 
                          data-testid="img-rank-2"
                        />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-300 text-black text-[10px] font-bold px-2 rounded-full">2</div>
                    </div>
                    <div className="text-white font-bold text-sm mb-1" data-testid="text-username-2">{topThree[1].username}</div>
                    <div className="text-yellow-400 text-xs font-bold" data-testid="text-score-2">{topThree[1].totalLikes.toLocaleString()}</div>
                    <div className="w-16 h-24 bg-gradient-to-t from-gray-800 to-gray-700/50 rounded-t-lg mt-2" />
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center z-10">
                    <div className="relative mb-2">
                        <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400 absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce" />
                        <div className="w-20 h-20 rounded-full border-2 border-yellow-400 relative">
                            <img 
                              src={topThree[0].avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + topThree[0].username} 
                              className="w-full h-full rounded-full object-cover" 
                              data-testid="img-rank-1"
                            />
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[10px] font-bold px-2 rounded-full">1</div>
                        </div>
                    </div>
                    <div className="text-white font-bold text-sm mb-1" data-testid="text-username-1">{topThree[0].username}</div>
                    <div className="text-yellow-400 text-xs font-bold" data-testid="text-score-1">{topThree[0].totalLikes.toLocaleString()}</div>
                    <div className="w-20 h-32 bg-gradient-to-t from-yellow-600/50 to-orange-500/50 rounded-t-lg mt-2 relative overflow-hidden">
                        <div className="absolute inset-0 bg-yellow-400/10 animate-pulse" />
                    </div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full border-2 border-amber-600 relative mb-2">
                        <img 
                          src={topThree[2].avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + topThree[2].username} 
                          className="w-full h-full rounded-full object-cover" 
                          data-testid="img-rank-3"
                        />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-600 text-black text-[10px] font-bold px-2 rounded-full">3</div>
                    </div>
                    <div className="text-white font-bold text-sm mb-1" data-testid="text-username-3">{topThree[2].username}</div>
                    <div className="text-yellow-400 text-xs font-bold" data-testid="text-score-3">{topThree[2].totalLikes.toLocaleString()}</div>
                    <div className="w-16 h-20 bg-gradient-to-t from-amber-800/50 to-amber-600/50 rounded-t-lg mt-2" />
                </div>
            </div>

            {/* Rest of Rankings */}
            <div className="space-y-2">
                {restOfList.map((user, i) => (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between bg-white/5 backdrop-blur-sm p-4 rounded-xl hover:bg-white/10 transition-all"
                      data-testid={`row-user-${i + 4}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-6 flex justify-center">
                                {getRankIcon(i + 3)}
                            </div>
                            <div className="w-12 h-12 rounded-full overflow-hidden">
                                <img 
                                  src={user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.username} 
                                  className="w-full h-full object-cover" 
                                />
                            </div>
                            <div>
                                <h3 className="text-white font-bold">{user.username}</h3>
                                <p className="text-white/50 text-xs">Level {user.level}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-yellow-400 font-bold">{user.totalLikes.toLocaleString()}</div>
                            <p className="text-white/50 text-xs">likes</p>
                        </div>
                    </div>
                ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-white/50">
            <p>No leaderboard data available</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
