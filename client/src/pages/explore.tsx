import Layout from "@/components/layout";
import { Search, MapPin, Flame, Music, Gamepad2 } from "lucide-react";
import StreamCard from "@/components/stream-card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function Explore() {
  const { data: liveStreams, isLoading } = useQuery({
    queryKey: ['liveStreams'],
    queryFn: () => api.getLiveStreams(),
  });

  return (
    <Layout>
      <div className="p-4 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Explore</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search streamers, tags, or categories..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary/50 transition-all"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { name: "Nearby", icon: MapPin, color: "from-blue-500 to-cyan-500" },
            { name: "Trending", icon: Flame, color: "from-orange-500 to-red-500" },
            { name: "Music", icon: Music, color: "from-purple-500 to-pink-500" },
            { name: "Gaming", icon: Gamepad2, color: "from-green-500 to-emerald-500" },
          ].map((cat) => (
            <div 
              key={cat.name} 
              className={`bg-gradient-to-br ${cat.color} p-4 rounded-2xl relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform`}
              data-testid={`button-category-${cat.name.toLowerCase()}`}
            >
              <cat.icon className="w-8 h-8 text-white mb-2" />
              <h3 className="font-bold text-white text-lg">{cat.name}</h3>
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/20 rounded-full blur-xl" />
            </div>
          ))}
        </div>

        {/* Results */}
        <h2 className="text-xl font-bold text-white mb-4">Recommended for You</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
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
                <p>No streams available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
