import Layout from "@/components/layout";
import StreamCard from "@/components/stream-card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Search, Flame, Calendar } from "lucide-react";
import { Link } from "wouter";

export default function Following() {
  const { user } = useAuth();

  const { data: liveStreams, isLoading } = useQuery({
    queryKey: ['liveStreams'],
    queryFn: () => api.getLiveStreams(),
  });

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
            />
            <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full">
              <span className="text-yellow-400 text-sm font-bold">{user?.coins?.toLocaleString() || 0}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
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
          <button className="bg-white text-black font-bold px-4 py-2 rounded-full text-sm hover:scale-105 transition-transform">
            Grab Now
          </button>
        </div>

        {/* Stream Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {liveStreams && liveStreams.length > 0 ? (
              liveStreams.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-white/50">
                <p className="text-lg">No live streams from people you follow</p>
                <p className="text-sm mt-2">Explore to find new streamers!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
