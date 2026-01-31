import { Settings, Camera, X, Lock, Crown, Users as UsersIcon, RefreshCw, VideoOff, ImageIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function GoLive() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const groupId = params.get("groupId");
  
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Chat");
  const [accessType, setAccessType] = useState<"public" | "private" | "vip" | "group">(groupId ? "group" : "public");
  const [minVipTier, setMinVipTier] = useState(1);
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => api.getGroup(groupId!),
    enabled: !!groupId,
  });

  useEffect(() => {
    if (groupId) {
      setAccessType("group");
    }
  }, [groupId]);

  const startCamera = async () => {
    setIsCameraLoading(true);
    setCameraError(null);
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
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
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error: any) {
      console.error("Camera error:", error);
      if (error.name === "NotAllowedError") {
        setCameraError("Camera access denied. Please allow camera access in your browser settings.");
      } else if (error.name === "NotFoundError") {
        setCameraError("No camera found on this device.");
      } else {
        setCameraError("Unable to access camera. Please check permissions.");
      }
    } finally {
      setIsCameraLoading(false);
    }
  };

  useEffect(() => {
    startCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const flipCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const captureThumbnail = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = 320;
    canvas.height = 427;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = canvas.width / canvas.height;
    
    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
    
    if (videoAspect > canvasAspect) {
      sw = video.videoHeight * canvasAspect;
      sx = (video.videoWidth - sw) / 2;
    } else {
      sh = video.videoWidth / canvasAspect;
      sy = (video.videoHeight - sh) / 2;
    }
    
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setThumbnail(dataUrl);
    toast({ title: "Thumbnail captured!" });
  };

  const handleGoLive = async () => {
    if (!user) {
      toast({ title: "Please log in to go live", variant: "destructive" });
      return;
    }
    
    if (!title.trim()) {
      toast({ title: "Please add a title", variant: "destructive" });
      return;
    }
    
    setIsStarting(true);
    try {
      const stream = await api.createStream({
        userId: user.id,
        title: title.trim(),
        category,
        thumbnail: thumbnail || undefined,
        isPrivate: accessType !== "public",
        accessType,
        minVipTier: accessType === "vip" ? minVipTier : undefined,
        groupId: accessType === "group" && groupId ? groupId : undefined,
      });
      
      toast({ title: "You're now live!" });
      setLocation(`/live/${stream.id}`);
    } catch (error) {
      toast({ title: "Failed to start stream", description: "Please try again", variant: "destructive" });
      setIsStarting(false);
    }
  };

  const categories = ['Chat', 'Music', 'Gaming', 'Dance', 'Talent', 'Chill'];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Camera Preview */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black">
        {isCameraLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-32 h-32 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center animate-pulse">
              <Camera className="w-12 h-12 text-white/20" />
            </div>
          </div>
        ) : cameraError ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
            <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center">
              <VideoOff className="w-10 h-10 text-red-400" />
            </div>
            <p className="text-white/70 text-center max-w-xs">{cameraError}</p>
            <button 
              onClick={startCamera}
              className="px-6 py-2 bg-primary rounded-full text-white font-medium"
            >
              Try Again
            </button>
          </div>
        ) : (
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Thumbnail Preview */}
      {thumbnail && (
        <div className="absolute top-20 right-6 z-20">
          <div className="relative">
            <img 
              src={thumbnail} 
              alt="Stream thumbnail preview" 
              className="w-20 h-28 object-cover rounded-lg border-2 border-primary shadow-lg"
            />
            <button
              onClick={() => setThumbnail(null)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
            >
              ✕
            </button>
            <span className="absolute -bottom-5 left-0 right-0 text-[10px] text-white/70 text-center">Preview</span>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className="relative z-10 h-full flex flex-col justify-between p-6">
        <div className="flex justify-between items-start">
          <button 
            onClick={() => setLocation("/")} 
            className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-white/10"
            data-testid="button-close"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex gap-4">
            <button 
              onClick={captureThumbnail}
              disabled={cameraError !== null || isCameraLoading}
              className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-white/10 disabled:opacity-50"
              title="Capture thumbnail"
              data-testid="button-capture-thumbnail"
            >
              <ImageIcon className="w-6 h-6" />
            </button>
            <button className="p-2 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-white/10">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a title to your stream..." 
            className="w-full bg-transparent text-2xl font-bold text-white placeholder:text-white/30 focus:outline-none mb-6 text-center"
            data-testid="input-title"
          />
          
          {/* Category Selection */}
          <div className="mb-6">
            <p className="text-white/50 text-sm text-center mb-3">Select Category</p>
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    category === cat
                      ? 'bg-primary text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                  data-testid={`button-category-${cat.toLowerCase()}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {groupId && group && (
            <div className="mb-4 p-3 bg-violet-600/20 rounded-xl border border-violet-500/30 text-center">
              <p className="text-violet-300 text-sm">Streaming to group:</p>
              <p className="text-white font-bold">{group.name}</p>
            </div>
          )}

          {/* Access Type Selection */}
          <div className="mb-6">
            <p className="text-white/50 text-sm text-center mb-3">Stream Access</p>
            <div className="flex flex-wrap justify-center gap-3">
              {!groupId && (
                <>
                  <button
                    onClick={() => setAccessType("public")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      accessType === "public"
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                    data-testid="button-access-public"
                  >
                    <UsersIcon className="w-4 h-4" />
                    Public
                  </button>
                  <button
                    onClick={() => setAccessType("private")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      accessType === "private"
                        ? 'bg-primary text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                    data-testid="button-access-private"
                  >
                    <Lock className="w-4 h-4" />
                    Private
                  </button>
                  <button
                    onClick={() => setAccessType("vip")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      accessType === "vip"
                        ? 'bg-yellow-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                    data-testid="button-access-vip"
                  >
                    <Crown className="w-4 h-4" />
                    VIP Only
                  </button>
                </>
              )}
              {groupId && (
                <div className="px-4 py-2 rounded-full text-sm font-medium bg-violet-500 text-white flex items-center gap-2">
                  <UsersIcon className="w-4 h-4" />
                  Group Only
                </div>
              )}
            </div>
            
            {accessType === "vip" && (
              <div className="mt-4 flex justify-center items-center gap-3">
                <span className="text-white/50 text-sm">Min VIP Tier:</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setMinVipTier(tier)}
                      className={`w-8 h-8 rounded-full text-sm font-bold transition-all ${
                        minVipTier === tier
                          ? 'bg-yellow-500 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                      data-testid={`button-vip-tier-${tier}`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-center gap-4 mb-8">
            {['Beauty', 'Effects', 'Flip', 'Share'].map(action => (
              <div key={action} className="flex flex-col items-center gap-2">
                <button 
                  onClick={action === 'Flip' ? flipCamera : undefined}
                  className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
                  data-testid={`button-action-${action.toLowerCase()}`}
                >
                  {action === 'Flip' ? (
                    <RefreshCw className="w-6 h-6 text-white/70" />
                  ) : (
                    <div className="w-6 h-6 bg-white/50 rounded-sm" />
                  )}
                </button>
                <span className="text-xs text-white/70">{action}</span>
              </div>
            ))}
          </div>

          <button 
            onClick={handleGoLive}
            disabled={!title.trim() || isStarting || !user}
            className="w-full py-4 rounded-full bg-gradient-to-r from-primary to-accent text-white font-bold text-lg shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            data-testid="button-go-live"
          >
            {isStarting ? 'Starting...' : 'Go Live'}
          </button>
          
          {!user && (
            <p className="text-center text-white/50 text-sm mt-3">
              Please log in to start streaming
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
