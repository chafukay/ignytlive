import Layout from "@/components/layout";
import SearchOverlay from "@/components/search-overlay";
import { Search, Flame, MapPin, Loader2, Eye, Volume2, VolumeX } from "lucide-react";
import StreamCard from "@/components/stream-card";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "wouter";
import type { Stream, User } from "@shared/schema";

const DUMMY_STREAMS: any[] = [
  {
    id: "demo-1", userId: "demo-u1", title: "Late Night Vibes 🌙", thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop",
    isLive: true, viewersCount: 12400, category: "Music", description: "", isPKBattle: false, pkBattleId: null, latitude: null, longitude: null,
    createdAt: new Date(), updatedAt: new Date(), tags: [], agoraChannelName: null, agoraToken: null,
    user: { id: "demo-u1", username: "DJ_Luna", displayName: "DJ Luna", email: "luna@demo.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna", bio: "Music producer", level: 42, xp: 5000, coins: 1000, diamonds: 500, role: "user", vipTier: "gold", isVerified: true, followersCount: 85000, followingCount: 120, totalLikes: 230000, totalGiftsReceived: 15000, dndEnabled: false, password: null, phone: null, birthdate: null, gender: null, country: null, createdAt: new Date(), lastLoginDate: null, loginStreak: 0, lastStreakClaimDate: null, profileViews: 0, referralCode: null, referredBy: null, wealthLevel: 5, replitId: null }
  },
  {
    id: "demo-2", userId: "demo-u2", title: "Cooking Masterclass 🍳", thumbnail: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=500&fit=crop",
    isLive: true, viewersCount: 8700, category: "Cooking", description: "", isPKBattle: false, pkBattleId: null, latitude: null, longitude: null,
    createdAt: new Date(), updatedAt: new Date(), tags: [], agoraChannelName: null, agoraToken: null,
    user: { id: "demo-u2", username: "ChefMaria", displayName: "Chef Maria", email: "maria@demo.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria", bio: "Pro chef", level: 35, xp: 3500, coins: 800, diamonds: 300, role: "user", vipTier: "silver", isVerified: true, followersCount: 42000, followingCount: 200, totalLikes: 90000, totalGiftsReceived: 8000, dndEnabled: false, password: null, phone: null, birthdate: null, gender: null, country: null, createdAt: new Date(), lastLoginDate: null, loginStreak: 0, lastStreakClaimDate: null, profileViews: 0, referralCode: null, referredBy: null, wealthLevel: 3, replitId: null }
  },
  {
    id: "demo-3", userId: "demo-u3", title: "Gaming Tournament 🎮", thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=400&fit=crop",
    isLive: true, viewersCount: 45200, category: "Gaming", description: "", isPKBattle: true, pkBattleId: null, latitude: null, longitude: null,
    createdAt: new Date(), updatedAt: new Date(), tags: [], agoraChannelName: null, agoraToken: null,
    user: { id: "demo-u3", username: "ProGamer99", displayName: "ProGamer", email: "gamer@demo.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Gamer", bio: "Esports", level: 58, xp: 9000, coins: 5000, diamonds: 2000, role: "user", vipTier: "diamond", isVerified: true, followersCount: 250000, followingCount: 50, totalLikes: 800000, totalGiftsReceived: 50000, dndEnabled: false, password: null, phone: null, birthdate: null, gender: null, country: null, createdAt: new Date(), lastLoginDate: null, loginStreak: 0, lastStreakClaimDate: null, profileViews: 0, referralCode: null, referredBy: null, wealthLevel: 7, replitId: null }
  },
  {
    id: "demo-4", userId: "demo-u4", title: "Sunset Yoga Flow 🧘", thumbnail: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=600&fit=crop",
    isLive: true, viewersCount: 3200, category: "Fitness", description: "", isPKBattle: false, pkBattleId: null, latitude: null, longitude: null,
    createdAt: new Date(), updatedAt: new Date(), tags: [], agoraChannelName: null, agoraToken: null,
    user: { id: "demo-u4", username: "YogaWithSara", displayName: "Sara", email: "sara@demo.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara", bio: "Yoga", level: 28, xp: 2800, coins: 600, diamonds: 200, role: "user", vipTier: null, isVerified: false, followersCount: 15000, followingCount: 300, totalLikes: 45000, totalGiftsReceived: 3000, dndEnabled: false, password: null, phone: null, birthdate: null, gender: null, country: null, createdAt: new Date(), lastLoginDate: null, loginStreak: 0, lastStreakClaimDate: null, profileViews: 0, referralCode: null, referredBy: null, wealthLevel: 2, replitId: null }
  },
  {
    id: "demo-5", userId: "demo-u5", title: "Digital Art Live ✨", thumbnail: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=500&fit=crop",
    isLive: true, viewersCount: 6800, category: "Art", description: "", isPKBattle: false, pkBattleId: null, latitude: null, longitude: null,
    createdAt: new Date(), updatedAt: new Date(), tags: [], agoraChannelName: null, agoraToken: null,
    user: { id: "demo-u5", username: "ArtByKai", displayName: "Kai", email: "kai@demo.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kai", bio: "Artist", level: 31, xp: 3100, coins: 900, diamonds: 400, role: "user", vipTier: "gold", isVerified: true, followersCount: 67000, followingCount: 150, totalLikes: 180000, totalGiftsReceived: 12000, dndEnabled: false, password: null, phone: null, birthdate: null, gender: null, country: null, createdAt: new Date(), lastLoginDate: null, loginStreak: 0, lastStreakClaimDate: null, profileViews: 0, referralCode: null, referredBy: null, wealthLevel: 4, replitId: null }
  },
  {
    id: "demo-6", userId: "demo-u6", title: "Street Fashion 👗", thumbnail: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=600&fit=crop",
    isLive: true, viewersCount: 19300, category: "Fashion", description: "", isPKBattle: false, pkBattleId: null, latitude: null, longitude: null,
    createdAt: new Date(), updatedAt: new Date(), tags: [], agoraChannelName: null, agoraToken: null,
    user: { id: "demo-u6", username: "StyleQueen", displayName: "Bella", email: "bella@demo.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bella", bio: "Fashion", level: 45, xp: 4500, coins: 2000, diamonds: 800, role: "user", vipTier: "diamond", isVerified: true, followersCount: 120000, followingCount: 80, totalLikes: 400000, totalGiftsReceived: 25000, dndEnabled: false, password: null, phone: null, birthdate: null, gender: null, country: null, createdAt: new Date(), lastLoginDate: null, loginStreak: 0, lastStreakClaimDate: null, profileViews: 0, referralCode: null, referredBy: null, wealthLevel: 6, replitId: null }
  },
  {
    id: "demo-7", userId: "demo-u7", title: "Guitar Jam Session 🎸", thumbnail: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=400&fit=crop",
    isLive: true, viewersCount: 5500, category: "Music", description: "", isPKBattle: false, pkBattleId: null, latitude: null, longitude: null,
    createdAt: new Date(), updatedAt: new Date(), tags: [], agoraChannelName: null, agoraToken: null,
    user: { id: "demo-u7", username: "GuitarHero", displayName: "Jake", email: "jake@demo.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jake", bio: "Musician", level: 22, xp: 2200, coins: 400, diamonds: 150, role: "user", vipTier: null, isVerified: false, followersCount: 8000, followingCount: 500, totalLikes: 22000, totalGiftsReceived: 2000, dndEnabled: false, password: null, phone: null, birthdate: null, gender: null, country: null, createdAt: new Date(), lastLoginDate: null, loginStreak: 0, lastStreakClaimDate: null, profileViews: 0, referralCode: null, referredBy: null, wealthLevel: 1, replitId: null }
  },
  {
    id: "demo-8", userId: "demo-u8", title: "Travel Vlog Tokyo 🗼", thumbnail: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=500&fit=crop",
    isLive: true, viewersCount: 15800, category: "Travel", description: "", isPKBattle: false, pkBattleId: null, latitude: null, longitude: null,
    createdAt: new Date(), updatedAt: new Date(), tags: [], agoraChannelName: null, agoraToken: null,
    user: { id: "demo-u8", username: "WanderLust", displayName: "Alex", email: "alex@demo.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex", bio: "Traveler", level: 38, xp: 3800, coins: 1200, diamonds: 600, role: "user", vipTier: "gold", isVerified: true, followersCount: 95000, followingCount: 100, totalLikes: 300000, totalGiftsReceived: 18000, dndEnabled: false, password: null, phone: null, birthdate: null, gender: null, country: null, createdAt: new Date(), lastLoginDate: null, loginStreak: 0, lastStreakClaimDate: null, profileViews: 0, referralCode: null, referredBy: null, wealthLevel: 5, replitId: null }
  },
  {
    id: "demo-9", userId: "demo-u9", title: "Comedy Night 😂", thumbnail: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=400&h=600&fit=crop",
    isLive: true, viewersCount: 28900, category: "Entertainment", description: "", isPKBattle: false, pkBattleId: null, latitude: null, longitude: null,
    createdAt: new Date(), updatedAt: new Date(), tags: [], agoraChannelName: null, agoraToken: null,
    user: { id: "demo-u9", username: "FunnyMax", displayName: "Max", email: "max@demo.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max", bio: "Comedian", level: 50, xp: 7000, coins: 3000, diamonds: 1500, role: "user", vipTier: "diamond", isVerified: true, followersCount: 180000, followingCount: 60, totalLikes: 600000, totalGiftsReceived: 35000, dndEnabled: false, password: null, phone: null, birthdate: null, gender: null, country: null, createdAt: new Date(), lastLoginDate: null, loginStreak: 0, lastStreakClaimDate: null, profileViews: 0, referralCode: null, referredBy: null, wealthLevel: 6, replitId: null }
  },
  {
    id: "demo-10", userId: "demo-u10", title: "Meditation & Chill 🕯️", thumbnail: "https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=400&h=400&fit=crop",
    isLive: true, viewersCount: 2100, category: "Wellness", description: "", isPKBattle: false, pkBattleId: null, latitude: null, longitude: null,
    createdAt: new Date(), updatedAt: new Date(), tags: [], agoraChannelName: null, agoraToken: null,
    user: { id: "demo-u10", username: "ZenMaster", displayName: "Zara", email: "zara@demo.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zara", bio: "Mindfulness", level: 19, xp: 1900, coins: 300, diamonds: 100, role: "user", vipTier: null, isVerified: false, followersCount: 5000, followingCount: 400, totalLikes: 12000, totalGiftsReceived: 1000, dndEnabled: false, password: null, phone: null, birthdate: null, gender: null, country: null, createdAt: new Date(), lastLoginDate: null, loginStreak: 0, lastStreakClaimDate: null, profileViews: 0, referralCode: null, referredBy: null, wealthLevel: 1, replitId: null }
  },
  {
    id: "demo-11", userId: "demo-u11", title: "Dance Battle 💃", thumbnail: "https://images.unsplash.com/photo-1547153760-18fc86324498?w=400&h=600&fit=crop",
    isLive: true, viewersCount: 34600, category: "Dance", description: "", isPKBattle: true, pkBattleId: null, latitude: null, longitude: null,
    createdAt: new Date(), updatedAt: new Date(), tags: [], agoraChannelName: null, agoraToken: null,
    user: { id: "demo-u11", username: "DanceQueen", displayName: "Mia", email: "mia@demo.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia", bio: "Dancer", level: 55, xp: 8500, coins: 4000, diamonds: 1800, role: "user", vipTier: "diamond", isVerified: true, followersCount: 210000, followingCount: 70, totalLikes: 750000, totalGiftsReceived: 42000, dndEnabled: false, password: null, phone: null, birthdate: null, gender: null, country: null, createdAt: new Date(), lastLoginDate: null, loginStreak: 0, lastStreakClaimDate: null, profileViews: 0, referralCode: null, referredBy: null, wealthLevel: 7, replitId: null }
  },
  {
    id: "demo-12", userId: "demo-u12", title: "Makeup Tutorial 💄", thumbnail: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=500&fit=crop",
    isLive: true, viewersCount: 11200, category: "Beauty", description: "", isPKBattle: false, pkBattleId: null, latitude: null, longitude: null,
    createdAt: new Date(), updatedAt: new Date(), tags: [], agoraChannelName: null, agoraToken: null,
    user: { id: "demo-u12", username: "GlamGirl", displayName: "Lily", email: "lily@demo.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lily", bio: "Beauty guru", level: 33, xp: 3300, coins: 700, diamonds: 350, role: "user", vipTier: "silver", isVerified: true, followersCount: 55000, followingCount: 180, totalLikes: 150000, totalGiftsReceived: 9000, dndEnabled: false, password: null, phone: null, birthdate: null, gender: null, country: null, createdAt: new Date(), lastLoginDate: null, loginStreak: 0, lastStreakClaimDate: null, profileViews: 0, referralCode: null, referredBy: null, wealthLevel: 3, replitId: null }
  },
];

