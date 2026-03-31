import Layout from "@/components/layout";
import StreamCard from "@/components/stream-card";
import UserAvatar from "@/components/user-avatar";
import SearchOverlay from "@/components/search-overlay";
import { useQuery } from "@tanstack/react-query";
import { api, SuggestedUser } from "@/lib/api";
import { Search, Bell, Calendar, Globe, Video, Sparkles, Users, Swords, Gamepad2, ChevronDown, X, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { useState, useEffect, useRef, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";

const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸", region: "Americas" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", region: "Europe" },
  { code: "CA", name: "Canada", flag: "🇨🇦", region: "Americas" },
  { code: "AU", name: "Australia", flag: "🇦🇺", region: "Oceania" },
  { code: "DE", name: "Germany", flag: "🇩🇪", region: "Europe" },
  { code: "FR", name: "France", flag: "🇫🇷", region: "Europe" },
  { code: "JP", name: "Japan", flag: "🇯🇵", region: "Asia" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", region: "Asia" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", region: "Americas" },
  { code: "IN", name: "India", flag: "🇮🇳", region: "Asia" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", region: "Americas" },
  { code: "ES", name: "Spain", flag: "🇪🇸", region: "Europe" },
  { code: "IT", name: "Italy", flag: "🇮🇹", region: "Europe" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", region: "Europe" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", region: "Europe" },
  { code: "NO", name: "Norway", flag: "🇳🇴", region: "Europe" },
  { code: "DK", name: "Denmark", flag: "🇩🇰", region: "Europe" },
  { code: "FI", name: "Finland", flag: "🇫🇮", region: "Europe" },
  { code: "PL", name: "Poland", flag: "🇵🇱", region: "Europe" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", region: "Europe" },
  { code: "RU", name: "Russia", flag: "🇷🇺", region: "Europe" },
  { code: "CN", name: "China", flag: "🇨🇳", region: "Asia" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼", region: "Asia" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", region: "Asia" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", region: "Asia" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", region: "Asia" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", region: "Asia" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", region: "Asia" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", region: "Asia" },
  { code: "AE", name: "UAE", flag: "🇦🇪", region: "Middle East" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", region: "Middle East" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", region: "Africa" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", region: "Africa" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", region: "Africa" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", region: "Africa" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", region: "Americas" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", region: "Americas" },
  { code: "CL", name: "Chile", flag: "🇨🇱", region: "Americas" },
  { code: "PE", name: "Peru", flag: "🇵🇪", region: "Americas" },
  { code: "TR", name: "Turkey", flag: "🇹🇷", region: "Europe" },
  { code: "IL", name: "Israel", flag: "🇮🇱", region: "Middle East" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", region: "Asia" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", region: "Asia" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", region: "Oceania" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", region: "Europe" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", region: "Europe" },
  { code: "AT", name: "Austria", flag: "🇦🇹", region: "Europe" },
  { code: "BE", name: "Belgium", flag: "🇧🇪", region: "Europe" },
  { code: "GR", name: "Greece", flag: "🇬🇷", region: "Europe" },
  { code: "RO", name: "Romania", flag: "🇷🇴", region: "Europe" },
];

const REGIONS = ["All", "Americas", "Europe", "Asia", "Middle East", "Africa", "Oceania"];

const STREAM_TABS = [
  { id: 'popular', label: 'Popular', icon: null },
  { id: 'video-call', label: 'Video Call', icon: Video },
  { id: 'countries', label: 'Countries', icon: Globe },
  { id: 'new', label: 'New', icon: Sparkles },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'in-battle', label: 'In battle', icon: Swords },
  { id: 'multi-guest', label: 'Multi-Guest', icon: Gamepad2 },
];

export default function Home() {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState('popular');
  const [showSearch, setShowSearch] = useState(false);
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(() => {
    if (user?.preferredCountry) {
      try {
        return JSON.parse(user.preferredCountry);
      } catch { return []; }
    }
    return [];
  });
  const [countrySearch, setCountrySearch] = useState('');
  const [activeRegion, setActiveRegion] = useState('All');
  const tabDropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const countrySearchRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const previousLiveStreamersRef = useRef<Set<string>>(new Set());

  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(c => {
      const matchesRegion = activeRegion === 'All' || c.region === activeRegion;
      const matchesSearch = !countrySearch || c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase());
      return matchesRegion && matchesSearch;
    });
  }, [activeRegion, countrySearch]);

  const toggleCountry = (code: string) => {
    setSelectedCountries(prev => {
      const updated = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code];
      if (user?.id) {
        api.updateUser(user.id, { preferredCountry: JSON.stringify(updated) }).catch(() => {});
      }
      return updated;
    });
  };

  useEffect(() => {
    if (showCountryDropdown && countrySearchRef.current) {
      countrySearchRef.current.focus();
    }
  }, [showCountryDropdown]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tabDropdownRef.current && !tabDropdownRef.current.contains(e.target as Node)) {
        setShowTabDropdown(false);
      }
    };
    if (showTabDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTabDropdown]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
      }
    };
    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCountryDropdown]);

  const { data: liveStreamsData, isLoading, isError: streamsError, refetch: refetchStreams } = useQuery({
    queryKey: ['liveStreams'],
    queryFn: () => api.getLiveStreams(),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
  const liveStreams = liveStreamsData?.streams;

  const { data: streamers } = useQuery({
    queryKey: ['streamers'],
    queryFn: () => api.getStreamers(),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  const { data: following } = useQuery({
    queryKey: ['following', user?.id],
    queryFn: () => api.getFollowing(user!.id),
    enabled: !!user,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  // Set of user IDs that current user follows
  const followedUserIds = new Set(following?.map(f => f.id) || []);

  // Get user IDs who are actually streaming (have an active stream)
  const streamingUserIds = new Set(liveStreams?.map(s => s.userId) || []);
  
  // Live streamers = users who have an active stream right now
  const liveStreamers = streamers?.filter(s => streamingUserIds.has(s.id)) || [];
  
  // Online users = users marked as isLive but NOT actually streaming  
  const onlineUsers = streamers?.filter(s => s.isLive && !streamingUserIds.has(s.id)) || [];
  
  // Offline streamers = only show users we follow who are offline
  const offlineStreamers = streamers?.filter(s => 
    !s.isLive && !streamingUserIds.has(s.id) && followedUserIds.has(s.id)
  ) || [];

  const { data: followBasedSuggestions = [] } = useQuery<SuggestedUser[]>({
    queryKey: ['suggested-users', user?.id],
    queryFn: () => api.getSuggestedUsers(user!.id),
    enabled: !!user && followedUserIds.size > 0,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  const followBasedIds = new Set(followBasedSuggestions.map(s => s.user.id));
  const fallbackSuggestions = streamers?.filter(s => 
    user && s.id !== user.id && !followedUserIds.has(s.id) && !followBasedIds.has(s.id) && !s.isGuest && s.role !== 'admin' && s.role !== 'superadmin'
  ).slice(0, 10) || [];

  const hasFollowBased = followBasedSuggestions.length > 0;

  // Notify when a followed user goes live
  useEffect(() => {
    if (!liveStreams || !following || following.length === 0) return;
    
    const currentLiveStreamers = new Set(liveStreams.map(s => s.userId));
    const previousLive = previousLiveStreamersRef.current;
    
    // Find newly live streamers that we follow
    liveStreams.forEach(stream => {
      if (followedUserIds.has(stream.userId) && !previousLive.has(stream.userId)) {
        toast({
          title: "🔴 Someone you follow is live!",
          description: `${stream.user?.username || 'A streamer'} just started streaming`,
        });
      }
    });
    
    previousLiveStreamersRef.current = currentLiveStreamers;
  }, [liveStreams, following, followedUserIds, toast]);

  if (!user) {
    api.login('NeonQueen', 'demo123')
      .then((result) => login(result.user, result.token))
      .catch(() => {});
  }

  const sortByCountryProximity = (items: typeof liveStreams, primarySort: (a: any, b: any) => number) => {
    if (!items) return items;
    const userCountry = user?.country;
    const userRegion = userCountry ? COUNTRIES.find(c => c.code === userCountry)?.region : null;
    return [...items].sort((a, b) => {
      if (userCountry) {
        const aLocal = a.country === userCountry ? 2 : (userRegion && COUNTRIES.find(c => c.code === a.country)?.region === userRegion ? 1 : 0);
        const bLocal = b.country === userCountry ? 2 : (userRegion && COUNTRIES.find(c => c.code === b.country)?.region === userRegion ? 1 : 0);
        if (aLocal !== bLocal) return bLocal - aLocal;
      }
      return primarySort(a, b);
    });
  };

  const filteredStreams = (() => {
    let result = liveStreams?.filter(stream => {
      if (activeTab === 'popular') return true;
      if (activeTab === 'in-battle') return stream.isPKBattle;
      if (activeTab === 'new') return true;
      if (activeTab === 'countries') return false;
      return true;
    });

    if (activeTab === 'popular' && result) {
      result = sortByCountryProximity(result, (a, b) => (b.viewersCount || 0) - (a.viewersCount || 0));
    } else if (activeTab === 'new' && result) {
      result = sortByCountryProximity(result, (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (['video-call', 'social', 'multi-guest', 'in-battle'].includes(activeTab) && result) {
      result = sortByCountryProximity(result, (a, b) => (b.viewersCount || 0) - (a.viewersCount || 0));
    }

    return result;
  })();

  const countryGroupedStreams = useMemo(() => {
    if (activeTab !== 'countries' || !liveStreams) return null;
    const withCountry = liveStreams.filter(s => s.country && s.showCountry !== false);
    const userCountry = user?.country;
    const userRegion = userCountry ? COUNTRIES.find(c => c.code === userCountry)?.region : null;

    const byCountry: Record<string, typeof withCountry> = {};
    for (const stream of withCountry) {
      if (!stream.country) continue;
      if (selectedCountries.length > 0 && !selectedCountries.includes(stream.country)) continue;
      if (!byCountry[stream.country]) byCountry[stream.country] = [];
      byCountry[stream.country].push(stream);
    }

    for (const code of Object.keys(byCountry)) {
      byCountry[code].sort((a, b) => (b.viewersCount || 0) - (a.viewersCount || 0));
      byCountry[code] = byCountry[code].slice(0, 5);
    }

    const continentOrder = ["Americas", "Europe", "Asia", "Middle East", "Africa", "Oceania"];
    if (userRegion) {
      const idx = continentOrder.indexOf(userRegion);
      if (idx > 0) {
        continentOrder.splice(idx, 1);
        continentOrder.unshift(userRegion);
      }
    }

    const grouped: { region: string; countries: { code: string; name: string; flag: string; streams: typeof withCountry }[] }[] = [];
    for (const region of continentOrder) {
      const countriesInRegion = COUNTRIES.filter(c => c.region === region && byCountry[c.code]);
      if (countriesInRegion.length === 0) continue;
      const sortedCountries = countriesInRegion.sort((a, b) => {
        if (a.code === userCountry) return -1;
        if (b.code === userCountry) return 1;
        return (byCountry[b.code]?.length || 0) - (byCountry[a.code]?.length || 0);
      });
      grouped.push({
        region,
        countries: sortedCountries.map(c => ({
          code: c.code,
          name: c.name,
          flag: c.flag,
          streams: byCountry[c.code],
        })),
      });
    }
    return grouped;
  }, [activeTab, liveStreams, selectedCountries, user?.country]);

  return (
    <Layout>
      <div className="p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <span className="text-foreground">Ignyt</span><span className="text-pink-500">LIVE</span>
            </h1>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1.5 rounded-full mr-2">
              <span className="text-yellow-400">💰</span>
              <span className="text-yellow-400 text-sm font-bold">{user?.coins?.toLocaleString() || 0}</span>
            </div>
            <button 
              data-testid="button-search"
              onClick={() => setShowSearch(true)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
            >
              <Search className="w-5 h-5 text-foreground" />
            </button>
            <Link href="/notifications">
              <button className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 relative">
                <Bell className="w-5 h-5 text-foreground" />
              </button>
            </Link>
          </div>
        </div>

        <SearchOverlay open={showSearch} onClose={() => setShowSearch(false)} />

        {/* Tabs - Dropdown on mobile, horizontal on desktop */}
        <div className="md:hidden relative mb-4" ref={tabDropdownRef}>
          <button
            onClick={() => setShowTabDropdown(!showTabDropdown)}
            data-testid="button-tab-dropdown"
            className="w-full flex items-center justify-between bg-muted rounded-xl px-4 py-3 hover:bg-muted/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              {(() => { const t = STREAM_TABS.find(t => t.id === activeTab); return t?.icon ? <t.icon className="w-4 h-4 text-primary" /> : null; })()}
              <span className="font-medium text-sm">{STREAM_TABS.find(t => t.id === activeTab)?.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showTabDropdown ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showTabDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-30 overflow-hidden"
              >
                {STREAM_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setShowTabDropdown(false); }}
                    data-testid={`tab-${tab.id}`}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-muted/60'
                    }`}
                  >
                    {tab.icon && <tab.icon className="w-4 h-4" />}
                    {tab.label}
                    {activeTab === tab.id && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop horizontal tabs */}
        <div className="hidden md:flex gap-4 overflow-x-auto no-scrollbar mb-6 pb-2 border-b border-border">
          {STREAM_TABS.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-desktop-${tab.id}`}
              className={`flex items-center gap-1.5 whitespace-nowrap px-1 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-foreground border-primary' 
                  : 'text-muted-foreground border-transparent hover:text-foreground/80'
              }`}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Countries Filter (show when countries tab active) */}
        {activeTab === 'countries' && (
          <div className="relative mb-4" ref={countryDropdownRef}>
            <div
              data-testid="button-country-dropdown"
              role="button"
              tabIndex={0}
              onClick={() => setShowCountryDropdown(!showCountryDropdown)}
              className="w-full flex items-center justify-between bg-muted rounded-xl p-3 hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                {selectedCountries.length === 0 ? (
                  <span className="text-muted-foreground text-sm">All Countries</span>
                ) : (
                  <div className="flex items-center gap-1 overflow-hidden">
                    {selectedCountries.slice(0, 3).map(code => {
                      const country = COUNTRIES.find(c => c.code === code);
                      return country ? (
                        <span key={code} className="inline-flex items-center gap-1 bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs shrink-0">
                          {country.flag} {country.code}
                        </span>
                      ) : null;
                    })}
                    {selectedCountries.length > 3 && (
                      <span className="text-muted-foreground text-xs shrink-0">+{selectedCountries.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedCountries.length > 0 && (
                  <span className="text-xs text-primary font-medium">{selectedCountries.length} selected</span>
                )}
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
              </div>
            </div>

            <AnimatePresence>
              {showCountryDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 flex flex-col"
                  style={{ maxHeight: '60vh' }}
                >
                  <div className="p-3 border-b border-border shrink-0">
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          ref={countrySearchRef}
                          data-testid="input-country-search"
                          type="text"
                          placeholder="Search countries..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="w-full bg-muted rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          data-testid="button-apply-countries"
                          onClick={() => setShowCountryDropdown(false)}
                          className="flex-1 md:flex-none bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium hover:bg-primary/90 whitespace-nowrap transition-colors text-center"
                        >
                          Apply
                        </button>
                        <button
                          data-testid="button-clear-all-countries"
                          onClick={() => {
                            setSelectedCountries([]);
                            if (user?.id) {
                              api.updateUser(user.id, { preferredCountry: JSON.stringify([]) }).catch(() => {});
                            }
                          }}
                          disabled={selectedCountries.length === 0}
                          className={`flex-1 md:flex-none px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex items-center justify-center gap-1 transition-colors ${
                            selectedCountries.length > 0
                              ? 'bg-destructive/20 text-destructive hover:bg-destructive/30'
                              : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          Clear{selectedCountries.length > 0 ? ` (${selectedCountries.length})` : ''}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5 p-3 overflow-x-auto border-b border-border scrollbar-hide shrink-0">
                    {REGIONS.map(region => (
                      <button
                        key={region}
                        data-testid={`button-region-${region.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => setActiveRegion(region)}
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                          activeRegion === region
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {region}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-y-auto min-h-0 flex-1">
                    {filteredCountries.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-sm">
                        No countries found
                      </div>
                    ) : (
                      filteredCountries.map(country => {
                        const isSelected = selectedCountries.includes(country.code);
                        return (
                          <button
                            key={country.code}
                            data-testid={`button-country-${country.code.toLowerCase()}`}
                            onClick={() => toggleCountry(country.code)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors ${
                              isSelected ? 'bg-primary/10' : ''
                            }`}
                          >
                            <span className="text-xl">{country.flag}</span>
                            <span className="flex-1 text-left text-sm text-foreground">{country.name}</span>
                            <span className="text-xs text-muted-foreground">{country.region}</span>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground/30'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Stream Grid */}
        <div className="mb-8">
          
          {streamsError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-destructive/50" />
              </div>
              <p className="text-foreground font-medium">Something went wrong</p>
              <p className="text-muted-foreground text-sm mt-1">We couldn't load the streams. Please try again.</p>
              <button
                onClick={() => refetchStreams()}
                className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-full text-sm hover:opacity-90 transition-opacity"
                data-testid="button-retry-streams"
              >
                Try Again
              </button>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div 
                  key={i}
                  className="aspect-[3/4] rounded-2xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : activeTab === 'countries' ? (
            countryGroupedStreams && countryGroupedStreams.length > 0 ? (
              <div className="space-y-8">
                {countryGroupedStreams.map(group => (
                  <div key={group.region}>
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">{group.region}</h3>
                      <div className="flex-1 h-px bg-border ml-2" />
                    </div>
                    <div className="space-y-6 pl-1">
                      {group.countries.map(country => (
                        <div key={country.code}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">{country.flag}</span>
                            <span className="text-sm font-medium text-foreground">{country.name}</span>
                            <span className="text-xs text-muted-foreground">({country.streams.length})</span>
                            {user?.country === country.code && (
                              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">Your country</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {country.streams.map((stream, index) => (
                              <StreamCard key={stream.id} stream={stream} rank={index + 1} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-lg">No live streams with location data</p>
                <p className="text-sm mt-2">Streams will appear here when creators set their country</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredStreams && filteredStreams.length > 0 ? (
                filteredStreams.map((stream, index) => (
                  <StreamCard key={stream.id} stream={stream} rank={index < 25 ? index + 1 : undefined} />
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Video className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-foreground font-medium">No live streams right now</p>
                  <p className="text-muted-foreground text-sm mt-1">Be the first to go live, or check back soon!</p>
                  {user && (
                    <Link href="/go-live">
                      <button className="mt-4 px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full text-sm hover:opacity-90 transition-opacity" data-testid="button-go-live-empty">
                        Go Live
                      </button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Streamers Section - Live vs Offline (only show if someone is live/online/followed) */}
        {streamers && streamers.length > 0 && (liveStreamers.length > 0 || onlineUsers.length > 0 || offlineStreamers.length > 0) && (
          <div className="mb-8">
            {/* Live Streamers */}
            {liveStreamers.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-muted-foreground text-sm font-medium">Live Now</span>
                  <span className="text-muted-foreground/70 text-xs">({liveStreamers.length})</span>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {liveStreamers.slice(0, 10).map((streamer) => (
                    <div key={streamer.id} className="flex flex-col items-center gap-1 min-w-[70px]">
                      <UserAvatar 
                        userId={streamer.id}
                        username={streamer.username}
                        avatar={streamer.avatar}
                        isLive={true}
                        size="lg"
                        showStatus={true}
                      />
                      <span className="text-foreground text-xs truncate max-w-[60px]">{streamer.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Online Users (active but not streaming) */}
            {onlineUsers.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-muted-foreground text-sm font-medium">Online</span>
                  <span className="text-muted-foreground/70 text-xs">({onlineUsers.length})</span>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {onlineUsers.slice(0, 10).map((user) => (
                    <Link key={user.id} href={`/profile/${user.id}`}>
                      <div className="flex flex-col items-center gap-1 min-w-[70px] hover:opacity-100 transition-opacity cursor-pointer">
                        <UserAvatar 
                          userId={user.id}
                          username={user.username}
                          avatar={user.avatar}
                          isLive={false}
                          isOnline={true}
                          size="lg"
                          showStatus={true}
                          linkToProfile={false}
                        />
                        <span className="text-foreground text-xs truncate max-w-[60px]">{user.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Offline Followed Users */}
            {offlineStreamers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  <span className="text-muted-foreground text-sm font-medium">Following (Offline)</span>
                  <span className="text-muted-foreground/70 text-xs">({offlineStreamers.length})</span>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {offlineStreamers.slice(0, 10).map((streamer) => (
                    <Link key={streamer.id} href={`/profile/${streamer.id}`}>
                      <div className="flex flex-col items-center gap-1 min-w-[70px] hover:opacity-100 transition-opacity cursor-pointer">
                        <UserAvatar 
                          userId={streamer.id}
                          username={streamer.username}
                          avatar={streamer.avatar}
                          isLive={false}
                          isOnline={false}
                          size="lg"
                          showStatus={true}
                          linkToProfile={false}
                        />
                        <span className="text-foreground text-xs truncate max-w-[60px]">{streamer.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {hasFollowBased && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-bold text-foreground">Based on who you follow</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {followBasedSuggestions.map((suggestion) => (
                <Link key={suggestion.user.id} href={`/profile/${suggestion.user.id}`}>
                  <div className="flex flex-col items-center gap-1.5 min-w-[90px] p-3 bg-gradient-to-b from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl hover:border-pink-500/40 transition-colors cursor-pointer" data-testid={`suggested-follow-${suggestion.user.id}`}>
                    <UserAvatar 
                      userId={suggestion.user.id}
                      username={suggestion.user.username}
                      avatar={suggestion.user.avatar}
                      isLive={streamingUserIds.has(suggestion.user.id)}
                      isOnline={suggestion.user.isLive}
                      size="lg"
                      showStatus={true}
                      linkToProfile={false}
                    />
                    <span className="text-foreground text-xs truncate max-w-[80px] font-medium">{suggestion.user.username}</span>
                    <span className="text-pink-400 text-[10px]">
                      {suggestion.mutualCount} mutual{suggestion.mutualCount > 1 ? 's' : ''}
                    </span>
                    <span className="text-muted-foreground text-[9px] truncate max-w-[80px]">
                      via {suggestion.mutualNames[0]}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {fallbackSuggestions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-foreground">People you might like</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {fallbackSuggestions.map((suggestedUser) => (
                <Link key={suggestedUser.id} href={`/profile/${suggestedUser.id}`}>
                  <div className="flex flex-col items-center gap-2 min-w-[80px] p-3 bg-muted rounded-xl hover:bg-muted/80 transition-colors cursor-pointer" data-testid={`suggested-user-${suggestedUser.id}`}>
                    <UserAvatar 
                      userId={suggestedUser.id}
                      username={suggestedUser.username}
                      avatar={suggestedUser.avatar}
                      isLive={streamingUserIds.has(suggestedUser.id)}
                      isOnline={suggestedUser.isLive}
                      size="lg"
                      showStatus={true}
                      linkToProfile={false}
                    />
                    <span className="text-foreground text-xs truncate max-w-[70px]">{suggestedUser.username}</span>
                    <span className="text-cyan-400 text-[10px]">Level {suggestedUser.level}</span>
                  </div>
                </Link>
              ))}
            </div>
            <p className="text-muted-foreground/60 text-xs mt-3">Tap to view profile and follow</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
