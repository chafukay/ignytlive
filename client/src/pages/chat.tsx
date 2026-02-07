import Layout from "@/components/layout";
import { MessageCircle, Send, ArrowLeft, MoreVertical, Search, Users, UserRound, UserPlus, UserMinus, Flag, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "@/components/user-avatar";
import type { User, Message } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Chat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/chat/:userId");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileShowConversation, setMobileShowConversation] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "others">("main");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedUserId = params?.userId || null;

  const { data: chats, isLoading: chatsLoading } = useQuery({
    queryKey: ['chats', user?.id],
    queryFn: () => api.getRecentChats(user!.id),
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const { data: otherUser } = useQuery({
    queryKey: ['user', selectedUserId],
    queryFn: () => api.getUser(selectedUserId!),
    enabled: !!selectedUserId,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['conversation', user?.id, selectedUserId],
    queryFn: () => api.getConversation(user!.id, selectedUserId!),
    enabled: !!user?.id && !!selectedUserId,
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => api.sendMessage(user!.id, selectedUserId!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', user?.id, selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['chats', user?.id] });
      setMessage("");
    },
    onError: (error: any) => {
      if (error?.code === "DND_ENABLED") {
        toast({ title: "Cannot send message", description: "This user has Do Not Disturb enabled", variant: "destructive" });
      } else {
        toast({ title: "Failed to send message", variant: "destructive" });
      }
    },
  });

  const { data: followStatus } = useQuery({
    queryKey: ['isFollowing', user?.id, selectedUserId],
    queryFn: () => api.isFollowing(user!.id, selectedUserId!),
    enabled: !!user?.id && !!selectedUserId,
  });

  const followMutation = useMutation({
    mutationFn: () => api.followUser(user!.id, selectedUserId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing', user?.id, selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['following', user?.id] });
      toast({ title: "Followed successfully" });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => api.unfollowUser(user!.id, selectedUserId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing', user?.id, selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['following', user?.id] });
      toast({ title: "Unfollowed" });
    },
  });

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/messages/conversation/${user!.id}/${selectedUserId!}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', user?.id, selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['chats', user?.id] });
      toast({ title: "Conversation cleared" });
    },
    onError: () => {
      toast({ title: "Failed to clear conversation", variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedUserId) {
      setMobileShowConversation(true);
    }
  }, [selectedUserId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !selectedUserId) return;
    sendMessageMutation.mutate(message.trim());
  };

  const selectChat = (userId: string) => {
    setLocation(`/chat/${userId}`);
    setMobileShowConversation(true);
  };

  const goBackToList = () => {
    setMobileShowConversation(false);
    setLocation("/chat");
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (isNaN(diff)) return '';
    if (days > 30) {
      return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
    }
    if (days > 0) return `${days}d`;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const { data: following } = useQuery({
    queryKey: ['following', user?.id],
    queryFn: () => api.getFollowing(user!.id),
    enabled: !!user?.id,
  });

  const followingIds = new Set(following?.map((f: User) => f.id) || []);

  const filteredChats = chats?.filter(({ user: chatUser }) => {
    const matchesSearch = (chatUser.username ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === "main") return followingIds.has(chatUser.id);
    return !followingIds.has(chatUser.id);
  });

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Please log in to see your messages</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Left Panel - Chat List (30%) */}
        <div className={`w-full md:w-[30%] md:min-w-[280px] md:max-w-[360px] border-r border-border flex flex-col bg-background ${
          mobileShowConversation ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-4 border-b border-border shrink-0">
            <h1 className="text-xl font-bold text-foreground mb-3" data-testid="text-chat-title">Messages</h1>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-muted rounded-full py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                data-testid="input-search-chats"
              />
            </div>
          </div>

          <div className="flex border-b border-border shrink-0">
            <button
              onClick={() => setActiveTab("main")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === "main"
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="tab-main"
            >
              Main
              {activeTab === "main" && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("others")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === "others"
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="tab-others"
            >
              Others
              {activeTab === "others" && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {chatsLoading ? (
              <div className="p-3 space-y-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="h-4 w-24 bg-muted rounded mb-2" />
                      <div className="h-3 w-36 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredChats && filteredChats.length > 0 ? (
              <div className="p-2">
                {filteredChats.map(({ user: chatUser, lastMessage }) => (
                  <div
                    key={chatUser.id}
                    onClick={() => selectChat(chatUser.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                      selectedUserId === chatUser.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted/50'
                    }`}
                    data-testid={`chat-${chatUser.id}`}
                  >
                    <div className="shrink-0">
                      <UserAvatar
                        userId={chatUser.id}
                        username={chatUser.username}
                        avatar={chatUser.avatar}
                        isLive={chatUser.isLive}
                        isOnline={chatUser.isLive}
                        size="md"
                        showStatus={true}
                        linkToProfile={false}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-semibold text-foreground text-sm truncate">{chatUser.username}</h3>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                          {formatTime(lastMessage.createdAt)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs truncate">
                        {lastMessage.senderId === user.id ? 'You: ' : ''}{lastMessage.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  {activeTab === "main" ? "No conversations with people you follow" : "No other conversations"}
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  {activeTab === "main" ? "Follow people and start chatting!" : "Messages from others will appear here"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Conversation (70%) */}
        <div className={`w-full md:flex-1 flex flex-col bg-background ${
          !mobileShowConversation ? 'hidden md:flex' : 'flex'
        }`}>
          {selectedUserId && otherUser ? (
            <>
              <div className="bg-card/80 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
                <button
                  onClick={goBackToList}
                  className="p-2 hover:bg-muted rounded-full transition-colors md:hidden"
                  data-testid="button-back-to-chats"
                >
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </button>
                <div
                  onClick={() => setLocation(`/profile/${otherUser.id}`)}
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  data-testid="link-chat-partner-profile"
                >
                  <UserAvatar
                    userId={otherUser.id}
                    username={otherUser.username}
                    avatar={otherUser.avatar}
                    isLive={otherUser.isLive}
                    isOnline={otherUser.isLive}
                    size="sm"
                    showStatus={true}
                    linkToProfile={false}
                  />
                  <div>
                    <h2 className="font-bold text-foreground text-sm" data-testid="text-chat-partner-username">{otherUser.username}</h2>
                    <p className="text-xs text-muted-foreground" data-testid="text-chat-partner-status">
                      {otherUser.isLive ? "Online" : `Level ${otherUser.level}`}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 hover:bg-muted rounded-full transition-colors" data-testid="button-chat-options">
                      <MoreVertical className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => setLocation(`/profile/${otherUser.id}`)}
                      data-testid="menu-view-profile"
                    >
                      <UserRound className="w-4 h-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    {followStatus?.isFollowing ? (
                      <DropdownMenuItem
                        onClick={() => unfollowMutation.mutate()}
                        data-testid="menu-unfollow"
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Unfollow
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => followMutation.mutate()}
                        data-testid="menu-follow"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Follow
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => clearChatMutation.mutate()}
                      className="text-destructive focus:text-destructive"
                      data-testid="menu-clear-chat"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      data-testid="menu-report"
                      onClick={() => toast({ title: "Report submitted", description: "We'll review this user's activity" })}
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Report User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messagesLoading ? (
                  <div className="flex flex-col gap-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                        <div className="h-10 w-48 bg-muted rounded-2xl animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : messages && messages.length > 0 ? (
                  messages.map((msg: Message) => {
                    const isOwn = msg.senderId === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                            isOwn
                              ? 'bg-primary text-white rounded-br-sm'
                              : 'bg-muted text-foreground rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/60' : 'text-muted-foreground'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-1">Say hello! 👋</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="p-3 border-t border-border bg-card/30 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-muted border border-border rounded-full py-2.5 px-4 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors placeholder:text-muted-foreground"
                    data-testid="input-message"
                  />
                  <button
                    type="submit"
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className="p-2.5 bg-primary rounded-full text-white disabled:opacity-50 hover:bg-primary/90 transition-colors shrink-0"
                    data-testid="button-send"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-primary/40" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Your Messages</h3>
              <p className="text-muted-foreground text-sm max-w-[260px]">
                Select a conversation from the list to start chatting
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
