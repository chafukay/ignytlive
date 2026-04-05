import { Link } from "wouter";
import type { Stream, User } from "@shared/schema";
import { Eye, Swords, Video, Volume2, VolumeX } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import AgoraRTC, { IAgoraRTCRemoteUser, IRemoteVideoTrack, IRemoteAudioTrack } from "agora-rtc-sdk-ng";
import { getServerUrl } from "@/lib/capacitor";

interface StreamCardProps {
  stream: Stream & { user: User };
  rank?: number;
}

export default function StreamCard({ stream, rank }: StreamCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [hasPreview, setHasPreview] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<ReturnType<typeof AgoraRTC.createClient> | null>(null);
  const remoteVideoRef = useRef<IRemoteVideoTrack | null>(null);
  const remoteAudioRef = useRef<IRemoteAudioTrack | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);

  const formatViewers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDiamonds = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const loadPreview = async () => {
    if (!stream.isLive || isConnectingRef.current) return;
    
    const channelName = `stream_${stream.id}`;
    isConnectingRef.current = true;
    setIsPreviewLoading(true);
    
    try {
      const configRes = await fetch(`${getServerUrl()}/api/agora/config`);
      const config = await configRes.json();
      
      if (!config.configured || !config.appId) {
        setIsPreviewLoading(false);
        isConnectingRef.current = false;
        return;
      }

      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      clientRef.current = client;
      
      await client.setClientRole("audience");
      
      const tokenRes = await fetch(`${getServerUrl()}/api/agora/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName,
          uid: Math.floor(Math.random() * 100000) + 200000,
          role: 'audience'
        })
      });
      
      const { token, uid } = await tokenRes.json();
      
      client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
        try {
          await client.subscribe(user, mediaType);
          
          if (mediaType === "video" && user.videoTrack) {
            remoteVideoRef.current = user.videoTrack;
            if (videoContainerRef.current) {
              user.videoTrack.play(videoContainerRef.current, { fit: "cover" });
              setHasPreview(true);
              setIsPreviewLoading(false);
            }
          }
          
          if (mediaType === "audio" && user.audioTrack) {
            remoteAudioRef.current = user.audioTrack;
          }
        } catch (err) {
          console.error("[StreamCard Preview] Subscribe error:", err);
        }
      });

      client.on("user-unpublished", (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
        if (mediaType === "video") {
          setHasPreview(false);
        }
      });
      
      await client.join(config.appId, channelName, token, uid);
      
      setTimeout(() => {
        if (!hasPreview) {
          setIsPreviewLoading(false);
        }
      }, 5000);
      
    } catch (error) {
      console.error("Preview load error:", error);
      setIsPreviewLoading(false);
    } finally {
      isConnectingRef.current = false;
    }
  };

  const unloadPreview = async () => {
    if (clientRef.current) {
      try {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.stop();
          remoteVideoRef.current = null;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.stop();
          remoteAudioRef.current = null;
        }
        await clientRef.current.leave();
        clientRef.current = null;
        setHasPreview(false);
      } catch (error) {
        console.error("Preview unload error:", error);
      }
    }
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMuted(!isMuted);
    if (remoteAudioRef.current) {
      if (isMuted) {
        remoteAudioRef.current.play();
      } else {
        remoteAudioRef.current.stop();
      }
    }
  };

  // Load preview automatically when component mounts
  useEffect(() => {
    if (stream.isLive) {
      const timer = setTimeout(() => {
        loadPreview();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [stream.isLive, stream.id]);

  useEffect(() => {
    return () => {
      unloadPreview();
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Link href={`/live/${stream.id}`}>
      <div 
        className="relative group cursor-pointer overflow-hidden rounded-2xl aspect-[3/4] bg-muted"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Thumbnail/Fallback Image */}
        <img 
          src={stream.thumbnail || stream.user.avatar || "https://api.dicebear.com/7.x/shapes/svg?seed=" + stream.id} 
          alt={stream.user.username}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${isHovering ? 'scale-110' : ''} ${hasPreview ? 'opacity-0' : 'opacity-100'}`}
          data-testid={`img-stream-${stream.id}`}
        />
        
        {/* Live Video Preview Container */}
        <div 
          ref={videoContainerRef}
          className={`absolute inset-0 w-full h-full overflow-hidden transition-opacity duration-300 ${hasPreview ? 'opacity-100 z-[5]' : 'opacity-0 z-0'}`}
          style={{ 
            backgroundColor: hasPreview ? '#000' : 'transparent',
          }}
        />
        
        {/* Loading indicator */}
        {isPreviewLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-[15]">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-white/80 text-xs">Loading preview...</span>
            </div>
          </div>
        )}
        
        {/* LIVE Badge */}
        {stream.isLive && (
          <div className="absolute top-3 left-14 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded z-20">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 z-10 pointer-events-none" />

        {/* Viewer Count */}
        <div 
          className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 z-20"
          data-testid={`text-viewers-${stream.id}`}
        >
          <Eye className="w-3 h-3" />
          {formatViewers(stream.viewersCount)}
        </div>

        {/* TOP Rank Badge */}
        {rank && rank <= 50 && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-20">
            TOP {rank}
          </div>
        )}

        {/* In Battle Badge */}
        {stream.isPKBattle && (
          <div className="absolute bottom-16 left-3 flex items-center gap-1 z-20">
            <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Swords className="w-3 h-3" /> In battle
            </span>
            {rank && (
              <span className="bg-yellow-500/90 text-black text-[9px] font-bold px-2 py-0.5 rounded">
                TOP {rank}
              </span>
            )}
          </div>
        )}

        {/* Sound Toggle (when preview is active) */}
        {hasPreview && (
          <button 
            className="absolute bottom-16 right-3 bg-black/50 backdrop-blur-sm text-white p-1.5 rounded-lg z-20 hover:bg-black/70 transition-colors"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}

        {/* Video Call Button (when not previewing) */}
        {!hasPreview && !isPreviewLoading && (
          <button 
            className="absolute bottom-16 right-3 bg-yellow-500 text-black p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Video className="w-4 h-4" />
          </button>
        )}

        {/* User Info at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
          <div className="flex items-center gap-2 mb-1">
            <div className="relative">
              <img 
                src={stream.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.user.username}`}
                className="w-7 h-7 rounded-full border-2 border-pink-500"
              />
              {stream.user.level && (
                <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[8px] font-bold px-1 rounded-full min-w-[14px] text-center">
                  {stream.user.level}
                </span>
              )}
            </div>
            <h3 
              className="font-bold text-white text-sm truncate flex-1"
              data-testid={`text-username-${stream.id}`}
            >
              {stream.user.username}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-white/80 text-xs">
            <span className="text-yellow-400">💎</span>
            <span>{formatDiamonds(stream.user.diamonds || 0)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
