import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { X, Heart, Gift, Send, Share2, Swords, Star, Video, UserPlus, Target, Volume2, VolumeX, RefreshCw, VideoOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { createStreamWebSocket } from "@/lib/websocket";
import { isAgoraConfigured, joinAsHost, joinAsAudience, leaveChannel, switchCamera, toggleMute } from "@/lib/agora";
import type { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
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
  
  const [comments, setComments] = useState<Comment[]>([
    { id: 'welcome', user: 'IgnytLIVE', text: 'Welcome to the stream! 🎉', color: 'text-pink-400' }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [likes, setLikes] = useState(0);
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isPKMode, setIsPKMode] = useState(false);
  const [pkScore, setPkScore] = useState(15000);
  const [viewerCount, setViewerCount] = useState(0);
  const [isSendingGift, setIsSendingGift] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [agoraConnected, setAgoraConnected] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [agoraError, setAgoraError] = useState<string | null>(null);

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
  
  // Check if current user is the broadcaster (computed early for query dependencies)
  const isBroadcaster = !!(user && stream && user.id === stream.userId);

  // Fetch join requests for broadcaster
  const { data: joinRequests, refetch: refetchJoinRequests } = useQuery({
    queryKey: ['joinRequests', streamId],
    queryFn: () => api.getJoinRequests(streamId!),
    enabled: !!streamId && isBroadcaster,
    refetchInterval: 3000,
  });

  const pendingJoinRequests = joinRequests?.filter(r => r.status === 'pending') || [];

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

  // Mutation to handle join requests (for broadcaster)
  const handleJoinRequestMutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: string }) => {
      return api.updateJoinRequest(requestId, status);
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: variables.status === 'accepted' ? "Request accepted!" : "Request declined",
        description: variables.status === 'accepted' ? "User can now join your stream" : undefined,
      });
      refetchJoinRequests();
    },
    onError: () => {
      toast({ title: "Failed to update request", variant: "destructive" });
    },
  });

  const [showJoinRequests, setShowJoinRequests] = useState(false);

  // Mutation to toggle PK battle mode (for broadcaster)
  const togglePKMutation = useMutation({
    mutationFn: (newPKState: boolean) => {
      if (!streamId || !user) throw new Error("No stream ID or user");
      return api.togglePKBattle(streamId, newPKState, user.id);
    },
    onSuccess: (_, newPKState) => {
      setIsPKMode(newPKState);
      queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
      toast({ 
        title: newPKState ? "PK Battle started!" : "PK Battle ended",
        description: newPKState ? "You're now in battle mode - viewers can send gifts to boost your score!" : undefined,
      });
    },
    onError: () => {
      toast({ title: "Failed to toggle PK battle", variant: "destructive" });
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
            // Skip if this comment is from the current user (we already added it locally)
            const currentUsername = user?.username;
            if (message.data.username === currentUsername) {
              return; // Skip to avoid duplicates
            }
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
          } else if (message.type === 'join_request') {
            // Refresh join requests when a new one comes in
            refetchJoinRequests();
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

  // Agora connection for real-time streaming
  useEffect(() => {
    if (!streamId || !stream) return;
    
    const channelName = `stream_${streamId}`;
    let mounted = true;
    
    if (isAgoraConfigured()) {
      if (isBroadcaster) {
        // Broadcaster: join as host and publish
        const startBroadcast = async () => {
          // Wait a tick for refs to be available
          await new Promise(resolve => setTimeout(resolve, 100));
          if (!mounted) return;
          
          try {
            const container = localVideoRef.current;
            console.log("Starting Agora broadcast, container:", container);
            await joinAsHost(channelName, container);
            if (mounted) {
              setAgoraConnected(true);
              setAgoraError(null);
              console.log("Broadcasting via Agora");
            }
          } catch (error: any) {
            console.error("Agora broadcast error:", error);
            if (mounted) {
              setAgoraError(error.message || "Failed to start broadcast");
              startFallbackCamera();
            }
          }
        };
        startBroadcast();
      } else {
        // Viewer: join as audience and subscribe
        const startViewing = async () => {
          // Wait a tick for refs to be available
          await new Promise(resolve => setTimeout(resolve, 100));
          if (!mounted) return;
          
          try {
            await joinAsAudience(
              channelName,
              (user: IAgoraRTCRemoteUser, mediaType) => {
                console.log("Remote user published:", user.uid, mediaType);
                if (mediaType === "video" && remoteVideoRef.current) {
                  user.videoTrack?.play(remoteVideoRef.current);
                  setHasRemoteVideo(true);
                }
                if (mediaType === "audio") {
                  user.audioTrack?.play();
                }
              },
              (user: IAgoraRTCRemoteUser, mediaType) => {
                console.log("Remote user unpublished:", user.uid, mediaType);
                if (mediaType === "video") {
                  setHasRemoteVideo(false);
                }
              }
            );
            if (mounted) {
              setAgoraConnected(true);
              setAgoraError(null);
              console.log("Viewing via Agora");
            }
          } catch (error: any) {
            console.error("Agora view error:", error);
            if (mounted) {
              setAgoraError(error.message || "Failed to connect to stream");
            }
          }
        };
        startViewing();
      }
    } else {
      // Fallback to local camera for broadcaster if Agora not configured
      if (isBroadcaster) {
        startFallbackCamera();
      }
    }
    
    return () => {
      mounted = false;
      leaveChannel().catch(console.error);
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [streamId, stream, isBroadcaster]);

  // Fallback camera for when Agora isn't configured
  const startFallbackCamera = async () => {
    if (!isBroadcaster) return;
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      
      setCameraStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraError(null);
    } catch (error: any) {
      console.error("Camera error:", error);
      if (error.name === "NotAllowedError") {
        setCameraError("Camera access denied");
      } else if (error.name === "NotFoundError") {
        setCameraError("No camera found");
      } else {
        setCameraError("Unable to access camera");
      }
    }
  };

  const flipCamera = async () => {
    if (isAgoraConfigured() && agoraConnected) {
      await switchCamera();
    } else {
      setFacingMode(prev => prev === "user" ? "environment" : "user");
      startFallbackCamera();
    }
  };

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // Simulate bot chat activity for demo streams
  useEffect(() => {
    if (!stream || !streamerUser || isBroadcaster) return;
    
    const botMessages = [
      "🔥🔥🔥",
      "Love this stream!",
      "Amazing content!",
      "You're so talented!",
      "❤️❤️❤️",
      "First time here, following!",
      "Best streamer ever!",
      "Can you say hi to me?",
      "Where are you from?",
      "Love from Brazil! 🇧🇷",
      "Hello from India! 🇮🇳",
      "Keep it up! 💪",
      "This is so cool!",
      "👏👏👏",
      "You're amazing!",
      "Sending love! 💖",
      "Been watching for hours!",
      "Can't stop watching!",
      "This stream is lit! 🔥",
    ];
    
    const botNames = ["Emily_Star", "GameFan2024", "Luna_Moon", "SkyWatcher", "NightOwl99", "CoolVibes", "StreamLover", "HappyFan", "MusicKing", "DanceQueen"];
    
    const interval = setInterval(() => {
      const randomMsg = botMessages[Math.floor(Math.random() * botMessages.length)];
      const randomName = botNames[Math.floor(Math.random() * botNames.length)];
      
      setComments(prev => [...prev.slice(-25), {
        id: Date.now().toString(),
        user: randomName,
        text: randomMsg,
        color: 'text-white'
      }]);
    }, 3000 + Math.random() * 4000);
    
    return () => clearInterval(interval);
  }, [stream, streamerUser, isBroadcaster]);

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
          {isBroadcaster ? (
            <>
              {cameraError || agoraError ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black">
                  <VideoOff className="w-16 h-16 text-red-400 mb-4" />
                  <p className="text-white/70">{cameraError || agoraError}</p>
                  <button 
                    onClick={startFallbackCamera}
                    className="mt-4 px-6 py-2 bg-primary rounded-full text-white"
                  >
                    Retry Camera
                  </button>
                </div>
              ) : (
                <>
                  {/* Agora video container - always rendered so ref is available */}
                  <div 
                    ref={localVideoRef}
                    className={`w-full h-full absolute inset-0 [&>div]:w-full [&>div]:h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover ${isAgoraConfigured() ? '' : 'hidden'}`}
                    data-testid="video-broadcaster-agora"
                  />
                  {/* Fallback video - shown when Agora not configured */}
                  {!isAgoraConfigured() && (
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline 
                      muted 
                      className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                      data-testid="video-broadcaster"
                    />
                  )}
                  {/* Loading state while Agora connects */}
                  {isAgoraConfigured() && !agoraConnected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white/70">Starting camera...</p>
                      </div>
                    </div>
                  )}
                </>
              )}
              <button
                onClick={flipCamera}
                className="absolute top-24 right-4 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20"
                data-testid="button-flip-camera"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              {/* Agora remote video container - always rendered */}
              <div 
                ref={remoteVideoRef}
                className={`w-full h-full absolute inset-0 [&>div]:w-full [&>div]:h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover ${hasRemoteVideo ? '' : 'hidden'}`}
                data-testid="video-viewer-agora"
              />
              {/* Fallback/placeholder when no remote video */}
              {!hasRemoteVideo && (
                <div className="w-full h-full relative">
                  <img 
                    src={stream?.thumbnail || displayUser.avatar || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + streamId} 
                    alt="Stream" 
                    className="w-full h-full object-cover opacity-80"
                    data-testid="img-stream-background"
                  />
                  {isAgoraConfigured() && agoraConnected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white/70">Waiting for broadcaster...</p>
                      </div>
                    </div>
                  )}
                  {isAgoraConfigured() && !agoraConnected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white/70">Connecting...</p>
                      </div>
                    </div>
                  )}
                  {!isAgoraConfigured() && (
                    <div className="absolute bottom-24 left-0 right-0 flex justify-center">
                      <div className="glass px-4 py-2 rounded-full text-sm text-white/70">
                        Live streaming not configured
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 pointer-events-none" />
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
          {!isBroadcaster && (
            <button 
              className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full ml-1 hover:bg-primary/90 transition-colors"
              data-testid="button-follow"
            >
              Follow
            </button>
          )}
        </div>

        {/* Viewer List & Close */}
        <div className="flex items-center gap-3">
          {/* Join Requests Button (for broadcaster only) */}
          {isBroadcaster && (
            <button 
              onClick={() => setShowJoinRequests(!showJoinRequests)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-colors relative",
                pendingJoinRequests.length > 0 
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white animate-pulse" 
                  : "bg-white/10 text-white hover:bg-white/20"
              )}
              data-testid="button-join-requests"
            >
              <UserPlus className="w-3 h-3" />
              Requests
              {pendingJoinRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
                  {pendingJoinRequests.length}
                </span>
              )}
            </button>
          )}

          {/* Join Video Button (for viewers only) */}
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

          {/* PK Toggle Button (for broadcaster only) */}
          {isBroadcaster && (
            <button 
              onClick={() => togglePKMutation.mutate(!isPKMode)}
              disabled={togglePKMutation.isPending}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-colors",
                isPKMode ? "bg-red-600 text-white animate-pulse" : "bg-white/10 text-white hover:bg-white/20",
                togglePKMutation.isPending && "opacity-50"
              )}
              data-testid="button-pk-mode"
            >
              <Swords className="w-3 h-3" />
              {togglePKMutation.isPending ? "..." : isPKMode ? "End PK" : "Start PK"}
            </button>
          )}

          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border border-white/20 bg-white/10 backdrop-blur-md overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} className="w-full h-full" />
              </div>
            ))}
          </div>
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20"
            data-testid="button-mute"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setLocation("/")}
            className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20"
            data-testid="button-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Join Requests Panel (for broadcaster) */}
      <AnimatePresence>
        {showJoinRequests && isBroadcaster && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-20 mx-4 mb-3"
          >
            <div className="glass rounded-xl p-3 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-bold text-sm">Join Requests</h4>
                <button 
                  onClick={() => setShowJoinRequests(false)}
                  className="text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {pendingJoinRequests.length === 0 ? (
                <p className="text-white/50 text-sm text-center py-2">No pending requests</p>
              ) : (
                <div className="space-y-2">
                  {pendingJoinRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <img 
                          src={request.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.userId}`}
                          className="w-8 h-8 rounded-full"
                          alt="User avatar"
                        />
                        <span className="text-white text-sm font-medium">
                          {request.user?.username || 'User'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleJoinRequestMutation.mutate({ requestId: request.id, status: 'accepted' })}
                          disabled={handleJoinRequestMutation.isPending}
                          className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleJoinRequestMutation.mutate({ requestId: request.id, status: 'rejected' })}
                          disabled={handleJoinRequestMutation.isPending}
                          className="px-3 py-1 bg-red-500/50 text-white text-xs font-bold rounded-full hover:bg-red-500 transition-colors disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Main Content Area - Tap to toggle overlay */}
      <div 
        className="flex-1" 
        onClick={() => setShowOverlay(!showOverlay)}
        data-testid="area-stream-tap"
      />

      {/* Chat Area - Always visible */}
      <div className="relative z-10 px-4 pb-2">
        <div className="h-40 overflow-y-auto no-scrollbar mask-image-gradient">
          <div className="flex flex-col gap-2 justify-end min-h-full">
            {comments.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2 animate-in slide-in-from-left-5 duration-300">
                <div className={cn(
                  "px-3 py-1.5 rounded-2xl backdrop-blur-sm text-sm max-w-[85%]",
                  msg.isGift ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50" : "bg-black/30"
                )}>
                  <span className="font-bold text-white/90 mr-2">{msg.user}:</span>
                  {msg.gift && <span className="mr-1">{msg.gift}</span>}
                  <span className={msg.color || "text-white"}>{msg.text}</span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* Overlay Elements - Hidden when tapped */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative z-10"
          >
            {/* Quick Gift Bar */}
            <div className="px-4 pb-2">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                {gifts?.slice(0, 7).map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => handleSendGift(gift)}
                    disabled={isSendingGift}
                    className="flex flex-col items-center min-w-[50px] hover:scale-110 transition-transform disabled:opacity-50"
                    data-testid={`quick-gift-${gift.id}`}
                  >
                    <span className="text-2xl">{gift.emoji}</span>
                    <span className="text-[9px] text-yellow-400 font-bold">{gift.coinCost}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Interface */}
            <div className="p-4 pt-0 pb-6">
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
          </motion.div>
        )}
      </AnimatePresence>

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
