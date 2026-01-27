import Layout from "@/components/layout";
import StreamCard from "@/components/stream-card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Search, Bell, Calendar, Globe, Video, Sparkles, Users, Swords, Gamepad2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { useState } from "react";

const STREAM_TABS = [
  { id: 'popular', label: 'Popular', icon: null },
  { id: 'video-call', label: 'Video Call', icon: Video },
  { id: 'countries', label: 'Countries', icon: Globe },
  { id: 'new', label: 'New', icon: Sparkles },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'in-battle', label: 'In battle', icon: Swords },
  { id: 'multi-guest', label: 'Multi-Guest', icon: Gamepad2 },
];

export default function Home() {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState('popular');
  
  const { data: liveStreams, isLoading } = useQuery({
    queryKey: ['liveStreams'],
    queryFn: () => api.getLiveStreams(),
  });

  if (!user) {
    api.login('NeonQueen', 'demo123')
      .then(({ user }) => login(user))
      .catch(() => {});
  }

  const filteredStreams = liveStreams?.filter(stream => {
    if (activeTab === 'popular') return true;
    if (activeTab === 'in-battle') return stream.isPKBattle;
    if (activeTab === 'new') return true;
    return true;
  });

  return (
    <Layout>
      <div className="p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <span className="text-white">Ignyt</span><span className="text-pink-500">LIVE</span>
            </h1>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1.5 rounded-full mr-2">
              <span className="text-yellow-400">💰</span>
              <span className="text-yellow-400 text-sm font-bold">{user?.coins?.toLocaleString() || 0}</span>
            </div>
            <button 
              data-testid="button-search"
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
            >
              <Search className="w-5 h-5 text-white" />
            </button>
            <Link href="/notifications">
              <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 relative">
                <Bell className="w-5 h-5 text-white" />
              </button>
            </Link>
          </div>
        </div>

        {/* SuperLive-style Horizontal Tabs */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar mb-6 pb-2 border-b border-white/10">
          {STREAM_TABS.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`flex items-center gap-1.5 whitespace-nowrap px-1 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-white border-primary' 
                  : 'text-white/50 border-transparent hover:text-white/70'
              }`}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Countries Filter (show when countries tab active) */}
        {activeTab === 'countries' && (
          <div className="flex items-center justify-between mb-4 bg-white/5 rounded-xl p-3">
            <span className="text-white/70 text-sm">Selected countries;</span>
            <button className="flex items-center gap-2 bg-primary/20 text-primary px-3 py-1.5 rounded-full text-sm">
              <span>🌍</span>
              <span>+240</span>
            </button>
          </div>
        )}

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
              {filteredStreams && filteredStreams.length > 0 ? (
                filteredStreams.map((stream, index) => (
                  <StreamCard key={stream.id} stream={stream} rank={index < 25 ? index + 1 : undefined} />
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
