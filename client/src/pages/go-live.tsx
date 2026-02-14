import { GuestGate } from "@/components/guest-gate";
import LocationPickerModal from "@/components/location-picker-modal";
import { Settings, Camera, X, Lock, Crown, Users as UsersIcon, RefreshCw, VideoOff, ImageIcon, MapPin, Globe, Eye, EyeOff, Shield, Sparkles, Wand2, Frame, Sticker, Stars, SunMedium, Contrast, Palette, Share2, Copy, Check } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const COUNTRIES_MAP: Record<string, string> = {
  US: "United States 🇺🇸", GB: "United Kingdom 🇬🇧", CA: "Canada 🇨🇦", AU: "Australia 🇦🇺",
  DE: "Germany 🇩🇪", FR: "France 🇫🇷", JP: "Japan 🇯🇵", KR: "South Korea 🇰🇷",
  BR: "Brazil 🇧🇷", IN: "India 🇮🇳", MX: "Mexico 🇲🇽", ES: "Spain 🇪🇸",
  IT: "Italy 🇮🇹", NL: "Netherlands 🇳🇱", SE: "Sweden 🇸🇪", NO: "Norway 🇳🇴",
  DK: "Denmark 🇩🇰", FI: "Finland 🇫🇮", PL: "Poland 🇵🇱", PT: "Portugal 🇵🇹",
  RU: "Russia 🇷🇺", CN: "China 🇨🇳", TW: "Taiwan 🇹🇼", TH: "Thailand 🇹🇭",
  VN: "Vietnam 🇻🇳", PH: "Philippines 🇵🇭", ID: "Indonesia 🇮🇩", MY: "Malaysia 🇲🇾",
  SG: "Singapore 🇸🇬", AE: "UAE 🇦🇪", SA: "Saudi Arabia 🇸🇦", EG: "Egypt 🇪🇬",
  NG: "Nigeria 🇳🇬", ZA: "South Africa 🇿🇦", KE: "Kenya 🇰🇪", AR: "Argentina 🇦🇷",
  CO: "Colombia 🇨🇴", CL: "Chile 🇨🇱", PE: "Peru 🇵🇪", TR: "Turkey 🇹🇷",
  IL: "Israel 🇮🇱", PK: "Pakistan 🇵🇰", BD: "Bangladesh 🇧🇩", NZ: "New Zealand 🇳🇿",
  IE: "Ireland 🇮🇪", CH: "Switzerland 🇨🇭", AT: "Austria 🇦🇹", BE: "Belgium 🇧🇪",
  GR: "Greece 🇬🇷", RO: "Romania 🇷🇴",
};

