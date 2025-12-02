import Layout from "@/components/layout";
import StreamCard from "@/components/stream-card";
import { MOCK_STREAMERS } from "@/lib/mock-data";
import { Search, Bell, Flame } from "lucide-react";

export default function Home() {
  return (
    <Layout>
      <div className="p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pt-2">
          <h1 className="text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary font-black tracking-tight">
            VibeStream
          </h1>
          <div className="flex gap-3">
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <Search className="w-5 h-5 text-white" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors relative">
              <Bell className="w-5 h-5 text-white" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px]">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                alt="Me" 
                className="w-full h-full rounded-full bg-background"
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-8 pb-2">
          {['Trending', 'Nearby', 'New Star', 'Party', 'Gaming', 'Music', 'Chat'].map((cat, i) => (
            <button 
              key={cat}
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

        {/* Featured Section (Hot) */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />
            <h2 className="text-xl text-white">Hot Live</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {MOCK_STREAMERS.map((streamer) => (
              <StreamCard key={streamer.id} streamer={streamer} />
            ))}
            {/* Duplicate for fullness */}
            {MOCK_STREAMERS.slice(0, 4).map((streamer) => (
              <StreamCard key={`${streamer.id}-dup`} streamer={{...streamer, id: `${streamer.id}-dup`}} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
