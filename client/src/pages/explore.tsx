import Layout from "@/components/layout";
import SearchOverlay from "@/components/search-overlay";
import { Search, Flame, MapPin, Loader2, Eye, Calendar } from "lucide-react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import type { Stream, User } from "@shared/schema";

const formatViewers = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

function isFeatured(index: number): boolean {
  return index % 7 === 0;
}

function ExploreStreamCard({ stream, featured, rank }: { stream: Stream & { user: User }; featured: boolean; rank?: number }) {
  return (
    <Link href={`/live/${stream.id}`} className="block">
      <div
        className="relative group cursor-pointer overflow-hidden rounded-xl bg-muted aspect-[3/4]"
        data-testid={`card-stream-${stream.id}`}
      >
        <img
          src={stream.thumbnail || stream.user.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${stream.id}`}
          alt={stream.title || stream.user.username}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          data-testid={`img-stream-${stream.id}`}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        {stream.isLive && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
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
          <div className="absolute top-2 right-2 z-10">
            <span className="text-lg">
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
            </span>
          </div>
        )}

        {stream.isPKBattle && (
          <div className="absolute top-2 right-2 bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded z-10 flex items-center gap-1">
            ⚔️ BATTLE
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
          <div className="flex items-center gap-2">
            <div className="relative flex-shrink-0">
              <img
                src={stream.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.user.username}`}
                className={`rounded-full border-2 ${stream.user.vipTier >= 3 ? 'border-purple-400' : stream.user.vipTier >= 2 ? 'border-yellow-400' : 'border-pink-500'} ${featured ? 'w-8 h-8' : 'w-6 h-6'}`}
                alt={stream.user.username}
              />
              {stream.user.level && (
                <span className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white text-[7px] font-bold px-0.5 rounded-full min-w-[12px] text-center leading-[14px]">
                  {stream.user.level}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-white truncate ${featured ? 'text-sm' : 'text-xs'}`} data-testid={`text-username-${stream.id}`}>
                {stream.user.username}
                {stream.user.isVerified && <span className="ml-1 text-blue-400">✓</span>}
              </p>
              {featured && stream.title && (
                <p className="text-white/70 text-[11px] truncate">{stream.title}</p>
              )}
            </div>
          </div>

          {stream.category && (
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[9px] font-medium px-2 py-0.5 rounded-full mt-1.5">
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
    return activeTab === 'new' ? realNewStreams
      : activeTab === 'popular' ? realPopularStreams
      : nearbyStreams ?? [];
  }, [activeTab, realNewStreams, realPopularStreams, nearbyStreams]);

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
          <Link href="/events">
            <button
              className="flex items-center gap-1.5 pb-2 font-medium transition-colors relative text-muted-foreground hover:text-foreground/80"
              data-testid="button-tab-events"
            >
              📅 Events
            </button>
          </Link>
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
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-muted animate-pulse aspect-[3/4]"
                  />
                ))}
              </div>
            ) : (
              <>
                {displayStreams.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Flame className="w-12 h-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm font-medium">No live streams right now</p>
                    <p className="text-muted-foreground/60 text-xs mt-1">Check back soon or go live yourself!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                    {displayStreams.map((stream, index) => {
                      const popularRank = activeTab === 'popular' ? index + 1 : undefined;
                      return (
                        <ExploreStreamCard
                          key={stream.id}
                          stream={stream}
                          featured={isFeatured(index)}
                          rank={popularRank}
                        />
                      );
                    })}
                  </div>
                )}
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
