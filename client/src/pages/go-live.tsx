import { GuestGate } from "@/components/guest-gate";
import LocationPickerModal from "@/components/location-picker-modal";
import { Settings, Camera, X, Lock, Crown, Users as UsersIcon, RefreshCw, VideoOff, ImageIcon, MapPin, Globe, Eye, EyeOff, Shield, Sparkles, Wand2, Frame, Sticker, Stars, SunMedium, Contrast, Palette, Share2, Copy, Check, Radio, UserPlus, Gem, Link as LinkIcon } from "lucide-react";
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
  const [streamType, setStreamType] = useState<"solo" | "multi" | "premium" | "vip">("solo");
  const [isPrivate, setIsPrivate] = useState(false);
  const [requireVip, setRequireVip] = useState(false);
  const [minVipTier, setMinVipTier] = useState(1);
  const [isStarting, setIsStarting] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pendingGoLive, setPendingGoLive] = useState(false);
  const [showCountryOnStream, setShowCountryOnStream] = useState(true);
  const [blockLinks, setBlockLinks] = useState(false);
  const [activePanel, setActivePanel] = useState<"beauty" | "effects" | null>(null);
  const [beautySettings, setBeautySettings] = useState({
    smooth: 0, slim: 0, eyes: 0, brightness: 0, contrast: 0, lipColor: 0,
  });
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<string[]>([]);
  const [effectsTab, setEffectsTab] = useState<"filters" | "frames" | "stickers" | "ar">("filters");
  const [selectedArEffects, setSelectedArEffects] = useState<string[]>([]);
  const [arPositions, setArPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingAr, setDraggingAr] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
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
      setIsPrivate(true);
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

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

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
        isPrivate: groupId ? true : (streamType === "premium" ? true : isPrivate),
        accessType: groupId ? "group" : (streamType === "vip" ? "vip" : (streamType === "premium" ? "premium" : (isPrivate ? "private" : "public"))),
        minVipTier: streamType === "vip" ? minVipTier : 0,
        groupId: groupId || undefined,
        allowGuests: streamType === "multi",
        showCountry: showCountryOnStream,
        blockLinks,
      });
      
      const effectsData = {
        filter: selectedFilter,
        filterCss: activeFilterCss,
        filterOverlay: activeFilterOverlay,
        frame: selectedFrame,
        frameData: activeFrame ? { border: activeFrame.border, shadow: activeFrame.shadow, emojiSet: activeFrame.emojiSet, sizes: activeFrame.sizes, count: activeFrame.count, id: activeFrame.id, name: activeFrame.name } : null,
        stickers: activeStickers.map(s => ({ id: s.id, icon: s.icon, name: s.name })),
        stickerPositions: stickerPositions,
        arEffects: activeArEffects.map(a => ({ id: a.id, icon: a.icon, name: a.name })),
        arPositions,
        beauty: beautySettings,
        beautyOverlay,
      };
      sessionStorage.setItem('liveEffects', JSON.stringify(effectsData));
      
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
    const platform = navigator.share ? "native" : "clipboard";
    const token = localStorage.getItem("authToken");
    fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
      body: JSON.stringify({ contentType: "stream", contentId: null, platform }),
    }).catch(() => {});
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

  const toggleArEffect = useCallback((id: string) => {
    if (id === "none") {
      setSelectedArEffects([]);
      setArPositions({});
      return;
    }
    setSelectedArEffects(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(e => e !== id);
        setArPositions(p => { const copy = { ...p }; delete copy[id]; return copy; });
        return next;
      }
      if (prev.length >= 5) {
        return prev;
      }
      const defaultPositions: { x: number; y: number }[] = [
        { x: 50, y: 50 }, { x: 25, y: 30 }, { x: 75, y: 30 },
        { x: 25, y: 70 }, { x: 75, y: 70 },
      ];
      setArPositions(p => ({ ...p, [id]: defaultPositions[prev.length] || { x: 50, y: 50 } }));
      return [...prev, id];
    });
  }, []);

  const handleArDragStart = useCallback((id: string, clientX: number, clientY: number) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = arPositions[id] || { x: 50, y: 50 };
    dragOffset.current = {
      x: clientX - (rect.left + (pos.x / 100) * rect.width),
      y: clientY - (rect.top + (pos.y / 100) * rect.height),
    };
    setDraggingAr(id);
  }, [arPositions]);

  const handleArDragMove = useCallback((clientX: number, clientY: number) => {
    if (!draggingAr || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((clientX - dragOffset.current.x - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((clientY - dragOffset.current.y - rect.top) / rect.height) * 100));
    setArPositions(prev => ({ ...prev, [draggingAr]: { x, y } }));
  }, [draggingAr]);

  const handleArDragEnd = useCallback(() => {
    setDraggingAr(null);
  }, []);

  const FILTERS = [
    { id: "none", name: "None", gradient: "bg-gradient-to-br from-gray-700 to-gray-800", css: "none", overlay: "" },
    { id: "warm", name: "Warm", gradient: "bg-gradient-to-br from-orange-400 to-rose-500", css: "saturate(1.3) contrast(1.05) brightness(1.05)", overlay: "rgba(255, 140, 50, 0.12)" },
    { id: "cool", name: "Cool", gradient: "bg-gradient-to-br from-blue-400 to-cyan-500", css: "saturate(0.9) brightness(1.05) hue-rotate(15deg)", overlay: "rgba(50, 130, 255, 0.1)" },
    { id: "vintage", name: "Vintage", gradient: "bg-gradient-to-br from-amber-600 to-yellow-800", css: "sepia(0.4) contrast(1.1) brightness(0.95) saturate(0.85)", overlay: "rgba(180, 130, 50, 0.08)" },
    { id: "dramatic", name: "Drama", gradient: "bg-gradient-to-br from-purple-900 to-gray-900", css: "contrast(1.4) brightness(0.9) saturate(0.7)", overlay: "rgba(30, 0, 50, 0.15)" },
    { id: "soft", name: "Soft", gradient: "bg-gradient-to-br from-pink-200 to-rose-300", css: "brightness(1.1) contrast(0.9) saturate(0.9)", overlay: "rgba(255, 180, 200, 0.1)" },
    { id: "vivid", name: "Vivid", gradient: "bg-gradient-to-br from-emerald-400 to-blue-500", css: "saturate(1.6) contrast(1.1) brightness(1.05)", overlay: "" },
    { id: "bw", name: "B&W", gradient: "bg-gradient-to-br from-gray-300 to-gray-600", css: "grayscale(1) contrast(1.1)", overlay: "" },
    { id: "sunset", name: "Sunset", gradient: "bg-gradient-to-br from-orange-500 to-pink-600", css: "saturate(1.3) brightness(1.05) contrast(1.05)", overlay: "rgba(255, 100, 60, 0.15)" },
    { id: "neon", name: "Neon", gradient: "bg-gradient-to-br from-cyan-400 to-violet-600", css: "saturate(1.8) contrast(1.3) brightness(1.1)", overlay: "rgba(120, 0, 255, 0.08)" },
    { id: "dreamy", name: "Dreamy", gradient: "bg-gradient-to-br from-indigo-300 to-purple-400", css: "brightness(1.15) contrast(0.85) saturate(1.1)", overlay: "rgba(140, 120, 255, 0.12)" },
    { id: "retro", name: "Retro", gradient: "bg-gradient-to-br from-yellow-500 to-red-600", css: "sepia(0.3) saturate(1.2) contrast(1.15) brightness(0.95)", overlay: "rgba(200, 100, 0, 0.1)" },
  ];

  const baseFilterCss = FILTERS.find(f => f.id === selectedFilter)?.css || "none";
  const activeFilterOverlay = FILTERS.find(f => f.id === selectedFilter)?.overlay || "";

  const beautyCss = (() => {
    const parts: string[] = [];
    // TODO: Smooth Skin - will be added later with WebGL processing
    // if (beautySettings.smooth > 0) parts.push(`blur(${(beautySettings.smooth / 100) * 1.2}px)`);
    if (beautySettings.brightness > 0) parts.push(`brightness(${1 + (beautySettings.brightness / 100) * 0.4})`);
    if (beautySettings.contrast > 0) parts.push(`contrast(${1 + (beautySettings.contrast / 100) * 0.4})`);
    // TODO: Big Eyes - will be added later with face detection
    // if (beautySettings.eyes > 0) parts.push(`saturate(${1 + (beautySettings.eyes / 100) * 0.5})`);
    return parts.join(' ');
  })();

  const activeFilterCss = (() => {
    if (baseFilterCss !== "none" && beautyCss) return `${baseFilterCss} ${beautyCss}`;
    if (baseFilterCss !== "none") return baseFilterCss;
    if (beautyCss) return beautyCss;
    return "none";
  })();

  const beautyOverlay = (() => {
    const overlays: string[] = [];
    // TODO: Lip Color - will be added later with face detection
    // if (beautySettings.lipColor > 0) {
    //   overlays.push(`rgba(255, 80, 120, ${(beautySettings.lipColor / 100) * 0.08})`);
    // }
    if (beautySettings.slim > 0) {
      overlays.push(`rgba(0, 0, 0, ${(beautySettings.slim / 100) * 0.06})`);
    }
    return overlays.length > 0 ? overlays[0] : "";
  })();

  interface FrameDef {
    id: string; name: string; icon: string; border?: string; shadow?: string;
    emojiSet?: string[]; sizes?: string[]; count?: number;
  }

  const FRAMES: FrameDef[] = [
    { id: "none", name: "None", icon: "✕" },
    { id: "hearts", name: "Hearts", icon: "💕", border: "4px solid #ff69b4", shadow: "inset 0 0 30px rgba(255,105,180,0.3)", emojiSet: ["💕","💗","💖","❤️","💓","💝"], sizes: ["text-sm","text-base","text-lg","text-xl","text-2xl"], count: 28 },
    { id: "stars", name: "Stars", icon: "✨", border: "4px solid #ffd700", shadow: "inset 0 0 30px rgba(255,215,0,0.25)", emojiSet: ["✨","⭐","🌟","💫"], sizes: ["text-sm","text-base","text-lg","text-xl","text-2xl"], count: 28 },
    { id: "fire", name: "Fire", icon: "🔥", border: "4px solid #ff4500", shadow: "inset 0 0 40px rgba(255,69,0,0.3)", emojiSet: ["🔥"], sizes: ["text-base","text-lg","text-xl","text-2xl"], count: 24 },
    { id: "flowers", name: "Flowers", icon: "🌸", border: "4px solid #ff8ec6", shadow: "inset 0 0 25px rgba(255,142,198,0.2)", emojiSet: ["🌸","🌺","🌷","🌻","🌹","💐"], sizes: ["text-sm","text-base","text-lg","text-xl","text-2xl"], count: 28 },
    { id: "neon-border", name: "Neon", icon: "💜", border: "3px solid #a855f7", shadow: "inset 0 0 20px rgba(168,85,247,0.4), 0 0 15px rgba(168,85,247,0.3)" },
    { id: "gold-border", name: "Gold", icon: "👑", border: "4px solid #fbbf24", shadow: "inset 0 0 20px rgba(251,191,36,0.2), 0 0 10px rgba(251,191,36,0.2)" },
    { id: "rainbow", name: "Rainbow", icon: "🌈", border: "4px solid transparent", shadow: "inset 0 0 25px rgba(255,100,100,0.15)" },
    { id: "snowflakes", name: "Snow", icon: "❄️", border: "4px solid rgba(200,230,255,0.5)", shadow: "inset 0 0 30px rgba(200,230,255,0.2)", emojiSet: ["❄️","❄️","❄️"], sizes: ["text-sm","text-base","text-lg","text-xl","text-2xl"], count: 28 },
  ];

  const generatePerimeterPositions = (count: number) => {
    const positions: { top?: string; left?: string; right?: string; bottom?: string }[] = [];
    const topCount = Math.ceil(count * 0.28);
    const rightCount = Math.ceil(count * 0.22);
    const bottomCount = Math.ceil(count * 0.28);
    const leftCount = count - topCount - rightCount - bottomCount;
    for (let i = 0; i < topCount; i++) {
      positions.push({ top: '1%', left: `${(i / (topCount - 1)) * 92 + 2}%` });
    }
    for (let i = 0; i < rightCount; i++) {
      positions.push({ top: `${(i / (rightCount + 1)) * 85 + 8}%`, right: '1%' });
    }
    for (let i = 0; i < bottomCount; i++) {
      positions.push({ bottom: '1%', left: `${((bottomCount - 1 - i) / (bottomCount - 1)) * 92 + 2}%` });
    }
    for (let i = 0; i < leftCount; i++) {
      positions.push({ top: `${((leftCount - 1 - i) / (leftCount + 1)) * 85 + 8}%`, left: '1%' });
    }
    return positions;
  };

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

  const activeFrame = FRAMES.find(f => f.id === selectedFrame);
  const activeStickers = STICKERS.filter(s => selectedSticker.includes(s.id));
  const activeArEffects = AR_EFFECTS.filter(e => selectedArEffects.includes(e.id));


  const stickerPositions = [
    { top: '8%', left: '8%' }, { top: '8%', right: '8%' },
    { bottom: '12%', left: '8%' }, { bottom: '12%', right: '8%' },
    { top: '25%', left: '50%' }, { top: '40%', right: '12%' },
    { bottom: '30%', left: '12%' }, { top: '15%', left: '30%' },
    { bottom: '25%', right: '25%' }, { top: '50%', left: '5%' },
    { bottom: '40%', right: '5%' }, { top: '35%', left: '25%' },
  ] as const;

  const videoPreview = (
    <div
      ref={previewRef}
      className="relative w-full h-full bg-gradient-to-b from-gray-900 to-black overflow-hidden rounded-none md:rounded-2xl"
      onMouseMove={(e) => { if (draggingAr) handleArDragMove(e.clientX, e.clientY); }}
      onMouseUp={handleArDragEnd}
      onMouseLeave={handleArDragEnd}
      onTouchMove={(e) => { if (draggingAr && e.touches[0]) handleArDragMove(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchEnd={handleArDragEnd}
    >
      {isCameraLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center animate-pulse">
            <Camera className="w-10 h-10 text-white/20" />
          </div>
        </div>
      ) : cameraError ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
          <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center">
            <VideoOff className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-white/70 text-center text-sm max-w-xs">{cameraError}</p>
          <button onClick={startCamera} className="px-5 py-2 bg-primary rounded-full text-white text-sm font-medium">
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
          style={{ filter: activeFilterCss !== "none" ? activeFilterCss : undefined, transition: "filter 0.4s ease" }}
        />
      )}
      {activeFilterOverlay && (
        <div className="absolute inset-0 pointer-events-none transition-colors duration-300" style={{ backgroundColor: activeFilterOverlay }} />
      )}
      {beautyOverlay && (
        <div className="absolute inset-0 pointer-events-none transition-colors duration-300 z-[1]" style={{ backgroundColor: beautyOverlay }} />
      )}
      {activeFrame && activeFrame.id !== "none" && (
        <>
          <div className="absolute inset-0 pointer-events-none z-[5] transition-all duration-300" style={{
            border: activeFrame.border,
            boxShadow: activeFrame.shadow,
            ...(activeFrame.id === "rainbow" ? { borderImage: "linear-gradient(135deg, #ff0000, #ff7700, #ffff00, #00ff00, #0077ff, #8b00ff) 1" } : {}),
          }} />
          {activeFrame.emojiSet && (() => {
            const count = activeFrame.count || 20;
            const positions = generatePerimeterPositions(count);
            const emojis = activeFrame.emojiSet!;
            const sizes = activeFrame.sizes || ["text-lg"];
            return positions.map((pos, i) => (
              <span key={i} className={`absolute pointer-events-none z-[6] ${sizes[i % sizes.length]} animate-pulse drop-shadow-md`} style={{
                ...pos,
                animationDelay: `${i * 0.15}s`,
                opacity: 0.9,
                transform: 'translate(-50%, -50%)',
              }}>{emojis[i % emojis.length]}</span>
            ));
          })()}
        </>
      )}
      {activeStickers.length > 0 && activeStickers.map((sticker, i) => (
        <span key={sticker.id} className="absolute pointer-events-none z-[7] text-3xl drop-shadow-lg" style={{
          ...stickerPositions[i % stickerPositions.length],
          animation: `float ${2 + (i % 3)}s ease-in-out infinite`,
          animationDelay: `${i * 0.5}s`,
        }}>{sticker.icon}</span>
      ))}
      {activeArEffects.map((ar) => {
        const pos = arPositions[ar.id] || { x: 50, y: 50 };
        return (
          <div
            key={ar.id}
            className={`absolute z-[8] select-none ${draggingAr === ar.id ? 'cursor-grabbing scale-110' : 'cursor-grab'}`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
              transition: draggingAr === ar.id ? 'none' : 'transform 0.15s ease',
              touchAction: 'none',
            }}
            onMouseDown={(e) => { e.preventDefault(); handleArDragStart(ar.id, e.clientX, e.clientY); }}
            onTouchStart={(e) => { if (e.touches[0]) handleArDragStart(ar.id, e.touches[0].clientX, e.touches[0].clientY); }}
          >
            <span className="text-5xl drop-shadow-2xl block" style={{ animation: draggingAr === ar.id ? 'none' : 'float 3s ease-in-out infinite' }}>{ar.icon}</span>
          </div>
        );
      })}
      {(selectedFilter || selectedFrame || selectedArEffects.length > 0) && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-lg border border-violet-500/30 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-violet-400" />
          <span className="text-white text-xs font-medium">
            {[
              selectedFilter && FILTERS.find(f => f.id === selectedFilter)?.name,
              selectedFrame && activeFrame?.name,
              ...activeArEffects.map(a => a.name),
            ].filter(Boolean).join(" + ")}
          </span>
        </div>
      )}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          onClick={flipCamera}
          className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
          data-testid="button-action-flip"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={captureThumbnail}
          disabled={cameraError !== null || isCameraLoading}
          className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-white/20 disabled:opacity-50 transition-colors"
          data-testid="button-capture-thumbnail"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
      </div>
      {thumbnail && (
        <div className="absolute top-3 left-3 z-10">
          <div className="relative">
            <img src={thumbnail} alt="Thumbnail" className="w-14 h-20 object-cover rounded-lg border border-primary shadow-lg" />
            <button onClick={() => setThumbnail(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px]">
              ✕
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const beautyPanel = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-pink-400" />
          Beauty
        </h3>
        <button onClick={() => setActivePanel(null)} className="p-1 rounded-full bg-white/10 hover:bg-white/20" data-testid="button-close-beauty">
          <X className="w-3.5 h-3.5 text-white/70" />
        </button>
      </div>
      <div className="space-y-3">
        {[
          { key: "smooth" as const, label: "Smooth Skin", icon: "✨", color: "from-pink-500 to-rose-400", comingSoon: true },
          { key: "slim" as const, label: "Face Slim", icon: "💫", color: "from-violet-500 to-purple-400" },
          { key: "eyes" as const, label: "Big Eyes", icon: "👁️", color: "from-blue-500 to-cyan-400", comingSoon: true },
          { key: "lipColor" as const, label: "Lip Color", icon: "💋", color: "from-red-500 to-pink-400", comingSoon: true },
          { key: "brightness" as const, label: "Brightness", icon: "☀️", color: "from-amber-500 to-yellow-400" },
          { key: "contrast" as const, label: "Contrast", icon: "◐", color: "from-gray-400 to-gray-600" },
        ].map(({ key, label, icon, color, comingSoon }) => (
          comingSoon ? (
            <div key={key} className="opacity-50" data-testid={`beauty-slider-${key}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/70 text-xs flex items-center gap-1.5">
                  <span>{icon}</span> {label}
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-medium">Coming Soon</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full" />
            </div>
          ) :
          <div key={key} data-testid={`beauty-slider-${key}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/70 text-xs flex items-center gap-1.5">
                <span>{icon}</span> {label}
              </span>
              <span className="text-white/40 text-[10px] font-mono">{beautySettings[key]}</span>
            </div>
            <div className="relative flex items-center touch-none" style={{ height: 24 }}>
              <div className="absolute left-0 right-0 h-1.5 bg-white/10 rounded-full overflow-hidden pointer-events-none">
                <div className={`h-full bg-gradient-to-r ${color} rounded-full`} style={{ width: `${beautySettings[key]}%` }} />
              </div>
              <input type="range" min="0" max="100" value={beautySettings[key]} onChange={(e) => updateBeauty(key, parseInt(e.target.value))} className="beauty-slider absolute w-full h-full cursor-pointer" data-testid={`beauty-range-${key}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setBeautySettings({ smooth: 0, slim: 30, eyes: 0, brightness: 10, contrast: 10, lipColor: 0 })} className="flex-1 py-2 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-medium" data-testid="button-beauty-preset-natural">Natural</button>
        <button onClick={() => setBeautySettings({ smooth: 0, slim: 60, eyes: 0, brightness: 20, contrast: 15, lipColor: 0 })} className="flex-1 py-2 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-medium" data-testid="button-beauty-preset-glam">Glam</button>
        <button onClick={() => setBeautySettings({ smooth: 0, slim: 0, eyes: 0, brightness: 0, contrast: 0, lipColor: 0 })} className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs font-medium" data-testid="button-beauty-reset">Reset</button>
      </div>
    </div>
  );

  const effectsPanel = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          Effects
        </h3>
        <button onClick={() => setActivePanel(null)} className="p-1 rounded-full bg-white/10 hover:bg-white/20" data-testid="button-close-effects">
          <X className="w-3.5 h-3.5 text-white/70" />
        </button>
      </div>

      <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
        {([
          { id: "filters" as const, label: "Filters", Icon: Palette },
          { id: "frames" as const, label: "Frames", Icon: Frame },
          { id: "stickers" as const, label: "Stickers", Icon: Sticker },
          { id: "ar" as const, label: "AR", Icon: Stars },
        ]).map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setEffectsTab(id)} className={`flex-1 py-1.5 rounded-md text-[10px] font-medium flex items-center justify-center gap-1 transition-all ${effectsTab === id ? 'bg-violet-500 text-white' : 'text-white/50 hover:text-white/70'}`} data-testid={`button-effects-tab-${id}`}>
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      {effectsTab === "filters" && (
        <div className="grid grid-cols-4 gap-2" data-testid="effects-filters-grid">
          {FILTERS.map((filter) => (
            <button key={filter.id} onClick={() => setSelectedFilter(filter.id === "none" ? null : filter.id)} className="flex flex-col items-center gap-1 group" data-testid={`button-filter-${filter.id}`}>
              <div className={`w-12 h-12 rounded-xl ${filter.gradient} transition-all ${(selectedFilter === filter.id) || (filter.id === "none" && !selectedFilter) ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-black scale-110' : 'opacity-60 group-hover:opacity-100'}`} />
              <span className={`text-[9px] ${(selectedFilter === filter.id) || (filter.id === "none" && !selectedFilter) ? 'text-violet-400 font-medium' : 'text-white/40'}`}>{filter.name}</span>
            </button>
          ))}
        </div>
      )}

      {effectsTab === "frames" && (
        <div className="grid grid-cols-3 gap-2" data-testid="effects-frames-grid">
          {FRAMES.map((frame) => (
            <button key={frame.id} onClick={() => setSelectedFrame(frame.id === "none" ? null : frame.id)} className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${(selectedFrame === frame.id) || (frame.id === "none" && !selectedFrame) ? 'bg-violet-500/15 border-violet-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} data-testid={`button-frame-${frame.id}`}>
              <span className="text-xl">{frame.icon}</span>
              <span className={`text-[9px] ${(selectedFrame === frame.id) || (frame.id === "none" && !selectedFrame) ? 'text-violet-400 font-medium' : 'text-white/40'}`}>{frame.name}</span>
            </button>
          ))}
        </div>
      )}

      {effectsTab === "stickers" && (
        <div>
          <div className="grid grid-cols-4 gap-2" data-testid="effects-stickers-grid">
            {STICKERS.map((sticker) => (
              <button key={sticker.id} onClick={() => toggleSticker(sticker.id)} className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all ${selectedSticker.includes(sticker.id) ? 'bg-violet-500/15 border-violet-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} data-testid={`button-sticker-${sticker.id}`}>
                <span className="text-xl">{sticker.icon}</span>
                <span className={`text-[9px] ${selectedSticker.includes(sticker.id) ? 'text-violet-400' : 'text-white/40'}`}>{sticker.name}</span>
              </button>
            ))}
          </div>
          {selectedSticker.length > 0 && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-white/40 text-[10px]">{selectedSticker.length} selected</span>
              <button onClick={() => setSelectedSticker([])} className="text-[10px] text-red-400" data-testid="button-clear-stickers">Clear</button>
            </div>
          )}
        </div>
      )}

      {effectsTab === "ar" && (
        <div>
          <p className="text-white/40 text-[10px] mb-2">Tap to add, drag to move (max 5)</p>
          <div className="grid grid-cols-4 gap-2" data-testid="effects-ar-grid">
            {AR_EFFECTS.map((effect) => (
              <button key={effect.id} onClick={() => toggleArEffect(effect.id)} className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all ${selectedArEffects.includes(effect.id) ? 'bg-violet-500/15 border-violet-500/50' : (effect.id === "none" && selectedArEffects.length === 0) ? 'bg-violet-500/15 border-violet-500/50' : selectedArEffects.length >= 5 ? 'bg-white/5 border-white/10 opacity-40' : 'bg-white/5 border-white/10 hover:bg-violet-500/10 hover:border-violet-500/30'}`} data-testid={`button-ar-${effect.id}`}>
                <span className="text-xl">{effect.icon}</span>
                <span className={`text-[9px] ${selectedArEffects.includes(effect.id) || (effect.id === "none" && selectedArEffects.length === 0) ? 'text-violet-400 font-medium' : 'text-white/40'}`}>{effect.name}</span>
              </button>
            ))}
          </div>
          {selectedArEffects.length > 0 && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-white/40 text-[10px]">{selectedArEffects.length}/5 selected</span>
              <button onClick={() => { setSelectedArEffects([]); setArPositions({}); }} className="text-[10px] text-red-400" data-testid="button-clear-ar">Clear all</button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const controlsContent = (
    <div className="space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a title to your stream..."
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base font-medium placeholder:text-white/30 focus:outline-none focus:border-primary/50"
        data-testid="input-title"
      />

      <div>
        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Category</p>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${category === cat ? 'bg-primary text-white' : 'bg-white/10 text-white/60 hover:bg-white/15'}`} data-testid={`button-category-${cat.toLowerCase()}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {groupId && group && (
        <div className="p-2.5 bg-violet-600/20 rounded-xl border border-violet-500/30 text-center">
          <p className="text-violet-300 text-xs">Streaming to: <span className="text-white font-bold">{group.name}</span></p>
        </div>
      )}

      {!groupId && (
        <div>
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Stream Type</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setStreamType("solo"); setRequireVip(false); }} className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl text-[10px] font-medium transition-all border ${streamType === "solo" ? 'bg-green-500/15 border-green-500/60 text-green-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`} data-testid="button-type-solo">
              <Radio className={`w-5 h-5 ${streamType === "solo" ? 'text-green-400' : 'text-white/30'}`} />
              <span className="font-bold text-xs">Solo</span>
              <span className="text-[9px] text-white/40">Free public broadcast</span>
            </button>
            <button onClick={() => { setStreamType("multi"); setRequireVip(false); }} className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl text-[10px] font-medium transition-all border ${streamType === "multi" ? 'bg-blue-500/15 border-blue-500/60 text-blue-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`} data-testid="button-type-multi">
              <UserPlus className={`w-5 h-5 ${streamType === "multi" ? 'text-blue-400' : 'text-white/30'}`} />
              <span className="font-bold text-xs">Multi-Guest</span>
              <span className="text-[9px] text-white/40">Invite guests to join</span>
            </button>
            <button onClick={() => { setStreamType("premium"); setRequireVip(false); setIsPrivate(true); }} className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl text-[10px] font-medium transition-all border ${streamType === "premium" ? 'bg-purple-500/15 border-purple-500/60 text-purple-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`} data-testid="button-type-premium">
              <Gem className={`w-5 h-5 ${streamType === "premium" ? 'text-purple-400' : 'text-white/30'}`} />
              <span className="font-bold text-xs">Premium</span>
              <span className="text-[9px] text-white/40">Paid access stream</span>
            </button>
            <button onClick={() => { setStreamType("vip"); setRequireVip(true); }} className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl text-[10px] font-medium transition-all border ${streamType === "vip" ? 'bg-yellow-500/15 border-yellow-500/60 text-yellow-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`} data-testid="button-type-vip">
              <Crown className={`w-5 h-5 ${streamType === "vip" ? 'text-yellow-400' : 'text-white/30'}`} />
              <span className="font-bold text-xs">VIP Only</span>
              <span className="text-[9px] text-white/40">VIP members only</span>
            </button>
          </div>

          {streamType === "solo" && (
            <div className="mt-3">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Visibility</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => setIsPrivate(false)} className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-[10px] font-medium transition-all border ${!isPrivate ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`} data-testid="button-access-public">
                  <Eye className="w-3.5 h-3.5" /> Public
                </button>
                <button onClick={() => setIsPrivate(true)} className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-[10px] font-medium transition-all border ${isPrivate ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`} data-testid="button-access-private">
                  <Lock className="w-3.5 h-3.5" /> Private
                </button>
              </div>
            </div>
          )}

          {streamType === "multi" && (
            <div className="mt-3 rounded-xl p-3 bg-blue-500/10 border border-blue-500/20">
              <div className="flex gap-2">
                <UserPlus className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-blue-300 text-xs font-semibold mb-0.5">Multi-Guest Broadcast</p>
                  <p className="text-white/50 text-[10px] leading-relaxed">Viewers can request to join your stream. You'll be able to accept or decline requests while live.</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Visibility</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => setIsPrivate(false)} className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-all border ${!isPrivate ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-white/50'}`} data-testid="button-multi-public">
                    <Eye className="w-3 h-3" /> Public
                  </button>
                  <button onClick={() => setIsPrivate(true)} className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-all border ${isPrivate ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-white/50'}`} data-testid="button-multi-private">
                    <Lock className="w-3 h-3" /> Private
                  </button>
                </div>
              </div>
            </div>
          )}

          {streamType === "premium" && (
            <div className="mt-3 rounded-xl p-3 bg-purple-500/10 border border-purple-500/20">
              <div className="flex gap-2">
                <Gem className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-purple-300 text-xs font-semibold mb-0.5">Premium Broadcast</p>
                  <p className="text-white/50 text-[10px] leading-relaxed">Only users who pay can access this stream. Set your price and earn from your content.</p>
                </div>
              </div>
            </div>
          )}

          {streamType === "vip" && (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl p-3 bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex gap-2">
                  <Crown className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-yellow-300 text-xs font-semibold mb-0.5">VIP Only Broadcast</p>
                    <p className="text-white/50 text-[10px] leading-relaxed">Stream thumbnail visible to everyone, but only VIP members at the required tier can watch. Non-VIP users will see an upgrade prompt.</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-white/50 text-[10px] uppercase tracking-wider mb-2">Minimum VIP Tier Required</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((tier) => (
                    <button key={tier} onClick={() => setMinVipTier(tier)} className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${minVipTier === tier ? 'bg-gradient-to-b from-yellow-400 to-amber-600 text-white shadow-lg shadow-yellow-500/20' : tier < minVipTier ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-white/30 border border-white/10'}`} data-testid={`button-vip-tier-${tier}`}>
                      <Crown className={`w-3 h-3 ${minVipTier === tier ? 'text-white' : tier < minVipTier ? 'text-yellow-400' : 'text-white/20'}`} />
                      <span>{tier}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {groupId && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium bg-violet-500/20 border border-violet-500 text-violet-400">
            <UsersIcon className="w-4 h-4" /> Group Only
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-white/70 text-xs">
              {user?.country ? (COUNTRIES_MAP[user.country] || user.country) : 'No location'}
            </span>
          </div>
          <Shield className="w-3 h-3 text-white/20" />
        </div>
        {user?.country && (
          <button onClick={() => setShowCountryOnStream(!showCountryOnStream)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${showCountryOnStream ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`} data-testid="button-toggle-country-visibility">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-white/50" />
              <span className="text-white/70 text-xs">Show country</span>
            </div>
            <div className={`w-9 h-[18px] rounded-full transition-all relative ${showCountryOnStream ? 'bg-green-500' : 'bg-white/20'}`}>
              <div className={`absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${showCountryOnStream ? 'left-[18px]' : 'left-[2px]'}`} />
            </div>
          </button>
        )}

        <button onClick={() => setBlockLinks(!blockLinks)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${blockLinks ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`} data-testid="button-toggle-block-links">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-3.5 h-3.5 text-white/50" />
            <span className="text-white/70 text-xs">Block links in chat</span>
          </div>
          <div className={`w-9 h-[18px] rounded-full transition-all relative ${blockLinks ? 'bg-red-500' : 'bg-white/20'}`}>
            <div className={`absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${blockLinks ? 'left-[18px]' : 'left-[2px]'}`} />
          </div>
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setActivePanel(activePanel === "beauty" ? null : "beauty")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all border ${activePanel === "beauty" ? 'bg-pink-500/20 border-pink-500/50 text-pink-400' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`} data-testid="button-action-beauty">
          <Wand2 className="w-3.5 h-3.5" /> Beauty
        </button>
        <button onClick={() => setActivePanel(activePanel === "effects" ? null : "effects")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all border ${activePanel === "effects" ? 'bg-violet-500/20 border-violet-500/50 text-violet-400' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`} data-testid="button-action-effects">
          <Sparkles className="w-3.5 h-3.5" /> Effects
        </button>
        <button onClick={handleShare} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-all" data-testid="button-action-share">
          {linkCopied ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied</> : <><Share2 className="w-3.5 h-3.5" /> Share</>}
        </button>
      </div>

      {activePanel === "beauty" && beautyPanel}
      {activePanel === "effects" && effectsPanel}

      <button
        onClick={handleGoLive}
        disabled={!title.trim() || isStarting || !user}
        className="w-full py-3.5 rounded-full bg-gradient-to-r from-primary to-accent text-white font-bold text-base shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        data-testid="button-go-live"
      >
        {isStarting ? 'Starting...' : 'Go Live'}
      </button>

      {!user && (
        <p className="text-center text-white/50 text-xs">Please log in to start streaming</p>
      )}
    </div>
  );

  return (
    <GuestGate>
    <div className="fixed inset-0 bg-black z-50">
      {/* Close button */}
      <button
        onClick={() => {
          if (stream) stream.getTracks().forEach(track => track.stop());
          setLocation("/");
        }}
        className="absolute top-4 left-4 z-30 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-white/10"
        data-testid="button-close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Responsive: mobile vertical stack / desktop side-by-side 40/60 */}
      <div className="flex flex-col md:flex-row h-full">
        <div className="h-[40%] min-h-[200px] shrink-0 md:h-full md:w-[40%] md:p-3 md:pr-1.5">
          {videoPreview}
        </div>
        <div className="flex-1 overflow-y-auto p-4 pt-3 bg-gray-950 md:bg-transparent md:w-[60%] md:p-3 md:pl-1.5 md:flex-none md:h-full">
          <div className="md:bg-gray-950/80 md:backdrop-blur-xl md:rounded-2xl md:p-5 md:border md:border-white/10 md:h-full md:overflow-y-auto scrollbar-hide">
            {controlsContent}
          </div>
        </div>
      </div>

      <LocationPickerModal
        open={showLocationPicker}
        onSelect={handleLocationSelect}
        onSkip={handleLocationSkip}
      />
    </div>
    </GuestGate>
  );
}
