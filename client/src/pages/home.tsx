import Layout from "@/components/layout";
import StreamCard from "@/components/stream-card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Search, Flame, Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";

export default function Home() {
  const { user, login } = useAuth();
  
  const { data: liveStreams, isLoading } = useQuery({
    queryKey: ['liveStreams'],
    queryFn: () => api.getLiveStreams(),
  });

  if (!user) {
    api.login('NeonQueen', 'demo123')
      .then(({ user }) => login(user))
      .catch(() => {});
  }

  return (
    <Layout>
      <div className="p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pt-2">
          <div className="flex items-center gap-3">
            <img 
              src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"} 
              alt="Profile"
              className="w-10 h-10 rounded-full"
              data-testid="img-avatar"
            />
            <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1.5 rounded-full">
              <span className="text-yellow-400">💰</span>
              <span className="text-yellow-400 text-sm font-bold">{user?.coins?.toLocaleString() || 0}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              data-testid="button-search"
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
            >
              <Search className="w-5 h-5 text-white" />
            </button>
            <Link href="/leaderboard">
              <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                <Flame className="w-5 h-5 text-orange-400" />
              </button>
            </Link>
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
              <Calendar className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Promo Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">💎</div>
            <div>
              <p className="text-white font-bold">GET 100% BONUS</p>
              <p className="text-white/80 text-sm">WITH CRYPTO!</p>
            </div>
          </div>
          <Link href="/coins">
            <button className="bg-white text-black font-bold px-4 py-2 rounded-full text-sm hover:scale-105 transition-transform">
              Grab Now
            </button>
          </Link>
        </div>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-6 pb-2">
          {['Trending', 'Nearby', 'New Star', 'Party', 'Gaming', 'Music', 'Chat'].map((cat, i) => (
            <button 
              key={cat}
              data-testid={`button-category-${cat.toLowerCase()}`}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all ${
                i === 0 
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105' 
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Stream Grid */}
        <div className="mb-8">
          
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div 
                  key={i}
                  className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {liveStreams && liveStreams.length > 0 ? (
                liveStreams.map((stream) => (
                  <StreamCard key={stream.id} stream={stream} />
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-white/50">
                  <p className="text-lg">No live streams at the moment</p>
                  <p className="text-sm mt-2">Check back soon!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
