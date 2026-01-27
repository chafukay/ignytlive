import Layout from "@/components/layout";
import { MessageCircle, Pin, Send, Lock, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";

export default function Chat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'main' | 'other'>('main');

  const { data: chats, isLoading } = useQuery({
    queryKey: ['chats', user?.id],
    queryFn: () => api.getRecentChats(user!.id),
    enabled: !!user?.id,
  });

  const { data: liveStreams } = useQuery({
    queryKey: ['liveStreams'],
    queryFn: () => api.getLiveStreams(),
  });

  const formatTime = (date: Date | string) => {
    const now = new Date();
    const messageDate = typeof date === 'string' ? new Date(date) : date;
    const diff = now.getTime() - messageDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (isNaN(diff)) return '';
    if (days > 30) {
      const month = messageDate.toLocaleString('default', { month: 'short' });
      const day = messageDate.getDate();
      return `${month} ${day}`;
    }
    if (days > 0) return `${days}d ago`;
    return 'Today';
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
          <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Live Streamers Row */}
        {liveStreams && liveStreams.length > 0 && (
          <div className="p-4 border-b border-white/10">
            <div className="flex gap-4 overflow-x-auto no-scrollbar">
              {liveStreams.slice(0, 8).map((stream) => (
                <Link key={stream.id} href={`/live/${stream.id}`}>
                  <div className="flex flex-col items-center min-w-[60px] cursor-pointer">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 p-0.5">
                        <img 
                          src={stream.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.title}`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[9px] font-bold px-1.5 rounded-sm">
                        LIVE
                      </span>
                    </div>
                    <span className="text-white text-[10px] mt-2 truncate w-14 text-center">
                      {stream.user?.username?.slice(0, 8) || 'User'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Send Bulk Media */}
        <div className="mx-4 mt-4 flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 cursor-pointer transition-colors">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Send className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-white font-medium">Send Bulk Media</span>
        </div>

        {/* Main/Other Tabs */}
        <div className="flex gap-2 mx-4 mt-4">
          <button 
            onClick={() => setActiveTab('main')}
            className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
              activeTab === 'main' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-white/70'
            }`}
          >
            Main
            <span className="bg-white/20 px-1.5 rounded-full text-xs">+99</span>
          </button>
          <button 
            onClick={() => setActiveTab('other')}
            className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
              activeTab === 'other' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-white/70'
            }`}
          >
            Other
            <span className="bg-white/20 px-1.5 rounded-full text-xs">27</span>
          </button>
        </div>

        {/* Messages List */}
        <div className="p-4">
          {!user ? (
            <div className="text-center py-12 text-white/50">
              <p>Please log in to see your messages</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 animate-pulse">
                  <div className="w-14 h-14 rounded-full bg-white/10" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-white/10 rounded mb-2" />
                    <div className="h-3 w-48 bg-white/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : chats && chats.length > 0 ? (
            <div className="space-y-1">
              {chats.map(({ user: chatUser, lastMessage }) => (
                <div 
                  key={chatUser.id} 
                  onClick={() => setLocation(`/chat/${chatUser.id}`)}
                  className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-colors"
                  data-testid={`chat-${chatUser.id}`}
                >
                  <div className="relative">
                    <img 
                      src={chatUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chatUser.username}`} 
                      className="w-14 h-14 rounded-full object-cover" 
                    />
                    {chatUser.isLive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[8px] font-bold px-1 rounded-sm">
                        LIVE
                      </span>
                    )}
                    {chatUser.level && (
                      <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[9px] font-bold px-1.5 rounded-full">
                        {chatUser.level}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-white">{chatUser.username}</h3>
                      {chatUser.vipTier && chatUser.vipTier > 0 && (
                        <span className="text-yellow-400">✓</span>
                      )}
                    </div>
                    <p className="text-white/50 text-sm truncate flex items-center gap-1">
                      {lastMessage.content?.includes('Premium') && (
                        <Lock className="w-3 h-3 text-yellow-400" />
                      )}
                      {lastMessage.content}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-white/30">{formatTime(lastMessage.createdAt)}</span>
                    {Math.random() > 0.5 && (
                      <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 rounded-full">1</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/50">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm mt-1">Start a conversation!</p>
            </div>
          )}

          {/* System Message */}
          <div className="mt-4 flex items-center gap-4 p-3 rounded-2xl bg-primary/10 border border-primary/20">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-bold text-white">Ignyt Member</h3>
              </div>
              <p className="text-white/50 text-sm truncate">You saved a video</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-white/30">March 15</span>
              <Pin className="w-4 h-4 text-white/20" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
