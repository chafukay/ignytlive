import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { X, Heart, Gift, Send, Share2, Swords, Star, Video, UserPlus, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { createStreamWebSocket } from "@/lib/websocket";
import PKBattleView from "@/components/pk-battle-view";
import SpinWheel from "@/components/spin-wheel";
import WishlistPanel from "@/components/wishlist-panel";
import BadgesDisplay from "@/components/badges-display";
import CallButton from "@/components/call-button";
import { useToast } from "@/hooks/use-toast";
import type { Gift as GiftType, StreamGoal } from "@shared/schema";

interface Comment {
  id: string;
  user: string;
  text: string;
  color?: string;
  isGift?: boolean;
  gift?: string;
}

export default function LiveRoom() {
  const [, params] = useRoute("/live/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const streamId = params?.id;
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [likes, setLikes] = useState(0);
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [isPKMode, setIsPKMode] = useState(false);
  const [pkScore, setPkScore] = useState(15000);
  const [viewerCount, setViewerCount] = useState(0);
  const [isSendingGift, setIsSendingGift] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  const { data: stream, isLoading: streamLoading } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => api.getStream(streamId!),
    enabled: !!streamId,
  });

  const { data: streamerUser } = useQuery({
    queryKey: ['user', stream?.userId],
    queryFn: () => api.getUser(stream!.userId),
    enabled: !!stream?.userId,
  });

  const { data: gifts } = useQuery({
    queryKey: ['gifts'],
    queryFn: () => api.getGifts(),
  });

  const { data: streamGoals } = useQuery({
    queryKey: ['streamGoals', streamId],
    queryFn: () => api.getStreamGoals(streamId!),
    enabled: !!streamId,
    refetchInterval: 5000,
  });

  const queryClient = useQueryClient();

  const joinVideoMutation = useMutation({
    mutationFn: () => {
      if (!streamId || !user) {
        throw new Error("Not authenticated or stream not found");
      }
      return api.requestJoinVideo(streamId, user.id);
    },
    onSuccess: () => {
      toast({ title: "Join request sent!", description: "Waiting for streamer approval" });
    },
    onError: () => {
      toast({ title: "Failed to send join request", variant: "destructive" });
    },
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!streamId) return;
    
    let reconnectTimeout: NodeJS.Timeout;
    let ws: WebSocket;
    
    const connect = () => {
      ws = createStreamWebSocket(streamId);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'comment') {
            setComments(prev => [...prev.slice(-30), {
              id: message.data.id || Date.now().toString(),
              user: message.data.username || 'User',
              text: message.data.content,
              isGift: message.data.isGift,
            }]);
          } else if (message.type === 'gift') {
            setComments(prev => [...prev.slice(-30), {
              id: Date.now().toString(),
              user: message.data.senderName || 'User',
              text: `sent a gift!`,
              isGift: true,
              gift: message.data.giftEmoji,
            }]);
          } else if (message.type === 'viewer_count') {
            setViewerCount(message.data.count);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        // Attempt reconnection after 3 seconds
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };
    
    connect();
    
    return () => {
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [streamId]);

  // Update viewer count from stream data
  useEffect(() => {
    if (stream) {
      setViewerCount(stream.viewersCount);
      setIsPKMode(stream.isPKBattle);
    }
  }, [stream]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;
    
    const newComment = {
      id: Date.now().toString(),
      user: user.username,
      text: inputValue,
      color: 'text-white'
    };
    
    setComments(prev => [...prev, newComment]);
    
    // Send via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'comment',
        data: { content: inputValue, username: user.username }
      }));
    }
    
    setInputValue("");
  };

  const handleSendGift = async (gift: GiftType) => {
    if (!user || !streamerUser || !streamId) {
      toast({ title: "Please log in to send gifts", variant: "destructive" });
      return;
    }
    
    if ((user.coins || 0) < gift.coinCost) {
      toast({ title: "Not enough coins", description: "Top up to send this gift!", variant: "destructive" });
      return;
    }
    
    setIsSendingGift(true);
    try {
      await api.sendGift({
        giftId: gift.id,
        senderId: user.id,
        receiverId: streamerUser.id,
        streamId: streamId,
        quantity: 1,
        totalCoins: gift.coinCost,
      });
      
      setComments(prev => [...prev, {
        id: Date.now().toString(),
        user: user.username,
        text: `sent ${gift.emoji} ${gift.name}!`,
        isGift: true,
        gift: gift.emoji,
      }]);
      
      toast({ title: `Sent ${gift.emoji} ${gift.name}!` });
      setShowGiftMenu(false);
    } catch (error) {
      toast({ title: "Failed to send gift", description: "Please try again", variant: "destructive" });
    } finally {
      setIsSendingGift(false);
    }
  };

  const handleLike = () => {
    setLikes(prev => prev + 1);
  };

  if (streamLoading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white">Loading stream...</div>
      </div>
    );
  }

  if (!stream && !streamLoading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
        <div className="text-white/50 text-center">
          <p className="text-lg mb-4">Stream not found</p>
          <button 
            onClick={() => setLocation("/")}
            className="bg-primary text-white px-6 py-2 rounded-full"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const displayUser = streamerUser || { 
    username: 'Streamer', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
    level: 1
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Background Video / PK View */}
      {isPKMode ? (
        <PKBattleView streamer={displayUser} currentScore={pkScore} />
      ) : (
        <div className="absolute inset-0 z-0">
          <img 
            src={stream?.thumbnail || displayUser.avatar || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + streamId} 
            alt="Stream" 
            className="w-full h-full object-cover opacity-80"
            data-testid="img-stream-background"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 p-4 pt-6 flex justify-between items-start">
        {/* Streamer Profile */}
        <div className="glass rounded-full p-1 pr-4 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary">
            <img 
              src={displayUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + displayUser.username} 
              className="w-full h-full object-cover" 
              data-testid="img-streamer-avatar"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <h3 className="text-xs font-bold text-white" data-testid="text-streamer-name">
                {displayUser.username}
              </h3>
              {streamerUser && <BadgesDisplay userId={streamerUser.id} size="sm" allowGifting={true} />}
            </div>
            <span className="text-[10px] text-white/80" data-testid="text-viewer-count">
              {viewerCount} viewers
            </span>
          </div>
          <button 
            className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full ml-1 hover:bg-primary/90 transition-colors"
            data-testid="button-follow"
          >
            Follow
          </button>
        </div>

        {/* Viewer List & Close */}
        <div className="flex items-center gap-3">
          {/* Join Video Button */}
          {user && streamerUser && user.id !== streamerUser.id && (
            <button 
              onClick={() => joinVideoMutation.mutate()}
              disabled={joinVideoMutation.isPending}
              className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              data-testid="button-join-video"
            >
              <UserPlus className="w-3 h-3" />
              Join
            </button>
          )}

          {/* PK Toggle Button */}
          <button 
            onClick={() => setIsPKMode(!isPKMode)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-colors",
              isPKMode ? "bg-red-600 text-white animate-pulse" : "bg-white/10 text-white hover:bg-white/20"
            )}
            data-testid="button-pk-mode"
          >
            <Swords className="w-3 h-3" />
            {isPKMode ? "PK LIVE" : "PK Mode"}
          </button>

          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border border-white/20 bg-white/10 backdrop-blur-md overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} className="w-full h-full" />
              </div>
            ))}
          </div>
          <button 
            onClick={() => setLocation("/")}
            className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20"
            data-testid="button-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Coin Goals */}
      {streamGoals && streamGoals.length > 0 && (
        <div className="relative z-10 px-4 space-y-2">
          {streamGoals.filter(g => !g.isCompleted).slice(0, 2).map((goal) => (
            <div key={goal.id} className="glass rounded-xl p-3" data-testid={`goal-${goal.id}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-yellow-400" />
                  <span className="text-white text-sm font-medium">{goal.title}</span>
                </div>
                <span className="text-yellow-400 text-xs font-bold">
                  {goal.currentCoins.toLocaleString()} / {goal.targetCoins.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (goal.currentCoins / goal.targetCoins) * 100)}%` }}
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                />
              </div>
              {goal.rewardDescription && (
                <p className="text-white/50 text-xs mt-1">{goal.rewardDescription}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1" onClick={handleLike} />

      {/* Bottom Interface */}
      <div className="relative z-10 p-4 pb-6">
        {/* Chat Area */}
        <div className="h-48 overflow-y-auto no-scrollbar mb-4 mask-image-gradient">
          <div className="flex flex-col gap-2 justify-end min-h-full">
            {comments.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2 animate-in slide-in-from-left-5 duration-300">
                <div className={cn(
                  "px-3 py-1.5 rounded-2xl backdrop-blur-sm text-sm max-w-[80%]",
                  msg.isGift ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50" : "bg-black/20"
                )}>
                  <span className="font-bold text-white/90 mr-2 opacity-75">{msg.user}:</span>
                  {msg.gift && <span className="mr-1">{msg.gift}</span>}
                  <span className={msg.color || "text-white"}>{msg.text}</span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSend} className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Say something..."
              className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-full py-2.5 pl-4 pr-10 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder:text-white/50"
              data-testid="input-chat"
            />
            <button 
              type="submit" 
              className="absolute right-1 top-1 p-1.5 rounded-full bg-white/10 hover:bg-primary transition-colors"
              data-testid="button-send"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>

          <button 
            onClick={() => setShowSpinWheel(true)}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
            data-testid="button-spin-wheel"
          >
            <Star className="w-5 h-5 text-white" />
          </button>

          <button 
            onClick={() => setShowWishlist(true)}
            className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
            data-testid="button-wishlist"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>

          <button 
            onClick={() => setShowGiftMenu(!showGiftMenu)}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-orange-500/30"
            data-testid="button-gift"
          >
            <Gift className="w-5 h-5 text-white" />
          </button>

          {streamerUser && user && streamerUser.id !== user.id && (
            <CallButton receiverId={streamerUser.id} receiverName={streamerUser.username} coinCost={100} />
          )}

          <button 
            onClick={handleLike}
            className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-pink-500/20 active:scale-95 transition-all"
            data-testid="button-like"
          >
            <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
          </button>
        </div>
      </div>

      {/* Gift Sheet */}
      <AnimatePresence>
        {showGiftMenu && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-3xl p-4 z-50 border-t border-white/10"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white">Send Gift</h3>
              <button onClick={() => setShowGiftMenu(false)} data-testid="button-close-gifts">
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {gifts?.map((gift) => (
                <button 
                  key={gift.id} 
                  onClick={() => handleSendGift(gift)}
                  disabled={isSendingGift}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors",
                    isSendingGift ? "opacity-50 cursor-not-allowed" : "hover:bg-white/5"
                  )}
                  data-testid={`button-gift-${gift.id}`}
                >
                  <span className="text-3xl">{gift.emoji}</span>
                  <span className="text-[10px] text-white/70">{gift.name}</span>
                  <span className="text-[10px] text-yellow-500 font-bold">{gift.coinCost} coins</span>
                </button>
              ))}
            </div>
            {user && (
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-white/50 text-sm">Your balance:</span>
                <span className="text-yellow-500 font-bold">{user.coins?.toLocaleString() || 0} coins</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <SpinWheel 
        isOpen={showSpinWheel} 
        onClose={() => setShowSpinWheel(false)} 
        streamId={streamId}
      />

      {streamerUser && (
        <WishlistPanel 
          isOpen={showWishlist} 
          onClose={() => setShowWishlist(false)} 
          streamerId={streamerUser.id}
        />
      )}
    </div>
  );
}
