import Layout from "@/components/layout";
import { Crown, Plus, ChevronLeft, Globe, Users, Gamepad2, UserPlus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";

type MainTab = 'streamers' | 'families' | 'game-center';
type TimeTab = 'daily' | 'weekly' | 'alltime';

export default function Leaderboard() {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<MainTab>('streamers');
  const [timeTab, setTimeTab] = useState<TimeTab>('daily');

  const { data: leaders, isLoading } = useQuery({
    queryKey: ['leaderboard', timeTab],
    queryFn: () => api.getLeaderboard(timeTab),
    enabled: mainTab === 'streamers',
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <h1 className="text-xl font-bold text-white">Leaderboard</h1>
          </div>
          <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
            <Globe className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex border-b border-white/10">
          {[
            { id: 'streamers' as MainTab, label: 'Streamers', icon: null },
            { id: 'families' as MainTab, label: 'Families', icon: Users },
            { id: 'game-center' as MainTab, label: 'Game Center', icon: Gamepad2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className={`flex-1 py-3 font-medium transition-colors relative ${
                mainTab === tab.id
                  ? 'text-primary'
                  : 'text-white/50 hover:text-white/70'
              }`}
              data-testid={`button-main-tab-${tab.id}`}
            >
              {tab.label}
              {mainTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {mainTab === 'streamers' && (
          <div className="flex justify-center gap-2 p-4">
            {[
              { id: 'daily' as TimeTab, label: 'Last 24 Hours' },
              { id: 'weekly' as TimeTab, label: 'Last 7 Days' },
              { id: 'alltime' as TimeTab, label: 'All Time' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  timeTab === tab.id
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                data-testid={`button-time-tab-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {mainTab === 'streamers' && (
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-white/10" />
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-white/10 rounded mb-2" />
                      <div className="h-3 w-32 bg-white/10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : leaders && leaders.length > 0 ? (
              <>
                <div className="flex justify-center items-end gap-4 mb-8 pt-4">
                  {leaders.slice(0, 3).map((leader, i) => {
                    const order = [1, 0, 2];
                    const sizes = ['w-16 h-16', 'w-20 h-20', 'w-16 h-16'];
                    const borders = ['border-gray-400', 'border-yellow-400', 'border-amber-600'];
                    const heights = ['pb-4', 'pb-8', 'pb-0'];
                    const idx = order[i];
                    const l = leaders[idx];
                    if (!l) return null;
                    return (
                      <div key={l.id} className={`flex flex-col items-center ${heights[i]}`}>
                        <div className="relative">
                          {idx === 0 && (
                            <Crown className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-6 text-yellow-400" />
                          )}
                          <div className={`${sizes[i]} rounded-full border-4 ${borders[i]} overflow-hidden relative`}>
                            <img 
                              src={l.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${l.username}`}
                              className="w-full h-full object-cover"
                            />
                            {l.isLive && (
                              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[8px] font-bold px-1 rounded">
                                LIVE
                              </span>
                            )}
                          </div>
                          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold px-1.5 rounded-full">
                            {l.level}
                          </span>
                        </div>
                        <span className="text-white text-sm font-medium mt-3 truncate max-w-[80px]">{l.username}</span>
                        <span className="text-yellow-400 text-xs flex items-center gap-1">
                          💎 {formatNumber(l.diamonds || 0)}
                        </span>
                        <button className="mt-2 bg-blue-500/20 text-blue-400 p-1.5 rounded-full">
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  {leaders.slice(3).map((leader, index) => (
                    <div 
                      key={leader.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                      data-testid={`row-user-${index + 4}`}
                    >
                      <span className="text-white/50 font-bold w-6 text-center">{index + 4}</span>
                      <div className="relative">
                        <img 
                          src={leader.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.username}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        {leader.isLive && (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[8px] font-bold px-1 rounded">
                            LIVE
                          </span>
                        )}
                        <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[9px] font-bold px-1 rounded-full">
                          {leader.level}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white truncate">{leader.username}</h3>
                          {leader.vipTier && leader.vipTier > 0 && (
                            <span className="text-cyan-400">✓</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-yellow-400">💎</span>
                          <span className="text-white/50">{formatNumber(leader.diamonds || 0)}</span>
                        </div>
                      </div>
                      <button className="bg-blue-500/20 text-blue-400 p-2 rounded-full hover:bg-blue-500/30">
                        <UserPlus className="w-4 h-4" />
                      </button>
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
        )}

        {mainTab === 'families' && (
          <div className="p-4">
            <Link href="/families">
              <button 
                className="w-full py-3 bg-primary text-white font-medium rounded-xl mb-4 hover:bg-primary/80"
                data-testid="button-view-families"
              >
                View All Families
              </button>
            </Link>
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">Families Leaderboard</p>
              <p className="text-white/50 text-sm">Join or create a family to compete!</p>
            </div>
          </div>
        )}

        {mainTab === 'game-center' && (
          <div className="p-4 text-center py-12">
            <Gamepad2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">Game Center Leaderboard</p>
            <p className="text-white/50 text-sm">Play games to climb the ranks!</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
