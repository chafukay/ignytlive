import Layout from "@/components/layout";
import StreamCard from "@/components/stream-card";
import UserAvatar from "@/components/user-avatar";
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

  // Get all streamers sorted by live status
  const { data: streamers } = useQuery({
    queryKey: ['streamers'],
    queryFn: () => api.getStreamers(),
  });

  // Get user IDs who are actually streaming (have an active stream)
  const streamingUserIds = new Set(liveStreams?.map(s => s.userId) || []);
  
  // Live streamers = users who have an active stream right now
  const liveStreamers = streamers?.filter(s => streamingUserIds.has(s.id)) || [];
  
  // Online users = users marked as isLive but NOT actually streaming  
  const onlineUsers = streamers?.filter(s => s.isLive && !streamingUserIds.has(s.id)) || [];
  
  // Offline streamers = users who are not live at all
  const offlineStreamers = streamers?.filter(s => !s.isLive && !streamingUserIds.has(s.id)) || [];

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

        {/* Streamers Section - Live vs Offline */}
        {streamers && streamers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">Streamers</h2>
            
            {/* Live Streamers */}
            {liveStreamers.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white/70 text-sm font-medium">Live Now</span>
                  <span className="text-white/50 text-xs">({liveStreamers.length})</span>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {liveStreamers.slice(0, 10).map((streamer) => (
                    <div key={streamer.id} className="flex flex-col items-center gap-1 min-w-[70px]">
                      <UserAvatar 
                        userId={streamer.id}
                        username={streamer.username}
                        avatar={streamer.avatar}
                        isLive={true}
                        size="lg"
                        showStatus={true}
                      />
                      <span className="text-white text-xs truncate max-w-[60px]">{streamer.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Online Users (active but not streaming) */}
            {onlineUsers.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-white/70 text-sm font-medium">Online</span>
                  <span className="text-white/50 text-xs">({onlineUsers.length})</span>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {onlineUsers.slice(0, 10).map((user) => (
                    <Link key={user.id} href={`/profile/${user.id}`}>
                      <div className="flex flex-col items-center gap-1 min-w-[70px] hover:opacity-100 transition-opacity cursor-pointer">
                        <UserAvatar 
                          userId={user.id}
                          username={user.username}
                          avatar={user.avatar}
                          isLive={false}
                          isOnline={true}
                          size="lg"
                          showStatus={true}
                        />
                        <span className="text-white text-xs truncate max-w-[60px]">{user.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Offline Streamers */}
            {offlineStreamers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  <span className="text-white/70 text-sm font-medium">Offline</span>
                  <span className="text-white/50 text-xs">({offlineStreamers.length})</span>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {offlineStreamers.slice(0, 10).map((streamer) => (
                    <Link key={streamer.id} href={`/profile/${streamer.id}`}>
                      <div className="flex flex-col items-center gap-1 min-w-[70px] hover:opacity-100 transition-opacity cursor-pointer">
                        <UserAvatar 
                          userId={streamer.id}
                          username={streamer.username}
                          avatar={streamer.avatar}
                          isLive={false}
                          isOnline={false}
                          size="lg"
                          showStatus={true}
                        />
                        <span className="text-white text-xs truncate max-w-[60px]">{streamer.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