export default function GoLive() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const groupId = params.get("groupId");
  
  const { user, login } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Chat");
  const [accessType, setAccessType] = useState<"public" | "private" | "vip" | "group">(groupId ? "group" : "public");
  const [minVipTier, setMinVipTier] = useState(1);
  const [isStarting, setIsStarting] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pendingGoLive, setPendingGoLive] = useState(false);
  const [showCountryOnStream, setShowCountryOnStream] = useState(true);
  const [activePanel, setActivePanel] = useState<"beauty" | "effects" | null>(null);
  const [beautySettings, setBeautySettings] = useState({
    smooth: 0, slim: 0, eyes: 0, brightness: 0, contrast: 0, lipColor: 0,
  });
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<string[]>([]);
  const [effectsTab, setEffectsTab] = useState<"filters" | "frames" | "stickers" | "ar">("filters");
  const [linkCopied, setLinkCopied] = useState(false);
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
  }, [facingMode]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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

  const startStreamNow = async () => {
    if (!user) return;
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
        showCountry: showCountryOnStream,
      });
      
      toast({ title: "You're now live!" });
      setLocation(`/live/${stream.id}`);
    } catch (error) {
      toast({ title: "Failed to start stream", description: "Please try again", variant: "destructive" });
      setIsStarting(false);
    }
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

    if (!user.country) {
      setPendingGoLive(true);
      setShowLocationPicker(true);
      return;
    }
    
    await startStreamNow();
  };

  const handleLocationSelect = async (countryCode: string) => {
    if (!user) return;
    setShowLocationPicker(false);
    try {
      const updated = await api.updateUser(user.id, { country: countryCode });
      login(updated);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({ title: "Location set!", description: `Your country has been set to ${countryCode}` });
      if (pendingGoLive) {
        setPendingGoLive(false);
        await startStreamNow();
      }
    } catch {
      toast({ title: "Failed to set location", variant: "destructive" });
      setPendingGoLive(false);
    }
  };

  const handleLocationSkip = () => {
    setShowLocationPicker(false);
    if (pendingGoLive) {
      setPendingGoLive(false);
      startStreamNow();
    }
  };

  const categories = ['Chat', 'Music', 'Gaming', 'Dance', 'Talent', 'Chill'];

  const handleShare = useCallback(async () => {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "Watch me live on IgnytLIVE!", url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      toast({ title: "Link copied!" });
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [title, toast]);

  const updateBeauty = useCallback((key: keyof typeof beautySettings, value: number) => {
    setBeautySettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleSticker = useCallback((id: string) => {
    setSelectedSticker(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }, []);

  const FILTERS = [
    { id: "none", name: "None", gradient: "bg-gradient-to-br from-gray-700 to-gray-800" },
    { id: "warm", name: "Warm", gradient: "bg-gradient-to-br from-orange-400 to-rose-500" },
    { id: "cool", name: "Cool", gradient: "bg-gradient-to-br from-blue-400 to-cyan-500" },
    { id: "vintage", name: "Vintage", gradient: "bg-gradient-to-br from-amber-600 to-yellow-800" },
    { id: "dramatic", name: "Drama", gradient: "bg-gradient-to-br from-purple-900 to-gray-900" },
    { id: "soft", name: "Soft", gradient: "bg-gradient-to-br from-pink-200 to-rose-300" },
    { id: "vivid", name: "Vivid", gradient: "bg-gradient-to-br from-emerald-400 to-blue-500" },
    { id: "bw", name: "B&W", gradient: "bg-gradient-to-br from-gray-300 to-gray-600" },
    { id: "sunset", name: "Sunset", gradient: "bg-gradient-to-br from-orange-500 to-pink-600" },
    { id: "neon", name: "Neon", gradient: "bg-gradient-to-br from-cyan-400 to-violet-600" },
    { id: "dreamy", name: "Dreamy", gradient: "bg-gradient-to-br from-indigo-300 to-purple-400" },
    { id: "retro", name: "Retro", gradient: "bg-gradient-to-br from-yellow-500 to-red-600" },
  ];

  const FRAMES = [
    { id: "none", name: "None", icon: "✕" },
    { id: "hearts", name: "Hearts", icon: "💕" },
    { id: "stars", name: "Stars", icon: "✨" },
    { id: "fire", name: "Fire", icon: "🔥" },
    { id: "flowers", name: "Flowers", icon: "🌸" },
    { id: "neon-border", name: "Neon", icon: "💜" },
    { id: "gold-border", name: "Gold", icon: "👑" },
    { id: "rainbow", name: "Rainbow", icon: "🌈" },
    { id: "snowflakes", name: "Snow", icon: "❄️" },
  ];

  const STICKERS = [
    { id: "crown", icon: "👑", name: "Crown" },
    { id: "sunglasses", icon: "😎", name: "Cool" },
    { id: "heart-eyes", icon: "😍", name: "Love" },
    { id: "fire", icon: "🔥", name: "Fire" },
    { id: "star", icon: "⭐", name: "Star" },
    { id: "diamond", icon: "💎", name: "Diamond" },
    { id: "music", icon: "🎵", name: "Music" },
    { id: "butterfly", icon: "🦋", name: "Butterfly" },
    { id: "sparkle", icon: "✨", name: "Sparkle" },
    { id: "rainbow", icon: "🌈", name: "Rainbow" },
    { id: "cat", icon: "😺", name: "Cat" },
    { id: "dog", icon: "🐶", name: "Dog" },
  ];

  const AR_EFFECTS = [
    { id: "none", name: "None", icon: "✕", desc: "No effect" },
    { id: "bunny", name: "Bunny", icon: "🐰", desc: "Bunny ears" },
    { id: "cat-face", name: "Cat", icon: "🐱", desc: "Cat whiskers" },
    { id: "angel", name: "Angel", icon: "😇", desc: "Halo effect" },
    { id: "devil", name: "Devil", icon: "😈", desc: "Devil horns" },
    { id: "glasses", name: "Glasses", icon: "🤓", desc: "Nerdy glasses" },
    { id: "mask", name: "Mask", icon: "🎭", desc: "Party mask" },
    { id: "astronaut", name: "Space", icon: "🚀", desc: "Space helmet" },
  ];

  return (
    <GuestGate>
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
            onClick={() => {
              if (stream) {
                stream.getTracks().forEach(track => track.stop());
              }
              setLocation("/");
            }} 
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

          {/* Stream Access Selection */}
          <div className="mb-5">
            <p className="text-white/50 text-xs uppercase tracking-wider text-center mb-3">Stream Access</p>
            {!groupId ? (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setAccessType("public")}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all border ${
                    accessType === "public"
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                  data-testid="button-access-public"
                >
                  <UsersIcon className="w-5 h-5" />
                  <span>Public</span>
                  <span className="text-[10px] opacity-60">Everyone</span>
                </button>
                <button
                  onClick={() => setAccessType("private")}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all border ${
                    accessType === "private"
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                  data-testid="button-access-private"
                >
                  <Lock className="w-5 h-5" />
                  <span>Private</span>
                  <span className="text-[10px] opacity-60">Invite only</span>
                </button>
                <button
                  onClick={() => setAccessType("vip")}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all border ${
                    accessType === "vip"
                      ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                  data-testid="button-access-vip"
                >
                  <Crown className="w-5 h-5" />
                  <span>VIP Only</span>
                  <span className="text-[10px] opacity-60">VIP members</span>
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium bg-violet-500/20 border border-violet-500 text-violet-400">
                  <UsersIcon className="w-5 h-5" />
                  <span>Group Only</span>
                  <span className="text-[10px] opacity-60">{group?.name || 'Group members'}</span>
                </div>
              </div>
            )}
            
            {accessType === "vip" && (
              <div className="mt-3 flex justify-center items-center gap-3">
                <span className="text-white/50 text-xs">Min VIP Tier:</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setMinVipTier(tier)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        minVipTier === tier
                          ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30'
                          : tier <= minVipTier
                            ? 'bg-yellow-500/30 text-yellow-400'
                            : 'bg-white/10 text-white/50 hover:bg-white/20'
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

          {/* Location & Country visibility */}
          <div className="mb-5 space-y-2">
            <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-white text-sm font-medium">
                    {user?.country ? (
                      <>Location: {COUNTRIES_MAP[user.country] || user.country}</>
                    ) : (
                      'No location set'
                    )}
                  </p>
                  <p className="text-white/40 text-[10px]">Set from your profile</p>
                </div>
              </div>
              {user?.country && (
                <Shield className="w-4 h-4 text-white/30" />
              )}
            </div>

            {user?.country && (
              <button
                onClick={() => setShowCountryOnStream(!showCountryOnStream)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  showCountryOnStream
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
                data-testid="button-toggle-country-visibility"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-white/60" />
                  <span className="text-white/80 text-sm">Show country on stream</span>
                </div>
                <div className={`w-10 h-5 rounded-full transition-all relative ${
                  showCountryOnStream ? 'bg-green-500' : 'bg-white/20'
                }`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    showCountryOnStream ? 'left-5' : 'left-0.5'
                  }`} />
                </div>
              </button>
            )}
          </div>
          
          <div className="flex justify-center gap-4 mb-5">
            <div className="flex flex-col items-center gap-1.5">
              <button 
                onClick={() => setActivePanel(activePanel === "beauty" ? null : "beauty")}
                className={`w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                  activePanel === "beauty" ? 'bg-pink-500/30 ring-2 ring-pink-500' : 'bg-white/10 hover:bg-white/20'
                }`}
                data-testid="button-action-beauty"
              >
                <Wand2 className={`w-5 h-5 ${activePanel === "beauty" ? 'text-pink-400' : 'text-white/70'}`} />
              </button>
              <span className={`text-[10px] ${activePanel === "beauty" ? 'text-pink-400' : 'text-white/50'}`}>Beauty</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <button 
                onClick={() => setActivePanel(activePanel === "effects" ? null : "effects")}
                className={`w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                  activePanel === "effects" ? 'bg-violet-500/30 ring-2 ring-violet-500' : 'bg-white/10 hover:bg-white/20'
                }`}
                data-testid="button-action-effects"
              >
                <Sparkles className={`w-5 h-5 ${activePanel === "effects" ? 'text-violet-400' : 'text-white/70'}`} />
              </button>
              <span className={`text-[10px] ${activePanel === "effects" ? 'text-violet-400' : 'text-white/50'}`}>Effects</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <button 
                onClick={flipCamera}
                className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
                data-testid="button-action-flip"
              >
                <RefreshCw className="w-5 h-5 text-white/70" />
              </button>
              <span className="text-[10px] text-white/50">Flip</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <button 
                onClick={handleShare}
                className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
                data-testid="button-action-share"
              >
                {linkCopied ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Share2 className="w-5 h-5 text-white/70" />
                )}
              </button>
              <span className={`text-[10px] ${linkCopied ? 'text-green-400' : 'text-white/50'}`}>{linkCopied ? 'Copied!' : 'Share'}</span>
            </div>
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

      {/* Beauty Panel */}
      {activePanel === "beauty" && (
        <div className="absolute bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="bg-black/90 backdrop-blur-xl border-t border-white/10 rounded-t-3xl p-5 pb-8 max-h-[55vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-pink-400" />
                Beauty
              </h3>
              <button
                onClick={() => setActivePanel(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20"
                data-testid="button-close-beauty"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            <div className="space-y-5">
              {[
                { key: "smooth" as const, label: "Smooth Skin", icon: "✨", color: "from-pink-500 to-rose-400" },
                { key: "slim" as const, label: "Face Slim", icon: "💫", color: "from-violet-500 to-purple-400" },
                { key: "eyes" as const, label: "Big Eyes", icon: "👁️", color: "from-blue-500 to-cyan-400" },
                { key: "lipColor" as const, label: "Lip Color", icon: "💋", color: "from-red-500 to-pink-400" },
                { key: "brightness" as const, label: "Brightness", icon: "☀️", color: "from-amber-500 to-yellow-400" },
                { key: "contrast" as const, label: "Contrast", icon: "◐", color: "from-gray-400 to-gray-600" },
              ].map(({ key, label, icon, color }) => (
                <div key={key} data-testid={`beauty-slider-${key}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/80 text-sm flex items-center gap-2">
                      <span className="text-base">{icon}</span>
                      {label}
                    </span>
                    <span className="text-white/50 text-xs font-mono w-8 text-right">{beautySettings[key]}</span>
                  </div>
                  <div className="relative h-8 flex items-center">
                    <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all`}
                          style={{ width: `${beautySettings[key]}%` }}
                        />
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={beautySettings[key]}
                      onChange={(e) => updateBeauty(key, parseInt(e.target.value))}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    />
                    <div
                      className="absolute w-5 h-5 rounded-full bg-white shadow-lg shadow-black/30 pointer-events-none transition-all"
                      style={{ left: `calc(${beautySettings[key]}% - 10px)` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setBeautySettings({ smooth: 50, slim: 30, eyes: 40, brightness: 10, contrast: 10, lipColor: 20 })}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500/20 to-violet-500/20 border border-pink-500/30 text-pink-300 text-sm font-medium"
                data-testid="button-beauty-preset-natural"
              >
                Natural
              </button>
              <button
                onClick={() => setBeautySettings({ smooth: 80, slim: 60, eyes: 70, brightness: 20, contrast: 15, lipColor: 50 })}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium"
                data-testid="button-beauty-preset-glam"
              >
                Glam
              </button>
              <button
                onClick={() => setBeautySettings({ smooth: 0, slim: 0, eyes: 0, brightness: 0, contrast: 0, lipColor: 0 })}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm font-medium"
                data-testid="button-beauty-reset"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Effects Panel */}
      {activePanel === "effects" && (
        <div className="absolute bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="bg-black/90 backdrop-blur-xl border-t border-white/10 rounded-t-3xl p-5 pb-8 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                Effects
              </h3>
              <button
                onClick={() => setActivePanel(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20"
                data-testid="button-close-effects"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
              {([
                { id: "filters" as const, label: "Filters", Icon: Palette },
                { id: "frames" as const, label: "Frames", Icon: Frame },
                { id: "stickers" as const, label: "Stickers", Icon: Sticker },
                { id: "ar" as const, label: "AR", Icon: Stars },
              ]).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setEffectsTab(id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    effectsTab === id
                      ? 'bg-violet-500 text-white shadow-lg'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                  data-testid={`button-effects-tab-${id}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {effectsTab === "filters" && (
              <div className="grid grid-cols-4 gap-2.5" data-testid="effects-filters-grid">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter.id === "none" ? null : filter.id)}
                    className={`flex flex-col items-center gap-1.5 group`}
                    data-testid={`button-filter-${filter.id}`}
                  >
                    <div className={`w-14 h-14 rounded-2xl ${filter.gradient} transition-all ${
                      (selectedFilter === filter.id) || (filter.id === "none" && !selectedFilter)
                        ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-black scale-105'
                        : 'opacity-70 group-hover:opacity-100'
                    }`} />
                    <span className={`text-[10px] ${
                      (selectedFilter === filter.id) || (filter.id === "none" && !selectedFilter)
                        ? 'text-violet-400 font-medium'
                        : 'text-white/50'
                    }`}>{filter.name}</span>
                  </button>
                ))}
              </div>
            )}

            {effectsTab === "frames" && (
              <div className="grid grid-cols-3 gap-2.5" data-testid="effects-frames-grid">
                {FRAMES.map((frame) => (
                  <button
                    key={frame.id}
                    onClick={() => setSelectedFrame(frame.id === "none" ? null : frame.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      (selectedFrame === frame.id) || (frame.id === "none" && !selectedFrame)
                        ? 'bg-violet-500/15 border-violet-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                    data-testid={`button-frame-${frame.id}`}
                  >
                    <span className="text-2xl">{frame.icon}</span>
                    <span className={`text-[10px] ${
                      (selectedFrame === frame.id) || (frame.id === "none" && !selectedFrame)
                        ? 'text-violet-400 font-medium'
                        : 'text-white/50'
                    }`}>{frame.name}</span>
                  </button>
                ))}
              </div>
            )}

            {effectsTab === "stickers" && (
              <div>
                <p className="text-white/40 text-xs mb-3">Tap to add/remove stickers on your stream</p>
                <div className="grid grid-cols-4 gap-2.5" data-testid="effects-stickers-grid">
                  {STICKERS.map((sticker) => (
                    <button
                      key={sticker.id}
                      onClick={() => toggleSticker(sticker.id)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                        selectedSticker.includes(sticker.id)
                          ? 'bg-violet-500/15 border-violet-500/50 scale-105'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                      data-testid={`button-sticker-${sticker.id}`}
                    >
                      <span className="text-2xl">{sticker.icon}</span>
                      <span className={`text-[10px] ${
                        selectedSticker.includes(sticker.id)
                          ? 'text-violet-400 font-medium'
                          : 'text-white/50'
                      }`}>{sticker.name}</span>
                    </button>
                  ))}
                </div>
                {selectedSticker.length > 0 && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-white/40 text-xs">{selectedSticker.length} sticker{selectedSticker.length > 1 ? 's' : ''} selected</span>
                    <button
                      onClick={() => setSelectedSticker([])}
                      className="text-xs text-red-400 hover:text-red-300"
                      data-testid="button-clear-stickers"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            )}

            {effectsTab === "ar" && (
              <div>
                <p className="text-white/40 text-xs mb-3">Augmented reality face effects</p>
                <div className="grid grid-cols-4 gap-2.5" data-testid="effects-ar-grid">
                  {AR_EFFECTS.map((effect) => (
                    <button
                      key={effect.id}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                        effect.id === "none"
                          ? 'bg-white/5 border-white/10 hover:bg-white/10'
                          : 'bg-white/5 border-white/10 hover:bg-violet-500/10 hover:border-violet-500/30'
                      }`}
                      data-testid={`button-ar-${effect.id}`}
                    >
                      <span className="text-2xl">{effect.icon}</span>
                      <span className="text-[10px] text-white/50">{effect.name}</span>
                    </button>
                  ))}
                </div>
                <p className="text-center text-white/30 text-[10px] mt-4">AR effects require camera access</p>
              </div>
            )}
          </div>
        </div>
      )}

      <LocationPickerModal
        open={showLocationPicker}
        onSelect={handleLocationSelect}
        onSkip={handleLocationSkip}
      />
    </div>
    </GuestGate>
  );
}