const formatViewers = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

type GridSize = 'large' | 'medium' | 'small';

const GRID_PATTERN: GridSize[] = [
  'large', 'small',
  'small', 'large',
  'medium', 'medium',
  'large', 'small',
  'small', 'large',
  'medium', 'medium',
];

function ExploreStreamCard({ stream, size, rank }: { stream: Stream & { user: User }; size: GridSize; rank?: number }) {
  const aspectClass = size === 'large' ? 'row-span-2' : '';
  const heightClass = size === 'large' ? 'min-h-[420px]' : size === 'medium' ? 'min-h-[240px]' : 'min-h-[200px]';

  return (
    <Link href={`/live/${stream.id}`}>
      <div
        className={`relative group cursor-pointer overflow-hidden rounded-2xl bg-muted ${aspectClass} ${heightClass}`}
        data-testid={`card-stream-${stream.id}`}
      >
        <img
          src={stream.thumbnail || stream.user.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${stream.id}`}
          alt={stream.title || stream.user.username}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          data-testid={`img-stream-${stream.id}`}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {stream.isLive && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
            <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatViewers(stream.viewersCount)}
            </span>
          </div>
        )}

        {rank && rank <= 3 && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className={`text-lg ${rank === 1 ? '' : rank === 2 ? '' : ''}`}>
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
            </span>
          </div>
        )}

        {stream.isPKBattle && (
          <div className="absolute top-2.5 right-2.5 bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded z-10 flex items-center gap-1">
            ⚔️ BATTLE
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="relative flex-shrink-0">
              <img
                src={stream.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.user.username}`}
                className={`rounded-full border-2 ${stream.user.vipTier >= 3 ? 'border-purple-400' : stream.user.vipTier >= 2 ? 'border-yellow-400' : 'border-pink-500'} ${size === 'large' ? 'w-8 h-8' : 'w-6 h-6'}`}
                alt={stream.user.username}
              />
              {stream.user.level && (
                <span className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white text-[7px] font-bold px-0.5 rounded-full min-w-[12px] text-center leading-[14px]">
                  {stream.user.level}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-white truncate ${size === 'large' ? 'text-sm' : 'text-xs'}`} data-testid={`text-username-${stream.id}`}>
                {stream.user.username}
                {stream.user.isVerified && <span className="ml-1">✓</span>}
              </p>
              {size === 'large' && stream.title && (
                <p className="text-white/70 text-[10px] truncate">{stream.title}</p>
              )}
            </div>
          </div>

          {size !== 'small' && stream.category && (
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[9px] font-medium px-2 py-0.5 rounded-full mt-1">
              {stream.category}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Explore() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'new' | 'nearby' | 'popular'>('new');
  const [showSearch, setShowSearch] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'nearby' && !userLocation && !locationError) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationLoading(false);
        },
        () => {
          setLocationError(true);
          setLocationLoading(false);
        },
        { timeout: 10000 }
      );
    }
  }, [activeTab, userLocation, locationError]);

  const {
    data: newData,
    isLoading: newLoading,
    fetchNextPage: fetchNextNew,
    hasNextPage: hasNextNew,
    isFetchingNextPage: isFetchingNextNew,
  } = useInfiniteQuery({
    queryKey: ['liveStreams', 'new'],
    queryFn: ({ pageParam }) => api.getLiveStreams(20, 'new', pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: activeTab === 'new',
  });

  const {
    data: popularData,
    isLoading: popularLoading,
    fetchNextPage: fetchNextPopular,
    hasNextPage: hasNextPopular,
    isFetchingNextPage: isFetchingNextPopular,
  } = useInfiniteQuery({
    queryKey: ['liveStreams', 'popular'],
    queryFn: ({ pageParam }) => api.getLiveStreams(20, 'popular', pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: activeTab === 'popular',
  });

  const { data: nearbyStreams, isLoading: nearbyLoading } = useQuery({
    queryKey: ['nearbyStreams', userLocation?.lat, userLocation?.lng],
    queryFn: () => api.getNearbyStreams(userLocation!.lat, userLocation!.lng, 500),
    enabled: activeTab === 'nearby' && !!userLocation,
  });

  const realNewStreams = newData?.pages.flatMap(p => p.streams) ?? [];
  const realPopularStreams = popularData?.pages.flatMap(p => p.streams) ?? [];

  const displayStreams = useMemo(() => {
    const real = activeTab === 'new' ? realNewStreams
      : activeTab === 'popular' ? realPopularStreams
      : nearbyStreams ?? [];

    if (real.length > 0) return real;
    return DUMMY_STREAMS;
  }, [activeTab, realNewStreams, realPopularStreams, nearbyStreams]);

  const isDummy = displayStreams === DUMMY_STREAMS;

  const isLoading = activeTab === 'new' ? newLoading
    : activeTab === 'popular' ? popularLoading
    : nearbyLoading || locationLoading;

  const hasNextPage = activeTab === 'new' ? hasNextNew
    : activeTab === 'popular' ? hasNextPopular
    : false;

  const isFetchingNextPage = activeTab === 'new' ? isFetchingNextNew
    : activeTab === 'popular' ? isFetchingNextPopular
    : false;

  const fetchNextPage = activeTab === 'new' ? fetchNextNew
    : activeTab === 'popular' ? fetchNextPopular
    : undefined;

  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && fetchNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(observerCallback, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [observerCallback]);

  return (
    <Layout>
      <div className="p-3 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4 pt-2">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"}
              alt="Profile"
              className="w-10 h-10 rounded-full"
              data-testid="img-user-avatar"
            />
            <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1.5 rounded-full">
              <span className="text-yellow-400">💰</span>
              <span className="text-yellow-400 text-sm font-bold" data-testid="text-coin-balance">{user?.coins?.toLocaleString() || 0}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(true)}
              data-testid="button-search"
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
            >
              <Search className="w-5 h-5 text-foreground" />
            </button>
            <Link href="/leaderboard">
              <button className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80" data-testid="button-leaderboard">
                <Flame className="w-5 h-5 text-orange-400" />
              </button>
            </Link>
          </div>
        </div>

        <SearchOverlay open={showSearch} onClose={() => setShowSearch(false)} />

        <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">💎</div>
            <div>
              <p className="text-white font-bold">GET 100% BONUS</p>
              <p className="text-white/80 text-sm">WITH CRYPTO!</p>
            </div>
          </div>
          <Link href="/coins">
            <button className="bg-white text-black font-bold px-4 py-2 rounded-full text-sm hover:scale-105 transition-transform" data-testid="button-grab-bonus">
              Grab Now
            </button>
          </Link>
        </div>

        <div className="flex gap-6 mb-5 border-b border-border pb-3">
          {[
            { id: 'new', label: 'New', icon: '⭐' },
            { id: 'nearby', label: 'Nearby', icon: '📍' },
            { id: 'popular', label: 'Popular', icon: '🔥' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 pb-2 font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/80'
              }`}
              data-testid={`button-tab-${tab.id}`}
            >
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {activeTab === 'nearby' && locationError && (
          <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="location-error">
            <MapPin className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm font-medium">Location access needed</p>
            <p className="text-muted-foreground/60 text-xs mt-1 max-w-xs">
              Allow location access in your browser to see streams near you
            </p>
            <button
              onClick={() => { setLocationError(false); setUserLocation(null); }}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium"
              data-testid="button-retry-location"
            >
              Try Again
            </button>
          </div>
        )}

        {activeTab === 'nearby' && locationLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-muted-foreground text-sm">Getting your location...</p>
          </div>
        )}

        {!(activeTab === 'nearby' && (locationError || locationLoading)) && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 auto-rows-[200px]">
                {[...Array(8)].map((_, i) => {
                  const pattern = GRID_PATTERN[i % GRID_PATTERN.length];
                  return (
                    <div
                      key={i}
                      className={`rounded-2xl bg-muted animate-pulse ${pattern === 'large' ? 'row-span-2' : ''}`}
                    />
                  );
                })}
              </div>
            ) : (
              <>
                {isDummy && (
                  <div className="mb-3 px-1">
                    <p className="text-muted-foreground/60 text-xs text-center">Preview with sample streams</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-1.5 auto-rows-[160px]">
                  {displayStreams.map((stream, index) => {
                    const sizePattern = GRID_PATTERN[index % GRID_PATTERN.length];
                    const popularRank = activeTab === 'popular' ? index + 1 : undefined;
                    return (
                      <ExploreStreamCard
                        key={stream.id}
                        stream={stream}
                        size={sizePattern}
                        rank={popularRank}
                      />
                    );
                  })}
                </div>
              </>
            )}

            <div ref={loadMoreRef} className="py-4 flex justify-center">
              {isFetchingNextPage && (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
