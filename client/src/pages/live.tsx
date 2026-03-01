import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { X, Heart, Gift, Send, Share2, Swords, Star, Video, UserPlus, Target, Volume2, VolumeX, RefreshCw, VideoOff, Shield, Crown, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { createStreamWebSocket } from "@/lib/websocket";
import { isAgoraConfigured, ensureAgoraConfigured, joinAsHost, joinAsAudience, leaveChannel, switchCamera, toggleMute } from "@/lib/agora";
import type { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import PKBattleView from "@/components/pk-battle-view";
import SpinWheel from "@/components/spin-wheel";
import WishlistPanel from "@/components/wishlist-panel";
import BadgesDisplay from "@/components/badges-display";
import CallButton from "@/components/call-button";
import ModerationPanel, { UserActionMenu } from "@/components/moderation-panel";
import { useToast } from "@/hooks/use-toast";
import { useGuestCheck } from "@/components/guest-gate";
import type { Gift as GiftType, StreamGoal } from "@shared/schema";

interface Comment {
  id: string;
  userId?: string;
  user: string;
  text: string;
  color?: string;
  isGift?: boolean;
  gift?: string;
}

export default function LiveRoom() {
  const [, params] = useRoute("/live/:id");
  const [, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const { isGuest, requireAccount } = useGuestCheck();
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
  const [chatHidden, setChatHidden] = useState(false);
  const chatSwipeRef = useRef<{ startX: number; startY: number; swiping: boolean }>({ startX: 0, startY: 0, swiping: false });
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
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; username: string } | null>(null);

  const [liveEffects, setLiveEffects] = useState<{
    filter: string | null;
    filterCss: string;
    filterOverlay: string;
    frame: string | null;
    frameData: { border?: string; shadow?: string; emojiSet?: string[]; sizes?: string[]; count?: number; emojis?: any[]; layout?: string; id: string; name: string } | null;
    stickers: { id: string; icon: string; name: string }[];
    stickerPositions: { top?: string; left?: string; right?: string; bottom?: string }[];
    arEffects: { id: string; icon: string; name: string }[];
    arPositions: Record<string, { x: number; y: number }>;
    beauty: { smooth: number; slim: number; eyes: number; brightness: number; contrast: number; lipColor: number };
    beautyOverlay?: string;
  } | null>(null);

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
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });

  const queryClient = useQueryClient();
  
  // Check if current user is the broadcaster (only if they own the stream AND it's live)
  const isBroadcaster = !!(user && stream && user.id === stream.userId && stream.isLive);

  useEffect(() => {
    if (isBroadcaster) {
      try {
        const stored = sessionStorage.getItem('liveEffects');
        if (stored) {
          setLiveEffects(JSON.parse(stored));
        }
      } catch {}
    }
  }, [isBroadcaster]);

  // Check if user is following the streamer
  const { data: followStatus, refetch: refetchFollowStatus } = useQuery({
    queryKey: ['isFollowing', user?.id, stream?.userId],
    queryFn: () => api.isFollowing(user!.id, stream!.userId),
    enabled: !!user && !!stream && !isBroadcaster,
  });

  const isFollowing = followStatus?.isFollowing ?? false;

  // Check if current user can moderate (is host or moderator)
  const { data: modInfo } = useQuery({
    queryKey: ['modInfo', streamId, user?.id],
    queryFn: () => api.getModerationInfo(streamId!, user!.id),
    enabled: !!streamId && !!user,
  });

  const canModerate = isBroadcaster || modInfo?.isModerator;

  const isVipRestricted = !!(stream && (stream.minVipTier > 0 || stream.accessType === "vip"));
  const userVipTier = user?.vipTier || 0;
  const hasVipAccess = isBroadcaster || !isVipRestricted || userVipTier >= (stream?.minVipTier || 1);

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: () => {
      if (!user || !stream) throw new Error("Not authenticated");
      if (isFollowing) {
        return api.unfollowUser(user.id, stream.userId);
      }
      return api.followUser(user.id, stream.userId);
    },
    onSuccess: () => {
      refetchFollowStatus();
      toast({ 
        title: isFollowing ? "Unfollowed" : "Following!", 
        description: isFollowing ? undefined : `You're now following this streamer`
      });
    },
    onError: () => {
      toast({ title: "Failed to update follow status", variant: "destructive" });
    },
  });

  // Track co-hosts (accepted join requests)
  const [coHosts, setCoHosts] = useState<Array<{ id: string; username: string; avatar?: string }>>([]);
  const [joinAccepted, setJoinAccepted] = useState(false);
  const [coHostStream, setCoHostStream] = useState<MediaStream | null>(null);
  const coHostVideoRef = useRef<HTMLVideoElement>(null);

  // Fetch join requests for broadcaster
  const { data: joinRequests, refetch: refetchJoinRequests } = useQuery({
    queryKey: ['joinRequests', streamId],
    queryFn: () => api.getJoinRequests(streamId!),
    enabled: !!streamId && isBroadcaster,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });

  const pendingJoinRequests = joinRequests?.filter(r => r.status === 'pending') || [];

  // Fetch call requests for broadcaster (where they are the receiver)
  const { data: callRequests, refetch: refetchCallRequests } = useQuery({
    queryKey: ['callRequests', user?.id],
    queryFn: () => api.getUserCalls(user!.id),
    enabled: !!user && isBroadcaster,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });

  const pendingCallRequests = callRequests?.filter(r => r.status === 'pending' && r.receiverId === user?.id) || [];

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
    mutationFn: ({ requestId, status, requester }: { requestId: string; status: string; requester?: { id: string; username: string; avatar?: string } }) => {
      return api.updateJoinRequest(requestId, status);
    },
    onSuccess: (_, variables) => {
      if (variables.status === 'accepted' && variables.requester) {
        // Add accepted user as co-host
        setCoHosts(prev => [...prev, variables.requester!]);
        toast({ 
          title: "Co-host added!",
          description: `${variables.requester.username} is now on your stream`,
        });
      } else {
        toast({ 
          title: "Request declined",
        });
      }
      refetchJoinRequests();
    },
    onError: () => {
      toast({ title: "Failed to update request", variant: "destructive" });
    },
  });

  const [showJoinRequests, setShowJoinRequests] = useState(false);

  // Mutation to handle call requests (for broadcaster)
  const handleCallRequestMutation = useMutation({
    mutationFn: ({ callId, status }: { callId: string; status: string }) => {
      return api.updateCall(callId, { status });
    },
    onSuccess: (call, variables) => {
      if (variables.status === 'accepted') {
        toast({ 
          title: "Call accepted!",
          description: "Redirecting to call...",
        });
        // Navigate to private call page
        setLocation(`/private-call/${call.id}`);
      } else {
        toast({ title: "Call declined" });
      }
      refetchCallRequests();
    },
    onError: () => {
      toast({ title: "Failed to update call request", variant: "destructive" });
    },
  });

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
    let isClosing = false; // Flag to prevent reconnection on intentional close
    
    const connect = () => {
      if (isClosing) return; // Don't connect if we're closing
      
      ws = createStreamWebSocket(streamId, { userId: user?.id });
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'comment') {
            const senderId = message.data.userId;
            if (senderId && senderId === user?.id) {
              return;
            }
            setComments(prev => [...prev.slice(-30), {
              id: message.data.id || Date.now().toString(),
              user: message.data.username || message.data.user || 'User',
              userId: senderId,
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
            setViewerCount(message.data.viewerCount);
          } else if (message.type === 'join_request') {
            refetchJoinRequests();
          } else if (message.type === 'join_accepted') {
            if (message.data.userId === user?.id) {
              setJoinAccepted(true);
              toast({ title: "You're in!", description: "The host accepted your request. Turn on your camera to join!" });
            } else if (isBroadcaster) {
              setCoHosts(prev => {
                if (prev.some(c => c.id === message.data.userId)) return prev;
                return [...prev, { id: message.data.userId, username: message.data.username, avatar: message.data.avatar }];
              });
            }
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        // Only attempt reconnection if not intentionally closing
        if (!isClosing) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    };
    
    connect();
    
    return () => {
      isClosing = true; // Set flag to prevent reconnection
      clearTimeout(reconnectTimeout);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
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
    console.log("[Live Page] Stream ID:", streamId);
    console.log("[Live Page] Channel name for Agora:", channelName);
    console.log("[Live Page] Is broadcaster:", isBroadcaster);
    let mounted = true;
    
    // Wait for Agora config to load, then initialize
    const initAgora = async () => {
      const configured = await ensureAgoraConfigured();
      if (!mounted) return;
      
      if (!configured) {
        console.log("[Agora] Not configured, using fallback");
        if (isBroadcaster) {
          startFallbackCamera();
        }
        return;
      }
      
      if (isBroadcaster) {
        // Broadcaster: join as host and publish
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
      } else {
        // Viewer: join as audience and subscribe
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
      }
    };
    
    initAgora();
    
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

  const activateCoHostCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      setCoHostStream(mediaStream);
      setTimeout(() => {
        if (coHostVideoRef.current) {
          coHostVideoRef.current.srcObject = mediaStream;
        }
      }, 100);
      toast({ title: "Camera is live!", description: "You're now visible on the stream" });
    } catch (error: any) {
      console.error("Co-host camera error:", error);
      toast({ title: "Camera access denied", description: "Please allow camera access to join", variant: "destructive" });
    }
  };

  const deactivateCoHostCamera = () => {
    if (coHostStream) {
      coHostStream.getTracks().forEach(track => track.stop());
      setCoHostStream(null);
    }
    setJoinAccepted(false);
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

  
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) { requireAccount(); return; }
    if (!inputValue.trim() || !user || !streamId) return;
    
    const messageText = inputValue;
    setInputValue("");
    
    try {
      // Send via API (includes moderation checks: slow mode, mute, ban)
      await api.postStreamComment(streamId, {
        userId: user.id,
        text: messageText,
      });
      
      const newComment = {
        id: Date.now().toString(),
        userId: user.id,
        user: user.username,
        text: messageText,
        color: 'text-white'
      };
      
      setComments(prev => [...prev, newComment]);
    } catch (error: any) {
      toast({ 
        title: "Couldn't send message", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
      setInputValue(messageText); // Restore message if failed
    }
  };

  const handleSendGift = async (gift: GiftType) => {
    if (isGuest) { requireAccount(); return; }
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
      
      // Update user's coin balance locally
      setUser({
        ...user,
        coins: (user.coins || 0) - gift.coinCost
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
    if (isGuest) { requireAccount(); return; }
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

  // Handle closing/leaving the stream
  const handleClose = async () => {
    if (isBroadcaster && streamId && user) {
      try {
        // End the stream when broadcaster leaves
        await api.endStream(streamId, user.id);
        toast({ title: "Stream ended" });
      } catch (error) {
        console.error("Failed to end stream:", error);
      }
    }
    setLocation("/");
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
                      style={liveEffects?.filterCss && liveEffects.filterCss !== "none" ? { filter: liveEffects.filterCss, transition: "filter 0.4s ease" } : undefined}
                      data-testid="video-broadcaster"
                    />
                  )}
                  {liveEffects?.filterOverlay && (
                    <div className="absolute inset-0 pointer-events-none z-[2]" style={{ backgroundColor: liveEffects.filterOverlay }} />
                  )}
                  {liveEffects?.beautyOverlay && (
                    <div className="absolute inset-0 pointer-events-none z-[2]" style={{ backgroundColor: liveEffects.beautyOverlay }} />
                  )}
                  {liveEffects?.frameData && liveEffects.frameData.id !== "none" && (
                    <>
                      <div className="absolute inset-0 pointer-events-none z-[3]" style={{
                        border: liveEffects.frameData.border,
                        boxShadow: liveEffects.frameData.shadow,
                        ...(liveEffects.frameData.id === "rainbow" ? { borderImage: "linear-gradient(135deg, #ff0000, #ff7700, #ffff00, #00ff00, #0077ff, #8b00ff) 1" } : {}),
                      }} />
                      {liveEffects.frameData.emojiSet && (() => {
                        const count = liveEffects.frameData!.count || 20;
                        const emojiSet = liveEffects.frameData!.emojiSet!;
                        const sizes = liveEffects.frameData!.sizes || ["text-lg"];
                        const positions: { top?: string; left?: string; right?: string; bottom?: string }[] = [];
                        const topCount = Math.ceil(count * 0.28);
                        const rightCount = Math.ceil(count * 0.22);
                        const bottomCount = Math.ceil(count * 0.28);
                        const leftCount = count - topCount - rightCount - bottomCount;
                        for (let i = 0; i < topCount; i++) positions.push({ top: '1%', left: `${(i / (topCount - 1)) * 92 + 2}%` });
                        for (let i = 0; i < rightCount; i++) positions.push({ top: `${(i / (rightCount + 1)) * 85 + 8}%`, right: '1%' });
                        for (let i = 0; i < bottomCount; i++) positions.push({ bottom: '1%', left: `${((bottomCount - 1 - i) / (bottomCount - 1)) * 92 + 2}%` });
                        for (let i = 0; i < leftCount; i++) positions.push({ top: `${((leftCount - 1 - i) / (leftCount + 1)) * 85 + 8}%`, left: '1%' });
                        return positions.map((pos, i) => (
                          <span key={i} className={`absolute pointer-events-none z-[4] ${sizes[i % sizes.length]} animate-pulse drop-shadow-md`} style={{ ...pos, animationDelay: `${i * 0.15}s`, opacity: 0.9, transform: 'translate(-50%, -50%)' }}>{emojiSet[i % emojiSet.length]}</span>
                        ));
                      })()}
                    </>
                  )}
                  {liveEffects?.stickers && liveEffects.stickers.length > 0 && liveEffects.stickers.map((sticker, i) => {
                    const positions = [
                      { top: '8%', left: '8%' }, { top: '8%', right: '8%' },
                      { bottom: '12%', left: '8%' }, { bottom: '12%', right: '8%' },
                      { top: '25%', left: '50%' }, { top: '40%', right: '12%' },
                      { bottom: '30%', left: '12%' }, { top: '15%', left: '30%' },
                      { bottom: '25%', right: '25%' }, { top: '50%', left: '5%' },
                      { bottom: '40%', right: '5%' }, { top: '35%', left: '25%' },
                    ];
                    return (
                      <span key={sticker.id} className="absolute pointer-events-none z-[5] text-3xl drop-shadow-lg" style={{ ...positions[i % positions.length], animation: `float ${2 + (i % 3)}s ease-in-out infinite`, animationDelay: `${i * 0.5}s` }}>{sticker.icon}</span>
                    );
                  })}
                  {liveEffects?.arEffects && liveEffects.arEffects.length > 0 && liveEffects.arEffects.map((ar) => {
                    const pos = liveEffects.arPositions?.[ar.id] || { x: 50, y: 50 };
                    return (
                      <div key={ar.id} className="absolute z-[6] pointer-events-none" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}>
                        <span className="text-5xl drop-shadow-2xl block" style={{ animation: 'float 3s ease-in-out infinite' }}>{ar.icon}</span>
                      </div>
                    );
                  })}
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
                className="absolute top-24 right-4 z-20 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-white/20"
                data-testid="button-flip-camera"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              {/* Co-host Overlays - Floating windows for accepted join requests */}
              {coHosts.length > 0 && (
                <div className="absolute bottom-32 right-4 z-30 flex flex-col gap-2">
                  {coHosts.map((coHost, index) => (
                    <motion.div
                      key={coHost.id}
                      initial={{ opacity: 0, scale: 0.8, x: 50 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: 50 }}
                      className="relative w-24 h-32 rounded-xl overflow-hidden border-2 border-pink-500 shadow-lg bg-black"
                      data-testid={`cohost-${coHost.id}`}
                    >
                      <img 
                        src={coHost.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${coHost.username}`}
                        className="w-full h-full object-cover"
                        alt={coHost.username}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                        <span className="text-white text-[10px] font-bold truncate block">{coHost.username}</span>
                      </div>
                      <div className="absolute top-1 left-1 bg-green-500 rounded-full w-2 h-2 animate-pulse" />
                      <button
                        onClick={() => setCoHosts(prev => prev.filter(c => c.id !== coHost.id))}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500/80 flex items-center justify-center text-white text-[8px] hover:bg-red-500"
                      >
                        ✕
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          ) : !hasVipAccess ? (
            <div className="w-full h-full relative">
              <img 
                src={stream?.thumbnail || displayUser.avatar || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + streamId} 
                alt="Stream" 
                className="w-full h-full object-cover"
                data-testid="img-vip-thumbnail"
              />
              <div className="absolute inset-0 bg-black/70 " />
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center px-6 max-w-sm">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-yellow-500/30">
                    <Crown className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-xl mb-2" data-testid="text-vip-title">VIP Stream</h3>
                  <p className="text-white/60 text-sm mb-1">{displayUser.displayName || displayUser.username} requires</p>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="flex gap-1">
                      {Array.from({ length: stream?.minVipTier || 1 }).map((_, i) => (
                        <Crown key={i} className="w-4 h-4 text-yellow-400" />
                      ))}
                    </div>
                    <span className="text-yellow-400 font-bold text-sm">VIP Tier {stream?.minVipTier || 1}+</span>
                  </div>
                  {userVipTier > 0 ? (
                    <p className="text-white/50 text-xs mb-4">Your current tier: <span className="text-yellow-400 font-bold">{userVipTier}</span> — you need tier {stream?.minVipTier} to watch</p>
                  ) : (
                    <p className="text-white/50 text-xs mb-4">Upgrade to VIP to unlock this stream and other exclusive content</p>
                  )}
                  <button 
                    onClick={() => setLocation('/coins')} 
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold text-sm shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 transition-all"
                    data-testid="button-upgrade-vip"
                  >
                    Upgrade VIP Membership
                  </button>
                  <button 
                    onClick={handleClose} 
                    className="w-full py-2.5 mt-2 rounded-xl bg-white/10 text-white/60 text-sm hover:bg-white/15 transition-all"
                    data-testid="button-vip-go-back"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
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
                      <div className="text-center px-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
                          <span className="text-2xl">🎬</span>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">You're Connected!</h3>
                        <p className="text-white/70 text-sm">Loading the live stream...</p>
                        <p className="text-white/50 text-xs mt-2">Video will appear when the host starts broadcasting</p>
                      </div>
                    </div>
                  )}
                  {isAgoraConfigured() && !agoraConnected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center px-6">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white/70">Joining the stream...</p>
                      </div>
                    </div>
                  )}
                  {!isAgoraConfigured() && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center px-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl">📺</span>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Stream Preview</h3>
                        <p className="text-white/70 text-sm">Live video is not available right now</p>
                        <p className="text-white/50 text-xs mt-2">You can still chat and send gifts!</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {/* Co-host panel for accepted viewer */}
          {!isBroadcaster && joinAccepted && (
            <div className="absolute bottom-32 right-4 z-30 flex flex-col items-end gap-2">
              {coHostStream ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 50 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  className="relative w-28 h-36 rounded-xl overflow-hidden border-2 border-green-500 shadow-lg bg-black"
                  data-testid="cohost-self-video"
                >
                  <video
                    ref={coHostVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                    <span className="text-white text-[10px] font-bold">You (Live)</span>
                  </div>
                  <div className="absolute top-1 left-1 bg-green-500 rounded-full w-2 h-2 animate-pulse" />
                  <button
                    onClick={deactivateCoHostCamera}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-500"
                    data-testid="button-leave-cohost"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-4 shadow-2xl max-w-[200px]"
                  data-testid="cohost-join-prompt"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-white font-bold text-sm mb-1">You're Accepted!</p>
                    <p className="text-white/70 text-[10px] mb-3">Turn on your camera to join the stream</p>
                    <button
                      onClick={activateCoHostCamera}
                      className="w-full py-2 rounded-xl bg-white text-green-700 font-bold text-xs hover:bg-white/90 transition-colors"
                      data-testid="button-activate-camera"
                    >
                      Go Live
                    </button>
                    <button
                      onClick={() => setJoinAccepted(false)}
                      className="w-full py-1.5 mt-1 rounded-xl text-white/60 text-[10px] hover:text-white/80 transition-colors"
                      data-testid="button-decline-cohost"
                    >
                      Not now
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
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
              onClick={() => { if (isGuest) { requireAccount(); return; } followMutation.mutate(); }}
              disabled={followMutation.isPending}
              className={cn(
                "text-[10px] font-bold px-3 py-1 rounded-full ml-1 transition-colors disabled:opacity-50",
                isFollowing 
                  ? "bg-white/20 text-white hover:bg-white/30" 
                  : "bg-primary text-white hover:bg-primary/90"
              )}
              data-testid="button-follow"
            >
              {followMutation.isPending ? "..." : isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Viewer List & Close */}
        <div className="flex items-center gap-3">
          {/* Requests Button (for broadcaster only) */}
          {isBroadcaster && (
            <button 
              onClick={() => setShowJoinRequests(!showJoinRequests)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-colors relative",
                (pendingJoinRequests.length > 0 || pendingCallRequests.length > 0)
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white animate-pulse" 
                  : "bg-white/10 text-white hover:bg-white/20"
              )}
              data-testid="button-join-requests"
            >
              <UserPlus className="w-3 h-3" />
              Requests
              {(pendingJoinRequests.length + pendingCallRequests.length) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
                  {pendingJoinRequests.length + pendingCallRequests.length}
                </span>
              )}
            </button>
          )}

          {/* Join Video Button (for viewers only) */}
          {user && streamerUser && user.id !== streamerUser.id && (
            <button 
              onClick={() => { if (isGuest) { requireAccount(); return; } joinVideoMutation.mutate(); }}
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
              <div key={i} className="w-8 h-8 rounded-full border border-white/20 bg-white/10 overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} className="w-full h-full" />
              </div>
            ))}
          </div>
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="w-8 h-8 rounded-full bg-black/20  flex items-center justify-center text-white hover:bg-white/20"
            data-testid="button-mute"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          {canModerate && (
            <button 
              onClick={() => setShowModerationPanel(true)}
              className="w-8 h-8 rounded-full bg-black/20  flex items-center justify-center text-primary hover:bg-white/20"
              data-testid="button-moderation"
            >
              <Shield className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-black/20  flex items-center justify-center text-white hover:bg-white/20"
            data-testid="button-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Requests Panel (for broadcaster) - Join Requests & Call Requests */}
      <AnimatePresence>
        {showJoinRequests && isBroadcaster && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-20 mx-4 mb-3"
          >
            <div className="glass rounded-xl p-3 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-bold text-sm">Requests</h4>
                <button 
                  onClick={() => setShowJoinRequests(false)}
                  className="text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Call Requests Section */}
              {pendingCallRequests.length > 0 && (
                <div className="mb-3">
                  <p className="text-pink-400 text-xs font-bold mb-2 flex items-center gap-1">
                    <Video className="w-3 h-3" /> Private Call Requests
                  </p>
                  <div className="space-y-2">
                    {pendingCallRequests.map((call: any) => (
                      <div key={call.id} className="flex items-center justify-between bg-pink-500/10 border border-pink-500/30 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <img 
                            src={call.caller?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${call.callerId}`}
                            className="w-8 h-8 rounded-full ring-2 ring-pink-500"
                            alt="Caller avatar"
                          />
                          <div>
                            <span className="text-white text-sm font-medium block">
                              {call.caller?.username || 'User'}
                            </span>
                            <span className="text-yellow-400 text-xs">{call.coinCost} coins</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCallRequestMutation.mutate({ callId: call.id, status: 'accepted' })}
                            disabled={handleCallRequestMutation.isPending}
                            className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full hover:bg-green-600 transition-colors disabled:opacity-50"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleCallRequestMutation.mutate({ callId: call.id, status: 'declined' })}
                            disabled={handleCallRequestMutation.isPending}
                            className="px-3 py-1 bg-red-500/50 text-white text-xs font-bold rounded-full hover:bg-red-500 transition-colors disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Join Requests Section */}
              {pendingJoinRequests.length > 0 && (
                <div>
                  <p className="text-blue-400 text-xs font-bold mb-2 flex items-center gap-1">
                    <UserPlus className="w-3 h-3" /> Join Stream Requests
                  </p>
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
                            onClick={() => handleJoinRequestMutation.mutate({ 
                              requestId: request.id, 
                              status: 'accepted',
                              requester: {
                                id: request.userId,
                                username: request.user?.username || 'User',
                                avatar: request.user?.avatar || undefined
                              }
                            })}
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
                </div>
              )}
              
              {/* No pending requests */}
              {pendingJoinRequests.length === 0 && pendingCallRequests.length === 0 && (
                <p className="text-white/50 text-sm text-center py-2">No pending requests</p>
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

      {/* Chat & Controls Area - Swipeable */}
      <div
        className="relative z-10 transition-transform duration-300 ease-out"
        style={{ transform: chatHidden ? 'translateX(100%)' : 'translateX(0)' }}
        onTouchStart={(e) => {
          chatSwipeRef.current.startX = e.touches[0].clientX;
          chatSwipeRef.current.startY = e.touches[0].clientY;
          chatSwipeRef.current.swiping = false;
        }}
        onTouchMove={(e) => {
          const dx = e.touches[0].clientX - chatSwipeRef.current.startX;
          const dy = Math.abs(e.touches[0].clientY - chatSwipeRef.current.startY);
          if (Math.abs(dx) > 20 && Math.abs(dx) > dy) {
            chatSwipeRef.current.swiping = true;
          }
        }}
        onTouchEnd={(e) => {
          if (!chatSwipeRef.current.swiping) return;
          const dx = e.changedTouches[0].clientX - chatSwipeRef.current.startX;
          if (dx > 60) setChatHidden(true);
          if (dx < -60) setChatHidden(false);
        }}
        data-testid="chat-swipeable-area"
      >
        {/* Slow Mode Indicator */}
        <div className="px-4 pb-2">
          {stream?.slowModeSeconds ? (
            <div className="flex items-center gap-1 text-xs text-yellow-400 mb-1">
              <span>Slow mode: {stream.slowModeSeconds}s</span>
            </div>
          ) : null}
          
          <div className="h-40 overflow-y-auto no-scrollbar mask-image-gradient">
            <div className="flex flex-col gap-2 justify-end min-h-full">
              {comments.map((msg) => (
                <div key={msg.id} className="flex items-start gap-2 animate-in slide-in-from-left-5 duration-300">
                  <div className={cn(
                    "px-3 py-1.5 rounded-2xl text-sm max-w-[85%]",
                    msg.isGift ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50" : "bg-black/30"
                  )}>
                    <span 
                      className={cn(
                        "font-bold mr-2",
                        canModerate && msg.userId && msg.userId !== stream?.userId ? "text-white/90 cursor-pointer hover:text-primary" : "text-white/90"
                      )}
                      onClick={() => {
                        if (canModerate && msg.userId && msg.userId !== stream?.userId) {
                          setSelectedUser({ userId: msg.userId, username: msg.user });
                        }
                      }}
                    >
                      {msg.user}:
                    </span>
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
                      className="w-full bg-black/40  border border-white/10 rounded-full py-2.5 pl-4 pr-10 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder:text-white/50"
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
                  onClick={() => { if (isGuest) { requireAccount(); return; } setShowSpinWheel(true); }}
                  className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
                  data-testid="button-spin-wheel"
                >
                  <Star className="w-5 h-5 text-white" />
                </button>

                <button 
                  onClick={() => { if (isGuest) { requireAccount(); return; } setShowWishlist(true); }}
                  className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
                  data-testid="button-wishlist"
                >
                  <Share2 className="w-5 h-5 text-white" />
                </button>

                <button 
                  onClick={() => { if (isGuest) { requireAccount(); return; } setShowGiftMenu(!showGiftMenu); }}
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
      </div>

      {/* Swipe hint when chat is hidden */}
      {chatHidden && (
        <div 
          className="absolute bottom-24 left-2 z-20 flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white/60 text-xs animate-pulse cursor-pointer"
          onClick={() => setChatHidden(false)}
          onTouchStart={(e) => {
            chatSwipeRef.current.startX = e.touches[0].clientX;
            chatSwipeRef.current.startY = e.touches[0].clientY;
            chatSwipeRef.current.swiping = false;
          }}
          onTouchMove={(e) => {
            const dx = e.touches[0].clientX - chatSwipeRef.current.startX;
            const dy = Math.abs(e.touches[0].clientY - chatSwipeRef.current.startY);
            if (Math.abs(dx) > 20 && Math.abs(dx) > dy) chatSwipeRef.current.swiping = true;
          }}
          onTouchEnd={(e) => {
            if (!chatSwipeRef.current.swiping) return;
            const dx = e.changedTouches[0].clientX - chatSwipeRef.current.startX;
            if (dx < -60) setChatHidden(false);
          }}
          data-testid="chat-swipe-hint"
        >
          ← Swipe to show chat
        </div>
      )}

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

      {/* Moderation Panel */}
      <AnimatePresence>
        {showModerationPanel && stream && user && (
          <ModerationPanel
            streamId={stream.id}
            hostId={stream.userId}
            currentUserId={user.id}
            onClose={() => setShowModerationPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* User Action Menu (when tapping on a username in chat) */}
      <AnimatePresence>
        {selectedUser && stream && user && (
          <UserActionMenu
            streamId={stream.id}
            targetUserId={selectedUser.userId}
            targetUsername={selectedUser.username}
            hostId={stream.userId}
            currentUserId={user.id}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
