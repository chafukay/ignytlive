import { GuestGate } from "@/components/guest-gate";
import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Send, MoreVertical, Gift, Phone, Video, Plus, Smile, User as UserIcon, PhoneOff, AlertCircle, Trash2, Lock, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import GiftPanel from "@/components/gift-panel";
import { AnimatePresence, motion } from "framer-motion";

export default function Conversation() {
  const [, params] = useRoute("/chat/:userId");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isRequestingCall, setIsRequestingCall] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const otherUserId = params?.userId;

  const { data: otherUser } = useQuery({
    queryKey: ['user', otherUserId],
    queryFn: () => api.getUser(otherUserId!),
    enabled: !!otherUserId,
  });

  const { data: conversationMessages, isLoading } = useQuery({
    queryKey: ['conversation', user?.id, otherUserId],
    queryFn: () => api.getConversation(user!.id, otherUserId!),
    enabled: !!user?.id && !!otherUserId,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  const { data: callMutedData } = useQuery({
    queryKey: ['callMuted', user?.id, otherUserId],
    queryFn: () => api.isCallMuted(user!.id, otherUserId!),
    enabled: !!user?.id && !!otherUserId,
  });

  const { data: blockData } = useQuery({
    queryKey: ['blocked', user?.id, otherUserId],
    queryFn: () => api.isUserBlocked(user!.id, otherUserId!),
    enabled: !!user?.id && !!otherUserId,
  });

  const isCallMuted = callMutedData?.muted || false;
  const isBlocked = blockData?.blocked || false;

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => api.sendMessage(user!.id, otherUserId!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', user?.id, otherUserId] });
      queryClient.invalidateQueries({ queryKey: ['chats', user?.id] });
      setMessage("");
    },
    onError: (error: any) => {
      if (error?.code === "DND_ENABLED") {
        toast({ 
          title: "Cannot send message", 
          description: "This user has Do Not Disturb enabled",
          variant: "destructive" 
        });
      } else {
        toast({ title: "Failed to send message", variant: "destructive" });
      }
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: () => api.deleteConversation(user!.id, otherUserId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', user?.id, otherUserId] });
      queryClient.invalidateQueries({ queryKey: ['chats', user?.id] });
      toast({ title: "Chat deleted" });
      setShowDeleteConfirm(false);
      setLocation("/chat");
    },
    onError: () => {
      toast({ title: "Failed to delete chat", variant: "destructive" });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: () => {
      if (isBlocked) {
        return api.unblockUser(user!.id, otherUserId!);
      }
      return api.blockUser(user!.id, otherUserId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked', user?.id, otherUserId] });
      toast({ title: isBlocked ? "User unblocked" : "User blocked" });
      setShowOptionsMenu(false);
    },
  });

  const muteCallsMutation = useMutation({
    mutationFn: () => {
      if (isCallMuted) {
        return api.unmuteCallsFromUser(user!.id, otherUserId!);
      }
      return api.muteCallsFromUser(user!.id, otherUserId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callMuted', user?.id, otherUserId] });
      toast({ title: isCallMuted ? "Calls unmuted" : "Calls muted" });
      setShowOptionsMenu(false);
    },
  });

  const reportUserMutation = useMutation({
    mutationFn: () => {
      return Promise.all([
        api.reportUser(user!.id, otherUserId!, reportReason, reportDescription),
        api.blockUser(user!.id, otherUserId!),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked', user?.id, otherUserId] });
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !otherUserId) return;
    sendMessageMutation.mutate(message.trim());
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getLastSeen = () => {
    if (!otherUser) return "";
    if (otherUser.isLive) return "Live now";
    return `Level ${otherUser.level}`;
  };

  const handleVoiceCall = () => {
    if (!otherUser?.availableForPrivateCall) {
      toast({ title: "User is not available for calls", variant: "destructive" });
      return;
    }
    if (isCallMuted) {
      toast({ title: "You have muted calls from this user", variant: "destructive" });
      return;
    }
    toast({ title: "Calling...", description: "Voice call feature" });
  };

  const handleVideoCall = () => {
    if (!otherUser?.availableForPrivateCall) {
      toast({ title: "User is not available for calls", variant: "destructive" });
      return;
    }
    if (isCallMuted) {
      toast({ title: "You have muted calls from this user", variant: "destructive" });
      return;
    }
    if (otherUserId && !isRequestingCall) {
      setIsRequestingCall(true);
      api.requestPrivateCall(user!.id, otherUserId).then((call: any) => {
        toast({ title: "Call requested", description: "Waiting for response..." });
      }).catch(() => {
        toast({ title: "Failed to start call", variant: "destructive" });
      }).finally(() => {
        setIsRequestingCall(false);
      });
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

  if (!user) {
    return (
      <GuestGate>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to view messages</p>
      </div>
      </GuestGate>
    );
  }

  const groupedMessages = conversationMessages?.reduce((groups: Record<string, typeof conversationMessages>, msg) => {
    const dateKey = formatDate(msg.createdAt);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey]!.push(msg);
    return groups;
  }, {});

  return (
    <GuestGate>
    <div className="min-h-screen bg-black flex flex-col" data-testid="conversation-page">
      <div className="bg-black/95 border-b border-white/10 px-3 py-3 flex items-center gap-3 safe-area-top">
        <button 
          onClick={() => setLocation("/chat")}
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        {otherUser ? (
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => setLocation(`/profile/${otherUser.id}`)}
            data-testid="button-view-profile-header"
          >
            <div className="relative">
              <img 
                src={otherUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`}
                className="w-10 h-10 rounded-full object-cover border border-white/20"
                alt={otherUser.username}
                data-testid="img-chat-partner-avatar"
              />
              {otherUser.isLive && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-white text-[15px] truncate" data-testid="text-chat-partner-username">{otherUser.username}</h2>
              <p className="text-[11px] text-white/50" data-testid="text-chat-partner-status">
                {getLastSeen()}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 h-10 bg-white/10 rounded animate-pulse" />
        )}
        
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
            disabled={isRequestingCall}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
            data-testid="button-video-call"
          >
            {isRequestingCall ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Video className="w-5 h-5 text-white" />}
          </button>
          <button 
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            data-testid="button-chat-options"
          >
            <MoreVertical className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className="h-10 w-48 bg-white/10 rounded-2xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : conversationMessages && conversationMessages.length > 0 ? (
          <>
            {groupedMessages && Object.entries(groupedMessages).map(([dateKey, msgs]) => (
              <div key={dateKey}>
                <div className="flex justify-center my-4">
                  <span className="bg-emerald-600/80 text-white text-[11px] px-3 py-1 rounded-full font-medium" data-testid={`text-date-${dateKey}`}>
                    {dateKey}
                  </span>
                </div>
                <div className="space-y-2">
                  {msgs!.map((msg) => {
                    const isOwn = msg.senderId === user.id;
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[75%] px-3.5 py-2 ${
                            isOwn 
                              ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl rounded-br-md' 
                              : 'bg-zinc-800 text-white rounded-2xl rounded-bl-md'
                          }`}
                        >
                          <p className="text-[14px] leading-relaxed">{msg.content}</p>
                          <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : ''}`}>
                            <p className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-white/40'}`}>
                              {formatTime(msg.createdAt)}
                            </p>
                            {msg.content?.includes("[locked]") && (
                              <Lock className="w-3 h-3 text-white/40" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center text-white/40">
              <p className="text-base">No messages yet</p>
              <p className="text-sm mt-1">Say hello!</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isBlocked ? (
        <div className="px-4 py-4 border-t border-white/10 bg-zinc-900/80">
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
        <form onSubmit={handleSend} className="px-3 py-3 border-t border-white/10 bg-black/95 safe-area-bottom">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              data-testid="button-plus-menu"
            >
              <Plus className="w-6 h-6 text-white/60" />
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Say something..."
                className="w-full bg-zinc-800/80 border border-white/10 rounded-full py-2.5 px-4 pr-10 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors placeholder:text-white/30"
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
                className="p-2.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
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
      )}

      {otherUser && (
        <GiftPanel
          receiverId={otherUser.id}
          receiverName={otherUser.username}
          isOpen={showGiftPanel}
          onClose={() => setShowGiftPanel(false)}
        />
      )}

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
                  <UserIcon className="w-5 h-5 text-white/40" />
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
              <div className="h-safe-area-bottom" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
    </GuestGate>
  );
}
