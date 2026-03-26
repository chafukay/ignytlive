import { GuestGate } from "@/components/guest-gate";
import Layout from "@/components/layout";
import StreamCard from "@/components/stream-card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Search, Flame, Calendar, Users, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function Following() {
  const { user } = useAuth();

  const { data: liveStreamsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['liveStreams'],
    queryFn: () => api.getLiveStreams(),
  });
  const liveStreams = liveStreamsData?.streams;

  return (
    <GuestGate>
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


        {/* Stream Grid */}
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive/50" />
            </div>
            <p className="text-foreground font-medium">Something went wrong</p>
            <p className="text-muted-foreground text-sm mt-1">We couldn't load the streams. Please try again.</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-full text-sm hover:opacity-90 transition-opacity"
              data-testid="button-retry-following"
            >
              Try Again
            </button>
          </div>
        ) : isLoading ? (
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
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-foreground font-medium">No live streams yet</p>
                <p className="text-muted-foreground text-sm mt-1">People you follow aren't streaming right now.</p>
                <Link href="/explore">
                  <button
                    className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-full text-sm hover:opacity-90 transition-opacity"
                    data-testid="button-explore-streamers"
                  >
                    Discover Streamers
                  </button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
    </GuestGate>
  );
}
