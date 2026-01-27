import Layout from "@/components/layout";
import { MessageCircle, MoreHorizontal, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function Chat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: chats, isLoading } = useQuery({
    queryKey: ['chats', user?.id],
    queryFn: () => api.getRecentChats(user!.id),
    enabled: !!user?.id,
  });

  const formatTime = (date: Date | string) => {
    const now = new Date();
    const messageDate = typeof date === 'string' ? new Date(date) : date;
    const diff = now.getTime() - messageDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (isNaN(diff)) return '';
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-display font-bold text-white">Messages</h1>
          <MoreHorizontal className="text-white/50 cursor-pointer" />
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search messages" 
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary/50 transition-all"
            data-testid="input-search"
          />
        </div>

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
                    data-testid={`img-chat-avatar-${chatUser.id}`}
                  />
                  {chatUser.isLive && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-white">{chatUser.username}</h3>
                    <span className="text-xs text-white/40">{formatTime(lastMessage.createdAt)}</span>
                  </div>
                  <p className="text-white/60 text-sm truncate">{lastMessage.content}</p>
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
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-white">Team Ignyt</h3>
              <span className="text-xs text-white/40">1d ago</span>
            </div>
            <p className="text-white/60 text-sm truncate">Welcome to Ignyt Live! Here are some tips...</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
