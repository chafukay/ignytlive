import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { Settings, User, Wallet, Award, ChevronRight, Moon, Trophy, Clapperboard, Users, Star, ShoppingBag, Crown, Gift, Building2, Package, Eye, Share2, LogOut, Sparkles, BadgeCheck, Medal, UserCheck, Camera, ImageIcon, Loader2, MailCheck, AlertCircle, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import BadgesDisplay from "@/components/badges-display";

import UserAvatar from "@/components/user-avatar";
import { frameRingColors, defaultFrameRing, badgeColors } from "@/components/item-preview";
import { useState, useRef } from "react";
import { getWealthLevel } from "@shared/wealth-utils";
import { isNative, getServerUrl } from "@/lib/capacitor";
import type { UserItem, StoreItem } from "@shared/schema";

type UserItemWithItem = UserItem & { item: StoreItem };

export default function Profile() {
  const { user, logout, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dndEnabled, setDndEnabled] = useState(user?.dndEnabled || false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const bannerMutation = useMutation({
    mutationFn: async (imageDataUrl: string) => {
      return api.updateUser(user!.id, { profileBanner: imageDataUrl } as any);
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast({ title: "Profile banner updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update banner", variant: "destructive" });
    },
  });

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be under 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      bannerMutation.mutate(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Check if user is currently live streaming
  const { data: liveStreamsData } = useQuery({
    queryKey: ['liveStreams'],
    queryFn: () => api.getLiveStreams(),
    enabled: !!user,
  });
  
  const isUserLive = liveStreamsData?.streams?.some(stream => stream.userId === user?.id) ?? false;

  // Fetch equipped items for profile display
  const { data: equippedItems = [] } = useQuery<UserItemWithItem[]>({
    queryKey: ['equipped-items', user?.id],
    queryFn: () => api.getEquippedItems(user!.id),
    enabled: !!user,
  });

  const equippedFrame = equippedItems.find(item => item.item.type === 'frame');
  const equippedBadge = equippedItems.find(item => item.item.type === 'badge');
  const equippedEffect = equippedItems.find(item => item.item.type === 'effect');

  const dndMutation = useMutation({
    mutationFn: (enabled: boolean) => api.toggleDND(user!.id, enabled),
    onSuccess: (updatedUser) => {
      setDndEnabled(updatedUser.dndEnabled);
      setUser(updatedUser);
      toast({ title: updatedUser.dndEnabled ? "Do Not Disturb enabled" : "Do Not Disturb disabled" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  if (!user) {
    return (
      <Layout>
        <div className="p-4 pb-24 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <User className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Not Logged In</h2>
            <p className="text-muted-foreground mb-6">Log in to access your profile</p>
            <button 
              onClick={() => setLocation("/")}
              className="bg-primary text-white font-bold px-8 py-3 rounded-full"
              data-testid="button-login"
            >
              Go to Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <GuestGate allowProfile>
    <Layout>
      <div className="pb-24 max-w-2xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
          <div className="flex items-center gap-2">
            {(user.vipTier || 0) > 0 && (
              <>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerChange}
                  data-testid="input-banner-upload"
                />
                <button
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={bannerMutation.isPending}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Change profile background (VIP feature)"
                  data-testid="button-change-banner"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
              </>
            )}
            <Link href="/settings">
              <Settings className="w-6 h-6 text-foreground cursor-pointer" />
            </Link>
          </div>
        </div>

        <div className="flex justify-center gap-2 text-muted-foreground text-sm mb-4">
          <span>ID: {user.id.slice(0, 8)}</span>
          <button 
            onClick={() => setLocation("/profile-visitors")} 
            className="p-1 rounded hover:bg-muted" 
            title="Profile Visitors"
            data-testid="button-profile-visitors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setLocation("/referrals")} 
            className="p-1 rounded hover:bg-muted" 
            title="Invite Friends"
            data-testid="button-referrals"
          >
            <Users className="w-4 h-4" />
          </button>
          <button 
            onClick={async () => {
              const baseUrl = isNative() ? (getServerUrl() || 'https://ignyt.replit.app') : window.location.origin;
              const url = `${baseUrl}/profile/${user.id}`;
              const platform = isNative() ? "native" : (navigator.share ? "native" : "clipboard");
              fetch(`${getServerUrl()}/api/shares`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("authToken")}` },
                body: JSON.stringify({ contentType: "profile", contentId: user.id, platform }),
              }).catch(() => {});
              if (isNative()) {
                try {
                  const { Share } = await import('@capacitor/share');
                  await Share.share({
                    title: `${user.username} on IgnytLIVE`,
                    text: `Check out ${user.username}'s profile on IgnytLIVE!`,
                    url,
                    dialogTitle: 'Share Profile',
                  });
                } catch {}
              } else if (navigator.share) {
                navigator.share({
                  title: `${user.username} on IgnytLIVE`,
                  text: `Check out ${user.username}'s profile on IgnytLIVE!`,
                  url,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(url);
                toast({ title: "Profile link copied!" });
              }
            }}
            className="p-1 rounded hover:bg-muted" 
            title="Share Profile"
            data-testid="button-share-profile"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <div
          className="relative rounded-2xl overflow-hidden mb-6 p-6"
          style={user.profileBanner
            ? { backgroundImage: `url(${user.profileBanner})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
          }
          data-testid="profile-banner"
        >
          {user.profileBanner && (
            <div className="absolute inset-0 bg-black/30" />
          )}
          <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-3">
            <div className="relative">
              {equippedFrame && (() => {
                const ring = frameRingColors[equippedFrame.item.name] || defaultFrameRing;
                return (
                  <div className={`absolute -inset-2 rounded-full bg-gradient-to-br ${ring.gradient} ${ring.shadow} p-0.5 z-0`}>
                    <div className="w-full h-full rounded-full bg-background" />
                  </div>
                );
              })()}
              {equippedEffect && (
                <div className="absolute -inset-4 flex items-center justify-center z-0">
                  <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
                  <Sparkles className="w-6 h-6 text-pink-400 absolute -bottom-1 -left-2 animate-pulse delay-75" />
                </div>
              )}
              <UserAvatar
                userId={user.id}
                username={user.username}
                avatar={user.avatar}
                isLive={isUserLive}
                isOnline={true}
                size="lg"
                showStatus={true}
                linkToProfile={false}
                className="w-24 h-24 relative z-10"
              />
            </div>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full z-20">
              {user.level}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1 bg-black/70 rounded-full px-3 py-1">
            <h2 className="text-xl font-bold text-white" data-testid="text-username">
              {user.username}
            </h2>
            {user.isVerified && (
              <span className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                user.verificationBadge === 'official' ? 'bg-blue-500 text-white' :
                user.verificationBadge === 'celebrity' ? 'bg-purple-500 text-white' :
                user.verificationBadge === 'creator' ? 'bg-pink-500 text-white' :
                'bg-green-500 text-white'
              }`} data-testid="badge-verified">
                <BadgeCheck className="w-3 h-3" />
                {user.verificationBadge || 'Verified'}
              </span>
            )}
            {equippedBadge && (() => {
              const badge = badgeColors[equippedBadge.item.name] || { bg: "from-pink-500 to-purple-500", icon: equippedBadge.item.emoji || "\u{1F3C5}" };
              return (
                <span className={`bg-gradient-to-r ${badge.bg} text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1`}>
                  {badge.icon} {equippedBadge.item.name}
                </span>
              );
            })()}
            <BadgesDisplay userId={user.id} size="md" />
          </div>
          <div className="flex items-center flex-wrap justify-center gap-2 text-sm text-white/90 mb-2 bg-black/60 rounded-lg px-3 py-1.5">
            {user.gender && (
              <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full text-xs" data-testid="text-gender">
                {user.gender === 'male' ? '♂️ Male' : user.gender === 'female' ? '♀️ Female' : user.gender === 'non-binary' ? '⚧️ Non-binary' : '🏳️ Other'}
              </span>
            )}
            {user.birthdate && (
              <span className="text-white/80 text-xs" data-testid="text-age">
                {Math.floor((Date.now() - new Date(user.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years old
              </span>
            )}
            <span className="text-white/80">🌍 {user.city || user.country || 'Unknown'}</span>
            {(() => {
              const wealthLevel = getWealthLevel(user.totalSpent || 0);
              return (
                <span className={`${wealthLevel.color} bg-black/20 px-2 py-0.5 rounded-full text-xs flex items-center gap-1`} data-testid="text-wealth-level">
                  {wealthLevel.emoji} {wealthLevel.name}
                </span>
              );
            })()}
            <span className="bg-white/10 text-white/80 px-2 py-0.5 rounded-full text-xs flex items-center gap-1" data-testid="text-profile-views">
              <Eye className="w-3 h-3" /> {formatNumber(user.profileViews || 0)} views
            </span>
            {!user.isGuest && (
              user.emailVerified ? (
                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs flex items-center gap-1" data-testid="status-email-verified">
                  <MailCheck className="w-3 h-3" /> Email Verified
                </span>
              ) : (
                <span 
                  className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-xs flex items-center gap-1 cursor-pointer hover:bg-amber-500/30"
                  onClick={() => setLocation("/verify-email")}
                  data-testid="status-email-unverified"
                >
                  <AlertCircle className="w-3 h-3" /> Email Not Verified
                </span>
              )
            )}
          </div>
          {user.bio && (
            <p className="text-white/90 text-sm text-center max-w-xs mb-4 px-4 py-1 bg-black/70 rounded-lg" data-testid="text-bio">
              {user.bio}
            </p>
          )}
          {!user.bio && (
            <Link href="/edit-profile">
              <p className="text-primary/70 text-sm text-center mb-4 cursor-pointer hover:text-primary" data-testid="link-add-bio">
                + Add a bio
              </p>
            </Link>
          )}
          <div className="flex justify-center gap-6 text-center bg-black/70 rounded-xl px-4 py-3">
            <div>
              <div className="font-bold text-white" data-testid="text-followers">
                {formatNumber(user.followersCount)}
              </div>
              <div className="text-xs text-white/70">Followers</div>
            </div>
            <div>
              <div className="font-bold text-white" data-testid="text-following">
                {formatNumber(user.followingCount)}
              </div>
              <div className="text-xs text-white/70">Following</div>
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-1" data-testid="text-received">
                <span className="text-yellow-400">💎</span>{formatNumber(user.diamonds)}
              </div>
              <div className="text-xs text-white/70">Received</div>
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-1" data-testid="text-sent">
                <span className="text-yellow-400">🪙</span>{formatNumber(user.coins)}
              </div>
              <div className="text-xs text-white/70">Sent</div>
            </div>
          </div>
          </div>
        </div>

        {(!user.phone || !user.phoneVerified || !user.email || user.email.includes('@phone.ignyt.live')) && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center justify-between" data-testid="card-link-account">
            <p className="text-foreground text-sm">
              {!user.email || user.email.includes('@phone.ignyt.live') 
                ? "Link your email to secure your account." 
                : !user.phone || !user.phoneVerified 
                  ? "Add a phone number for extra security."
                  : "Link additional accounts for security."}
            </p>
            <button 
              onClick={() => setLocation("/link-account")}
              className="bg-muted text-primary px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap"
              data-testid="button-link-account"
            >
              Link Account
            </button>
          </div>
        )}

        {/* Wallet Card */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 mb-6 border border-border relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-gray-300 text-sm mb-1">My Balance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white" data-testid="text-coins">
                  {user.coins.toLocaleString()}
                </span>
                <span className="text-yellow-500 font-bold">Coins</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-gray-400 text-sm">Diamonds:</span>
                <span className="text-cyan-400 font-bold" data-testid="text-diamonds">
                  {user.diamonds.toLocaleString()}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setLocation("/coins")}
              className="bg-yellow-500 text-black font-bold px-4 py-2 rounded-full hover:scale-105 transition-transform"
              data-testid="button-topup"
            >
              Top Up
            </button>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10">
            <Wallet className="w-32 h-32 text-white" />
          </div>
        </div>

        {/* Go Live Button */}
        <Link href="/go-live">
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl p-4 mb-6 flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform" data-testid="link-golive">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Clapperboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-bold">Go Live</p>
                <p className="text-white/70 text-sm">Start streaming now</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-white" />
          </div>
        </Link>

        {/* Quick Access */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          <Link href="/shorts">
            <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-2xl p-3 text-center cursor-pointer hover:scale-105 transition-transform" data-testid="link-shorts">
              <Clapperboard className="w-5 h-5 text-pink-400 mx-auto mb-1.5" />
              <span className="text-foreground text-[10px] font-medium">Shorts</span>
            </div>
          </Link>
          <Link href="/leaderboard">
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-3 text-center cursor-pointer hover:scale-105 transition-transform" data-testid="link-leaderboard">
              <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1.5" />
              <span className="text-foreground text-[10px] font-medium">Leaderboard</span>
            </div>
          </Link>
          <Link href="/groups">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl p-3 text-center cursor-pointer hover:scale-105 transition-transform" data-testid="link-groups">
              <Users className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
              <span className="text-foreground text-[10px] font-medium">Groups</span>
            </div>
          </Link>
          <Link href="/achievements">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-3 text-center cursor-pointer hover:scale-105 transition-transform" data-testid="link-achievements">
              <Medal className="w-5 h-5 text-green-400 mx-auto mb-1.5" />
              <span className="text-foreground text-[10px] font-medium">Achievements</span>
            </div>
          </Link>
          <Link href="/events">
            <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-2xl p-3 text-center cursor-pointer hover:scale-105 transition-transform" data-testid="link-events">
              <CalendarDays className="w-5 h-5 text-orange-400 mx-auto mb-1.5" />
              <span className="text-foreground text-[10px] font-medium">Events</span>
            </div>
          </Link>
        </div>

        {/* VIP Status */}
        {user.vipTier > 0 && (
          <Link href="/vip-plans">
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl p-4 mb-6 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-xl">
                    {user.vipTier === 1 ? "🥉" : user.vipTier === 2 ? "🥈" : user.vipTier === 3 ? "🥇" : user.vipTier === 4 ? "💎" : "👑"}
                  </div>
                  <div>
                    <p className="text-foreground font-bold">
                      {user.vipTier === 1 ? "Bronze" : user.vipTier === 2 ? "Silver" : user.vipTier === 3 ? "Gold" : user.vipTier === 4 ? "Platinum" : "Millionaire"}
                    </p>
                    <p className="text-muted-foreground text-xs">Premium Member</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
              </div>
            </div>
          </Link>
        )}

        {/* Menu Items - SuperLive Style */}
        <div className="space-y-1">
          {[
            { icon: User, label: "Edit Profile", color: "text-blue-400", href: "/edit-profile" },
            { icon: Clapperboard, label: "My Posts", color: "text-pink-400", href: "/my-posts" },
            { icon: Star, label: "Families", color: "text-yellow-400", href: "/families" },
            { icon: Wallet, label: "Purchase Coins", color: "text-yellow-500", href: "/coins" },
            { icon: ShoppingBag, label: "Store", color: "text-blue-400", href: "/store", extra: "Purchase" },
            { icon: Crown, label: "VIP Plans", color: "text-yellow-400", href: "/vip-plans", extra: user.vipTier === 0 ? "Upgrade Now" : "", special: true, tierName: user.vipTier === 0 ? "FREE" : user.vipTier === 1 ? "BRONZE" : user.vipTier === 2 ? "SILVER" : user.vipTier === 3 ? "GOLD" : user.vipTier === 4 ? "PLATINUM" : "MILLIONAIRE" },
            { icon: Award, label: "User Level", color: "text-purple-400", href: "/user-level" },
            { icon: Gift, label: "Top Gifters", color: "text-pink-400", href: "/top-gifters" },
            { icon: Building2, label: "Agency", color: "text-cyan-400", href: "/agency", extra: "Earn Diamonds" },
            { icon: Package, label: "Item Bag", color: "text-orange-400", href: "/item-bag" },
            { icon: Settings, label: "Settings", color: "text-gray-400", href: "/settings" },
          ].map((item) => (
            <Link key={item.label} href={item.href || "#"}>
              <div 
                className={`flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border ${
                  item.special ? 'bg-gradient-to-r from-yellow-900/20 to-transparent' : ''
                }`}
                data-testid={`menu-${item.label.toLowerCase().replace(/ /g, '-')}`}
              >
                {item.special ? (
                  <div className={`text-white text-xs font-bold px-3 py-1 rounded ${
                    (item as any).tierName === "FREE" ? "bg-gray-600" :
                    (item as any).tierName === "BRONZE" ? "bg-gradient-to-r from-amber-700 to-amber-900" :
                    (item as any).tierName === "SILVER" ? "bg-gradient-to-r from-gray-400 to-gray-600" :
                    (item as any).tierName === "GOLD" ? "bg-gradient-to-r from-yellow-500 to-yellow-700" :
                    (item as any).tierName === "PLATINUM" ? "bg-gradient-to-r from-cyan-400 to-cyan-600" :
                    "bg-gradient-to-r from-purple-500 to-pink-500"
                  }`}>
                    {(item as any).tierName}
                  </div>
                ) : (
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                )}
                <span className="flex-1 text-foreground font-medium">{item.special ? '' : item.label}</span>
                {item.extra && (
                  <span className="text-muted-foreground text-sm">{item.extra}</span>
                )}
                <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
              </div>
            </Link>
          ))}

          <div 
            onClick={() => !dndMutation.isPending && dndMutation.mutate(!dndEnabled)}
            className={`flex items-center gap-4 p-4 cursor-pointer transition-colors border-b border-border ${
              dndMutation.isPending ? "opacity-50 pointer-events-none" : ""
            } ${
              dndEnabled ? "bg-purple-500/10" : "hover:bg-muted/50"
            }`}
            data-testid="menu-dnd"
          >
            {dndMutation.isPending ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            ) : (
              <Moon className={`w-5 h-5 ${dndEnabled ? 'text-purple-400' : 'text-muted-foreground'}`} />
            )}
            <span className="flex-1 text-foreground font-medium">Do Not Disturb</span>
            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${
              dndEnabled ? "bg-purple-500" : "bg-muted"
            }`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                dndEnabled ? "translate-x-6" : "translate-x-0"
              }`} />
            </div>
          </div>
          
          <div 
            onClick={handleLogout}
            className="flex items-center gap-4 p-4 hover:bg-red-500/10 cursor-pointer transition-colors"
            data-testid="menu-logout"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="flex-1 text-red-400 font-medium">Log Out</span>
          </div>
        </div>
      </div>
    </Layout>
    </GuestGate>
  );
}
