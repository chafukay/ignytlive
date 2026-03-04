import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { MessageCircle, Send, ArrowLeft, MoreVertical, Search, Users, UserRound, Phone, Video, PhoneOff, AlertCircle, Trash2, Plus, Gift, Smile, Check, CheckCheck, X, Pencil, Languages, Reply, Copy, Star, Pin, Forward, Info, CheckSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useRef, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "@/components/user-avatar";
import GiftPanel from "@/components/gift-panel";
import type { User, Message } from "@shared/schema";
import { AnimatePresence, motion } from "framer-motion";

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
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [longPressedMessageId, setLongPressedMessageId] = useState<string | null>(null);
  const [showDeleteMessageConfirm, setShowDeleteMessageConfirm] = useState(false);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [messageSelectMode, setMessageSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [translatedMessages, setTranslatedMessages] = useState<Map<string, string>>(new Map());
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedUserId = params?.userId || null;

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3) {
      setDebouncedSearch("");
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(trimmed), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: chats, isLoading: chatsLoading } = useQuery({
    queryKey: ['chats', user?.id],
    queryFn: () => api.getRecentChats(user!.id),
    enabled: !!user?.id,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['unreadMessageCount', user?.id],
    queryFn: () => api.getUnreadMessageCount(user!.id),
    enabled: !!user?.id,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const unreadBySender = new Map<string, number>(
    (unreadData?.perSender || []).map((item: { senderId: string; count: number }) => [item.senderId, item.count])
  );

  const markReadMutation = useMutation({
    mutationFn: (otherUserId: string) => api.markMessagesAsRead(user!.id, otherUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadMessageCount', user?.id] });
    },
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['searchUsers', debouncedSearch],
    queryFn: () => api.searchUsers(debouncedSearch),
    enabled: debouncedSearch.length >= 3,
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
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const { data: callMutedData } = useQuery({
    queryKey: ['callMuted', user?.id, selectedUserId],
    queryFn: () => api.isCallMuted(user!.id, selectedUserId!),
    enabled: !!user?.id && !!selectedUserId,
  });

  const { data: blockData } = useQuery({
    queryKey: ['blocked', user?.id, selectedUserId],
    queryFn: () => api.isUserBlocked(user!.id, selectedUserId!),
    enabled: !!user?.id && !!selectedUserId,
  });

  const isCallMuted = callMutedData?.muted || false;
  const isBlocked = blockData?.blocked || false;

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => api.sendMessage(user!.id, selectedUserId!, content, replyToMessage?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', user?.id, selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['chats', user?.id] });
      setMessage("");
      setReplyToMessage(null);
    },
    onError: (error: any) => {
      if (error?.code === "DND_ENABLED") {
        toast({ title: "Cannot send message", description: "This user has Do Not Disturb enabled", variant: "destructive" });
      } else if (error?.code === "BLOCKED") {
        toast({ title: "Cannot send message", description: "You cannot message this user", variant: "destructive" });
      } else {
        toast({ title: "Failed to send message", variant: "destructive" });
      }
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: () => api.deleteConversation(user!.id, selectedUserId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', user?.id, selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['chats', user?.id] });
      toast({ title: "Chat deleted" });
      setShowDeleteConfirm(false);
      goBackToList();
    },
    onError: () => {
      toast({ title: "Failed to delete chat", variant: "destructive" });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => api.deleteMessage(messageId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', user?.id, selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['chats', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessageCount', user?.id] });
      toast({ title: "Message deleted" });
      setShowDeleteMessageConfirm(false);
      setLongPressedMessageId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete message", variant: "destructive" });
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      api.editMessage(messageId, user!.id, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversation', user?.id, selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['chats', user?.id] });
      setTranslatedMessages(prev => {
        const next = new Map(prev);
        next.delete(variables.messageId);
        return next;
      });
      toast({ title: "Message edited" });
      setEditingMessageId(null);
      setEditContent("");
    },
    onError: () => {
      toast({ title: "Failed to edit message", variant: "destructive" });
    },
  });

  const deleteBulkConversationsMutation = useMutation({
    mutationFn: (otherUserIds: string[]) => api.deleteMultipleConversations(user!.id, otherUserIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessageCount', user?.id] });
      toast({ title: `${selectedChatIds.size} conversation${selectedChatIds.size > 1 ? 's' : ''} deleted` });
      setShowBulkDeleteConfirm(false);
      setSelectedChatIds(new Set());
      setSelectMode(false);
    },
    onError: () => {
      toast({ title: "Failed to delete conversations", variant: "destructive" });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: () => {
      if (isBlocked) {
        return api.unblockUser(user!.id, selectedUserId!);
      }
      return api.blockUser(user!.id, selectedUserId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked', user?.id, selectedUserId] });
      toast({ title: isBlocked ? "User unblocked" : "User blocked" });
      setShowOptionsMenu(false);
    },
  });

  const muteCallsMutation = useMutation({
    mutationFn: () => {
      if (isCallMuted) {
        return api.unmuteCallsFromUser(user!.id, selectedUserId!);
      }
      return api.muteCallsFromUser(user!.id, selectedUserId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callMuted', user?.id, selectedUserId] });
      toast({ title: isCallMuted ? "Calls unmuted" : "Calls muted" });
      setShowOptionsMenu(false);
    },
  });

  const reportUserMutation = useMutation({
    mutationFn: () => {
      return Promise.all([
        api.reportUser(user!.id, selectedUserId!, reportReason, reportDescription),
        api.blockUser(user!.id, selectedUserId!),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked', user?.id, selectedUserId] });
      toast({ title: "User reported and blocked" });
      setShowReportDialog(false);
      setShowOptionsMenu(false);
      setReportReason("");
      setReportDescription("");
    },
    onError: () => {
      toast({ title: "Failed to report user", variant: "destructive" });
    },
  });

  const { data: following } = useQuery({
    queryKey: ['following', user?.id],
    queryFn: () => api.getFollowing(user!.id),
    enabled: !!user?.id,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedUserId) {
      setMobileShowConversation(true);
      if (user) {
        markReadMutation.mutate(selectedUserId);
      }
    }
  }, [selectedUserId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !selectedUserId) return;
    sendMessageMutation.mutate(message.trim());
  };

  const selectChat = (userId: string) => {
    if (selectMode) {
      toggleChatSelection(userId);
      return;
    }
    setLocation(`/chat/${userId}`);
    setMobileShowConversation(true);
    if (user && unreadBySender.has(userId)) {
      markReadMutation.mutate(userId);
    }
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

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const initiateCall = (callType: "voice" | "video") => {
    if (!otherUser?.availableForPrivateCall) {
      toast({ title: "User is not available for calls", variant: "destructive" });
      return;
    }
    if (isCallMuted) {
      toast({ title: "You have muted calls from this user", variant: "destructive" });
      return;
    }
    if (selectedUserId) {
      api.requestPrivateCall(user!.id, selectedUserId).then((data) => {
        setLocation(`/private-call/${data.id}`);
      }).catch((err) => {
        const msg = err?.message || "Failed to start call";
        toast({ title: msg, variant: "destructive" });
      });
    }
  };

  const handleVoiceCall = () => initiateCall("voice");
  const handleVideoCall = () => initiateCall("video");

  const handleMessageLongPress = (msgId: string, e?: React.TouchEvent | React.MouseEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    const clientX = e ? ('touches' in e ? e.touches[0].clientX : e.clientX) : window.innerWidth / 2;
    const clientY = e ? ('touches' in e ? e.touches[0].clientY : e.clientY) : window.innerHeight / 2;
    longPressTimerRef.current = setTimeout(() => {
      setLongPressedMessageId(msgId);
      setContextMenuPosition({ x: clientX, y: clientY });
      setShowMessageActions(true);
    }, 500);
  };

  const handleMessageTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast({ title: "Message copied" });
    }).catch(() => {
      toast({ title: "Failed to copy", variant: "destructive" });
    });
    setShowMessageActions(false);
    setLongPressedMessageId(null);
  };

  const handleReply = (msg: Message) => {
    setReplyToMessage(msg);
    setShowMessageActions(false);
    setLongPressedMessageId(null);
  };

  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  const handleStartEdit = (msg: Message) => {
    setShowMessageActions(false);
    setLongPressedMessageId(null);
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
    setTimeout(() => editInputRef.current?.focus(), 100);
  };

  const handleSubmitEdit = () => {
    if (!editingMessageId || !editContent.trim()) return;
    editMessageMutation.mutate({ messageId: editingMessageId, content: editContent.trim() });
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleTranslate = async (msgId: string, content: string) => {
    setShowMessageActions(false);
    setLongPressedMessageId(null);
    setTranslatingId(msgId);
    try {
      const result = await api.translateText(content);
      setTranslatedMessages(prev => new Map(prev).set(msgId, result.translatedText));
    } catch {
      toast({ title: "Translation failed", variant: "destructive" });
    } finally {
      setTranslatingId(null);
    }
  };

  const reportReasons = [
    "Spam or scam",
    "Harassment or bullying",
    "Inappropriate content",
    "Fake profile",
    "Underage user",
    "Other",
  ];

  const followingIds = new Set(following?.map((f: User) => f.id) || []);

  const mainChats = useMemo(() => chats?.filter(({ user: chatUser }) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (chatUser.username ?? '').toLowerCase().includes(q);
    }
    return followingIds.has(chatUser.id);
  }) || [], [chats, followingIds, searchQuery]);

  const othersChats = useMemo(() => chats?.filter(({ user: chatUser }) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (chatUser.username ?? '').toLowerCase().includes(q);
    }
    return !followingIds.has(chatUser.id);
  }) || [], [chats, followingIds, searchQuery]);

  const filteredChats = activeTab === "main" ? mainChats : othersChats;

  const mainUnreadCount = useMemo(() => {
    let count = 0;
    for (const { user: chatUser } of (chats || [])) {
      if (followingIds.has(chatUser.id)) {
        count += unreadBySender.get(chatUser.id) || 0;
      }
    }
    return count;
  }, [chats, followingIds, unreadBySender]);

  const othersUnreadCount = useMemo(() => {
    let count = 0;
    for (const { user: chatUser } of (chats || [])) {
      if (!followingIds.has(chatUser.id)) {
        count += unreadBySender.get(chatUser.id) || 0;
      }
    }
    return count;
  }, [chats, followingIds, unreadBySender]);

  const toggleChatSelection = (userId: string) => {
    setSelectedChatIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAllChats = () => {
    const allIds = filteredChats.map(({ user: chatUser }) => chatUser.id);
    if (selectedChatIds.size === allIds.length) {
      setSelectedChatIds(new Set());
    } else {
      setSelectedChatIds(new Set(allIds));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedChatIds(new Set());
  };

  const groupedMessages = messages?.reduce((groups: Record<string, Message[]>, msg: Message) => {
    const dateKey = formatDate(msg.createdAt);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey]!.push(msg);
    return groups;
  }, {});

  if (!user) {
    return (
      <GuestGate>
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Please log in to see your messages</p>
        </div>
      </Layout>
      </GuestGate>
    );
  }

  return (
    <GuestGate>
    <Layout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Left Panel - Chat List */}
        <div className={`w-full md:w-[30%] md:min-w-[280px] md:max-w-[360px] border-r border-border flex flex-col bg-background ${
          mobileShowConversation ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-4 border-b border-border shrink-0">
            {selectMode ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={exitSelectMode}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    data-testid="button-exit-select-mode"
                  >
                    <X className="w-5 h-5 text-foreground" />
                  </button>
                  <span className="text-foreground font-semibold">{selectedChatIds.size} selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllChats}
                    className="text-xs text-primary font-medium px-3 py-1.5 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors"
                    data-testid="button-select-all"
                  >
                    {selectedChatIds.size === filteredChats.length ? "Deselect All" : "Select All"}
                  </button>
                  <button
                    onClick={() => {
                      if (selectedChatIds.size > 0) setShowBulkDeleteConfirm(true);
                    }}
                    disabled={selectedChatIds.size === 0}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors disabled:opacity-30"
                    data-testid="button-delete-selected"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h1 className="text-xl font-bold text-foreground" data-testid="text-chat-title">Messages</h1>
                  <button
                    onClick={() => { setSelectMode(true); setSearchQuery(""); setDebouncedSearch(""); }}
                    className="text-xs text-muted-foreground font-medium px-3 py-1.5 bg-muted rounded-full hover:bg-muted/80 transition-colors"
                    data-testid="button-enter-select-mode"
                  >
                    Edit
                  </button>
                </div>
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
              </>
            )}
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
              <span className="inline-flex items-center gap-1.5">
                Main
                {mainUnreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" data-testid="badge-main-unread">
                    {mainUnreadCount > 99 ? '99+' : mainUnreadCount}
                  </span>
                )}
              </span>
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
              <span className="inline-flex items-center gap-1.5">
                Others
                {othersUnreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" data-testid="badge-others-unread">
                    {othersUnreadCount > 99 ? '99+' : othersUnreadCount}
                  </span>
                )}
              </span>
              {activeTab === "others" && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {debouncedSearch.length > 0 ? (
              searchLoading ? (
                <div className="p-3 space-y-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                      <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="h-4 w-24 bg-muted rounded mb-2" />
                        <div className="h-3 w-20 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="p-2">
                  <p className="text-xs text-muted-foreground px-3 py-1.5">Users</p>
                  {searchResults.filter(u => u.id !== user.id).map((searchUser) => (
                    <div
                      key={searchUser.id}
                      onClick={() => selectChat(searchUser.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        selectedUserId === searchUser.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted/50'
                      }`}
                      data-testid={`search-user-${searchUser.id}`}
                    >
                      <div className="shrink-0">
                        <UserAvatar
                          userId={searchUser.id}
                          username={searchUser.username}
                          avatar={searchUser.avatar}
                          isLive={searchUser.isLive}
                          isOnline={searchUser.isLive}
                          size="md"
                          showStatus={true}
                          linkToProfile={false}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">{searchUser.username}</h3>
                        <p className="text-muted-foreground text-xs">Level {searchUser.level}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No users found</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">Try a different name</p>
                </div>
              )
            ) : chatsLoading ? (
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
                {filteredChats.map(({ user: chatUser, lastMessage }) => {
                  const unreadCount = unreadBySender.get(chatUser.id) || 0;
                  const hasUnread = unreadCount > 0;
                  const isSelected = selectedChatIds.has(chatUser.id);
                  return (
                    <div
                      key={chatUser.id}
                      onClick={() => selectChat(chatUser.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border border-primary/20'
                          : selectedUserId === chatUser.id
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-muted/50'
                      }`}
                      data-testid={`chat-${chatUser.id}`}
                    >
                      {selectMode && (
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-primary border-primary' : 'border-white/30'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      )}
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
                          <h3 className={`text-sm truncate ${hasUnread ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>{chatUser.username}</h3>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {formatTime(lastMessage.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs truncate ${hasUnread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                            {lastMessage.senderId === user.id ? 'You: ' : ''}{lastMessage.content}
                          </p>
                          {hasUnread && !selectMode && (
                            <span
                              className="shrink-0 ml-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                              data-testid={`badge-unread-${chatUser.id}`}
                            >
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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

        {/* Right Panel - Conversation */}
        <div className={`w-full md:flex-1 flex flex-col bg-black ${
          !mobileShowConversation ? 'hidden md:flex' : 'flex'
        }`}>
          {selectedUserId && otherUser ? (
            <>
              <div className="bg-black/95 border-b border-white/10 px-3 py-3 flex items-center gap-3 shrink-0">
                <button
                  onClick={goBackToList}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors md:hidden"
                  data-testid="button-back-to-chats"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
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
                    <h2 className="font-semibold text-white text-sm" data-testid="text-chat-partner-username">{otherUser.username}</h2>
                    <p className="text-[11px] text-white/50" data-testid="text-chat-partner-status">
                      {otherUser.isLive ? "Live now" : `Level ${otherUser.level}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleVoiceCall}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    data-testid="button-voice-call"
                  >
                    <Phone className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={handleVideoCall}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    data-testid="button-video-call"
                  >
                    <Video className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => setShowOptionsMenu(true)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    data-testid="button-chat-options"
                  >
                    <MoreVertical className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {messagesLoading ? (
                  <div className="flex flex-col gap-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                        <div className="h-10 w-48 bg-white/10 rounded-2xl animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : messages && messages.length > 0 ? (
                  <>
                    {groupedMessages && Object.entries(groupedMessages).map(([dateKey, msgs]) => (
                      <div key={dateKey}>
                        <div className="flex justify-center my-4">
                          <span className="bg-emerald-600/80 text-white text-[11px] px-3 py-1 rounded-full font-medium">
                            {dateKey}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {(msgs as Message[]).map((msg: Message) => {
                            const isOwn = msg.senderId === user.id;
                            return (
                              <div
                                key={msg.id}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group items-center gap-2 ${messageSelectMode ? 'cursor-pointer' : ''} ${messageSelectMode && selectedMessageIds.has(msg.id) ? 'bg-amber-500/10 rounded-lg -mx-1 px-1' : ''}`}
                                onMouseDown={(e) => !messageSelectMode && handleMessageLongPress(msg.id, e)}
                                onMouseUp={() => !messageSelectMode && handleMessageTouchEnd()}
                                onMouseLeave={() => !messageSelectMode && handleMessageTouchEnd()}
                                onTouchStart={(e) => !messageSelectMode && handleMessageLongPress(msg.id, e)}
                                onTouchEnd={() => !messageSelectMode && handleMessageTouchEnd()}
                                onClick={() => {
                                  if (messageSelectMode) {
                                    setSelectedMessageIds(prev => {
                                      const next = new Set(prev);
                                      if (next.has(msg.id)) next.delete(msg.id);
                                      else next.add(msg.id);
                                      return next;
                                    });
                                  }
                                }}
                                onContextMenu={(e) => {
                                  if (messageSelectMode) return;
                                  e.preventDefault();
                                  setLongPressedMessageId(msg.id);
                                  setContextMenuPosition({ x: e.clientX, y: e.clientY });
                                  setShowMessageActions(true);
                                }}
                              >
                                {messageSelectMode && (
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selectedMessageIds.has(msg.id) ? 'bg-amber-500 border-amber-500' : 'border-white/30'}`}>
                                    {selectedMessageIds.has(msg.id) && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                )}
                                <div
                                  className={`max-w-[75%] px-3.5 py-2 relative ${
                                    isOwn
                                      ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl rounded-br-md'
                                      : 'bg-zinc-800 text-white rounded-2xl rounded-bl-md'
                                  }`}
                                  data-testid={`message-bubble-${msg.id}`}
                                >
                                  {editingMessageId === msg.id ? (
                                    <div className="flex flex-col gap-1.5">
                                      <input
                                        ref={editInputRef}
                                        type="text"
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSubmitEdit();
                                          if (e.key === 'Escape') handleCancelEdit();
                                        }}
                                        className="bg-white/20 text-white text-[14px] px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/40 w-full"
                                        data-testid="input-edit-message"
                                      />
                                      <div className="flex gap-2 justify-end">
                                        <button
                                          onClick={handleCancelEdit}
                                          className="text-[11px] text-white/70 hover:text-white px-2 py-0.5"
                                          data-testid="button-cancel-edit"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={handleSubmitEdit}
                                          className="text-[11px] text-white font-semibold bg-white/20 rounded px-2 py-0.5"
                                          data-testid="button-save-edit"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {msg.replyToId && (() => {
                                        const repliedMsg = (messages as Message[] | undefined)?.find((m: Message) => m.id === msg.replyToId);
                                        if (!repliedMsg) return null;
                                        const repliedIsOwn = repliedMsg.senderId === user.id;
                                        return (
                                          <div className={`mb-1.5 px-2 py-1 rounded-lg border-l-2 ${isOwn ? 'bg-white/10 border-white/40' : 'bg-white/5 border-amber-500/60'}`}>
                                            <p className={`text-[10px] font-semibold ${isOwn ? 'text-white/70' : 'text-amber-400/80'}`}>
                                              {repliedIsOwn ? 'You' : otherUser?.username}
                                            </p>
                                            <p className="text-[12px] text-white/60 truncate">{repliedMsg.content}</p>
                                          </div>
                                        );
                                      })()}
                                      <p className="text-[14px] leading-relaxed">{msg.content}</p>
                                      {translatedMessages.has(msg.id) && (
                                        <div className="mt-1.5 pt-1.5 border-t border-white/20">
                                          <p className="text-[11px] text-white/60 italic mb-0.5">Translation:</p>
                                          <p className="text-[13px] leading-relaxed">{translatedMessages.get(msg.id)}</p>
                                        </div>
                                      )}
                                      {translatingId === msg.id && (
                                        <p className="text-[11px] text-white/50 mt-1 italic">Translating...</p>
                                      )}
                                      <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : ''}`}>
                                        {msg.isEdited && (
                                          <span className={`text-[10px] italic ${isOwn ? 'text-white/60' : 'text-white/40'}`}>edited</span>
                                        )}
                                        <p className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-white/40'}`}>
                                          {formatTime(msg.createdAt)}
                                        </p>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-white/40">
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-1">Say hello!</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {messageSelectMode ? (
                <div className="px-4 py-3 border-t border-white/10 bg-zinc-900/95 shrink-0">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => { setMessageSelectMode(false); setSelectedMessageIds(new Set()); }}
                      className="text-sm text-white/70 hover:text-white font-medium"
                      data-testid="button-cancel-select"
                    >
                      Cancel
                    </button>
                    <span className="text-sm text-white/50">{selectedMessageIds.size} selected</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const selectedMsgs = (messages as Message[] | undefined)?.filter((m: Message) => selectedMessageIds.has(m.id));
                          const text = selectedMsgs?.map(m => m.content).join('\n') || '';
                          navigator.clipboard.writeText(text);
                          toast({ title: `${selectedMessageIds.size} message(s) copied` });
                          setMessageSelectMode(false);
                          setSelectedMessageIds(new Set());
                        }}
                        disabled={selectedMessageIds.size === 0}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                        data-testid="button-copy-selected"
                      >
                        <Copy className="w-5 h-5 text-white/70" />
                      </button>
                      <button
                        onClick={() => {
                          selectedMessageIds.forEach(id => deleteMessageMutation.mutate(id));
                          setMessageSelectMode(false);
                          setSelectedMessageIds(new Set());
                        }}
                        disabled={selectedMessageIds.size === 0}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                        data-testid="button-delete-selected"
                      >
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : isBlocked ? (
                <div className="px-4 py-4 border-t border-white/10 bg-zinc-900/80 shrink-0">
                  <div className="flex items-center justify-center gap-2 text-white/40">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">You have blocked this user</span>
                    <button
                      onClick={() => blockUserMutation.mutate()}
                      className="text-sm text-amber-500 font-medium ml-2"
                      data-testid="button-unblock"
                    >
                      Unblock
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-white/10 bg-black/95 shrink-0">
                  {replyToMessage && (
                    <div className="px-4 pt-2 pb-0">
                      <div className="flex items-start gap-2 bg-zinc-800/80 rounded-xl px-3 py-2 border-l-2 border-amber-500">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-amber-400">
                            {replyToMessage.senderId === user?.id ? 'You' : otherUser?.username}
                          </p>
                          <p className="text-[13px] text-white/60 truncate">{replyToMessage.content}</p>
                        </div>
                        <button
                          onClick={handleCancelReply}
                          className="p-0.5 hover:bg-white/10 rounded-full shrink-0"
                          data-testid="button-cancel-reply"
                        >
                          <X className="w-4 h-4 text-white/40" />
                        </button>
                      </div>
                    </div>
                  )}
                  <form onSubmit={handleSend} className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-2 rounded-full hover:bg-white/10 transition-colors"
                      data-testid="button-plus-menu"
                    >
                      <Plus className="w-6 h-6 text-white/60" />
                    </button>

                    <div className="flex-1">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Say something..."
                        className="w-full bg-zinc-800/80 border border-white/10 rounded-full py-2.5 px-4 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors placeholder:text-white/30"
                        data-testid="input-message"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowGiftPanel(true)}
                      className="p-2 rounded-full hover:bg-white/10 transition-colors"
                      data-testid="button-gift-chat"
                    >
                      <Gift className="w-6 h-6 text-white/60" />
                    </button>

                    {message.trim() ? (
                      <button
                        type="submit"
                        disabled={sendMessageMutation.isPending}
                        className="p-2.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-white disabled:opacity-50 hover:opacity-90 transition-opacity shrink-0"
                        data-testid="button-send"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        data-testid="button-emoji"
                      >
                        <Smile className="w-6 h-6 text-white/60" />
                      </button>
                    )}
                  </div>
                </form>
                </div>
              )}
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

      {otherUser && (
        <GiftPanel
          receiverId={otherUser.id}
          receiverName={otherUser.username}
          isOpen={showGiftPanel}
          onClose={() => setShowGiftPanel(false)}
        />
      )}

      {/* Options Menu Bottom Sheet */}
      <AnimatePresence>
        {showOptionsMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
            onClick={() => setShowOptionsMenu(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="w-full max-w-lg bg-zinc-900 rounded-t-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              data-testid="menu-chat-options"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    if (otherUser) setLocation(`/profile/${otherUser.id}`);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-5 py-4 text-white active:bg-white/5 transition-colors"
                  data-testid="menu-item-view-profile"
                >
                  <span className="text-[15px]">View Profile</span>
                  <UserRound className="w-5 h-5 text-white/40" />
                </button>

                <button
                  onClick={() => muteCallsMutation.mutate()}
                  className="w-full flex items-center justify-between px-5 py-4 text-white active:bg-white/5 transition-colors border-t border-white/5"
                  data-testid="menu-item-mute-calls"
                >
                  <span className="text-[15px]">{isCallMuted ? "Unmute Calls" : "Mute Calls"}</span>
                  <PhoneOff className="w-5 h-5 text-white/40" />
                </button>

                <button
                  onClick={() => {
                    setShowReportDialog(true);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-5 py-4 text-white active:bg-white/5 transition-colors border-t border-white/5"
                  data-testid="menu-item-report-block"
                >
                  <span className="text-[15px]">Report and Block</span>
                  <AlertCircle className="w-5 h-5 text-white/40" />
                </button>

                <button
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-5 py-4 active:bg-white/5 transition-colors border-t border-white/5"
                  data-testid="menu-item-delete-chat"
                >
                  <span className="text-[15px] text-red-500">Delete conversation</span>
                  <Trash2 className="w-5 h-5 text-red-500/40" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Conversation Confirm Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-zinc-900 rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              data-testid="dialog-delete-chat"
            >
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Delete the chat</h3>
                <p className="text-white/50 text-sm">
                  Are you sure you want to delete the chat with this user?
                </p>
              </div>
              <div className="px-6 pb-6 space-y-3">
                <button
                  onClick={() => deleteConversationMutation.mutate()}
                  disabled={deleteConversationMutation.isPending}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  data-testid="button-confirm-delete"
                >
                  {deleteConversationMutation.isPending ? "Deleting..." : "Delete the chat"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors border border-white/10"
                  data-testid="button-cancel-delete"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp-style Floating Context Menu */}
      <AnimatePresence>
        {showMessageActions && longPressedMessageId && contextMenuPosition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            onClick={() => { setShowMessageActions(false); setLongPressedMessageId(null); setContextMenuPosition(null); }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute bg-zinc-900 border border-white/10 rounded-xl shadow-2xl shadow-black/60 py-1.5 w-48 overflow-hidden"
              style={{
                top: Math.min(contextMenuPosition.y, window.innerHeight - 380),
                left: Math.min(Math.max(contextMenuPosition.x - 96, 8), window.innerWidth - 200),
              }}
              onClick={(e) => e.stopPropagation()}
              data-testid="dialog-message-actions"
            >
              {(() => {
                const selectedMsg = (messages as Message[] | undefined)?.find((m: Message) => m.id === longPressedMessageId);
                const isOwnMsg = selectedMsg?.senderId === user?.id;
                const menuItem = "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left";
                return (
                  <>
                    <button
                      onClick={() => selectedMsg && handleReply(selectedMsg)}
                      className={menuItem}
                      data-testid="button-action-reply"
                    >
                      <Reply className="w-[18px] h-[18px] text-white/70" />
                      <span className="text-white text-[14px]">Reply</span>
                    </button>
                    <button
                      onClick={() => selectedMsg && handleCopyMessage(selectedMsg.content)}
                      className={menuItem}
                      data-testid="button-action-copy"
                    >
                      <Copy className="w-[18px] h-[18px] text-white/70" />
                      <span className="text-white text-[14px]">Copy</span>
                    </button>
                    <button
                      onClick={() => selectedMsg && handleTranslate(selectedMsg.id, selectedMsg.content)}
                      className={menuItem}
                      data-testid="button-action-translate"
                    >
                      <Languages className="w-[18px] h-[18px] text-white/70" />
                      <span className="text-white text-[14px]">Translate</span>
                    </button>
                    <button
                      onClick={() => { toast({ title: "Coming soon" }); setShowMessageActions(false); setLongPressedMessageId(null); }}
                      className={menuItem}
                      data-testid="button-action-forward"
                    >
                      <Forward className="w-[18px] h-[18px] text-white/70" />
                      <span className="text-white text-[14px]">Forward</span>
                    </button>
                    <button
                      onClick={() => { toast({ title: "Coming soon" }); setShowMessageActions(false); setLongPressedMessageId(null); }}
                      className={menuItem}
                      data-testid="button-action-star"
                    >
                      <Star className="w-[18px] h-[18px] text-white/70" />
                      <span className="text-white text-[14px]">Star</span>
                    </button>
                    {isOwnMsg && (
                      <button
                        onClick={() => selectedMsg && handleStartEdit(selectedMsg)}
                        className={menuItem}
                        data-testid="button-action-edit"
                      >
                        <Pencil className="w-[18px] h-[18px] text-white/70" />
                        <span className="text-white text-[14px]">Edit</span>
                      </button>
                    )}
                    <div className="mx-3 my-1 border-t border-white/10" />
                    <button
                      onClick={() => {
                        setShowMessageActions(false);
                        setContextMenuPosition(null);
                        setShowDeleteMessageConfirm(true);
                      }}
                      className={menuItem}
                      data-testid="button-action-delete"
                    >
                      <Trash2 className="w-[18px] h-[18px] text-red-400" />
                      <span className="text-red-400 text-[14px]">Delete</span>
                    </button>
                    <button
                      onClick={() => {
                        const initialId = longPressedMessageId;
                        setShowMessageActions(false);
                        setLongPressedMessageId(null);
                        setContextMenuPosition(null);
                        setMessageSelectMode(true);
                        if (initialId) setSelectedMessageIds(new Set([initialId]));
                      }}
                      className={menuItem}
                      data-testid="button-action-select"
                    >
                      <CheckSquare className="w-[18px] h-[18px] text-white/70" />
                      <span className="text-white text-[14px]">Select messages</span>
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Message Confirm Dialog */}
      <AnimatePresence>
        {showDeleteMessageConfirm && longPressedMessageId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
            onClick={() => { setShowDeleteMessageConfirm(false); setLongPressedMessageId(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-zinc-900 rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              data-testid="dialog-delete-message"
            >
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Delete message</h3>
                <p className="text-white/50 text-sm">
                  Are you sure you want to delete this message?
                </p>
              </div>
              <div className="px-6 pb-6 space-y-3">
                <button
                  onClick={() => deleteMessageMutation.mutate(longPressedMessageId)}
                  disabled={deleteMessageMutation.isPending}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  data-testid="button-confirm-delete-message"
                >
                  {deleteMessageMutation.isPending ? "Deleting..." : "Delete message"}
                </button>
                <button
                  onClick={() => { setShowDeleteMessageConfirm(false); setLongPressedMessageId(null); }}
                  className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors border border-white/10"
                  data-testid="button-cancel-delete-message"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Conversations Confirm Dialog */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
            onClick={() => setShowBulkDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-zinc-900 rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              data-testid="dialog-bulk-delete"
            >
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Delete {selectedChatIds.size} conversation{selectedChatIds.size > 1 ? 's' : ''}?</h3>
                <p className="text-white/50 text-sm">
                  This action cannot be undone. All messages in the selected conversations will be permanently deleted.
                </p>
              </div>
              <div className="px-6 pb-6 space-y-3">
                <button
                  onClick={() => deleteBulkConversationsMutation.mutate(Array.from(selectedChatIds))}
                  disabled={deleteBulkConversationsMutation.isPending}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  data-testid="button-confirm-bulk-delete"
                >
                  {deleteBulkConversationsMutation.isPending ? "Deleting..." : `Delete ${selectedChatIds.size} conversation${selectedChatIds.size > 1 ? 's' : ''}`}
                </button>
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors border border-white/10"
                  data-testid="button-cancel-bulk-delete"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Dialog */}
      <AnimatePresence>
        {showReportDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
            onClick={() => setShowReportDialog(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-zinc-900 rounded-t-2xl overflow-hidden max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              data-testid="dialog-report"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-white mb-1">Report and Block</h3>
                <p className="text-white/50 text-sm mb-4">
                  This user will be blocked and reported. Select a reason:
                </p>
                
                <div className="space-y-2 mb-4">
                  {reportReasons.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
                        reportReason === reason 
                          ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400' 
                          : 'bg-zinc-800 border border-white/5 text-white hover:bg-zinc-700'
                      }`}
                      data-testid={`button-report-reason-${reason}`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                {reportReason && (
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Additional details (optional)..."
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white text-sm resize-none h-20 focus:outline-none focus:border-amber-500/50 placeholder:text-white/30 mb-4"
                    data-testid="input-report-description"
                  />
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowReportDialog(false);
                      setReportReason("");
                      setReportDescription("");
                    }}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors border border-white/10"
                    data-testid="button-cancel-report"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => reportUserMutation.mutate()}
                    disabled={!reportReason || reportUserMutation.isPending}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                    data-testid="button-confirm-report"
                  >
                    {reportUserMutation.isPending ? "Reporting..." : "Report & Block"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
    </GuestGate>
  );
}
