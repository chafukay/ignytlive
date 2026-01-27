import Layout from "@/components/layout";
import { Crown, Plus, Search, Flame, Calendar } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";

export default function Leaderboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'alltime'>('daily');

  const { data: leaders, isLoading } = useQuery({
    queryKey: ['leaderboard', activeTab],
    queryFn: () => api.getLeaderboard(activeTab),
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img 
              src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"} 
              alt="Profile"
              className="w-10 h-10 rounded-full"
            />
            <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1.5 rounded-full">
              <span className="text-yellow-400">💰</span>
              <span className="text-yellow-400 text-sm font-bold">{user?.coins?.toLocaleString() || 0}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
              <Search className="w-5 h-5 text-white" />
            </button>
            <button className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-400 fill-orange-400" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
              <Calendar className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {[
            { id: 'daily', label: 'Daily' },
            { id: 'weekly', label: 'Weekly' },
            { id: 'alltime', label: 'All time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
              data-testid={`button-tab-${tab.id}`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Leaderboard List */}
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
            <div className="space-y-2">
              {leaders.map((leader, index) => (
                <div 
                  key={leader.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
                  data-testid={`row-user-${index + 1}`}
                >
                  <div className="relative">
                    <img 
                      src={leader.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.username}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {index === 0 && (
                      <div className="absolute -top-1 -left-1 bg-yellow-500 rounded-full p-0.5">
                        <Crown className="w-3 h-3 text-black" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white truncate">{leader.username}</h3>
                      {leader.vipTier && leader.vipTier > 0 && (
                        <span className="text-cyan-400">✓</span>
                      )}
                      {leader.isLive && (
                        <span className="bg-pink-500 text-white text-[9px] font-bold px-1.5 rounded">LIVE</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-white/50 flex items-center gap-1">
                        <span className="text-pink-400">💎</span>
                        {formatNumber(leader.diamonds || 0)}
                      </span>
                      <span className="text-white/50 flex items-center gap-1">
                        <span className="text-yellow-400">💰</span>
                        {formatNumber(leader.totalLikes)}
                      </span>
                    </div>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/50">
              <p>No leaderboard data available</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
