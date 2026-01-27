import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Send, MoreVertical } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function Conversation() {
  const [, params] = useRoute("/chat/:userId");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const otherUserId = params?.userId;

  const { data: otherUser } = useQuery({
    queryKey: ['user', otherUserId],
    queryFn: () => api.getUser(otherUserId!),
    enabled: !!otherUserId,
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ['conversation', user?.id, otherUserId],
    queryFn: () => api.getConversation(user!.id, otherUserId!),
    enabled: !!user?.id && !!otherUserId,
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => api.sendMessage(user!.id, otherUserId!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', user?.id, otherUserId] });
      queryClient.invalidateQueries({ queryKey: ['chats', user?.id] });
      setMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !otherUserId) return;
    sendMessageMutation.mutate(message.trim());
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-white/50">Please log in to view messages</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card/50 backdrop-blur-md border-b border-white/10 p-4 flex items-center gap-4">
        <button 
          onClick={() => setLocation("/chat")}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        {otherUser ? (
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <img 
                src={otherUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`}
                className="w-10 h-10 rounded-full object-cover"
                alt={otherUser.username}
                data-testid="img-chat-partner-avatar"
              />
              {otherUser.isLive && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-white" data-testid="text-chat-partner-username">{otherUser.username}</h2>
              <p className="text-xs text-white/50" data-testid="text-chat-partner-status">
                {otherUser.isLive ? "Live now" : `Level ${otherUser.level}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 h-10 bg-white/10 rounded animate-pulse" />
        )}
        
        <button 
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          data-testid="button-chat-options"
        >
          <MoreVertical className="w-5 h-5 text-white/50" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className="h-10 w-48 bg-white/10 rounded-2xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((msg) => {
            const isOwn = msg.senderId === user.id;
            return (
              <div 
                key={msg.id} 
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    isOwn 
                      ? 'bg-primary text-white rounded-br-sm' 
                      : 'bg-white/10 text-white rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-white/40'}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center text-white/40">
              <p>No messages yet</p>
              <p className="text-sm mt-1">Say hello!</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-card/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/10 border border-white/10 rounded-full py-3 px-4 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder:text-white/50"
            data-testid="input-message"
          />
          <button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="p-3 bg-primary rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            data-testid="button-send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
