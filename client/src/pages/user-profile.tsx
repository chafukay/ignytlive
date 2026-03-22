import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Layout from "@/components/layout";
import UserAvatar from "@/components/user-avatar";
import BadgesDisplay from "@/components/badges-display";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, Video, UserPlus, UserCheck, Coins, Sparkles, MapPin, Crown, Share2, Eye, Gift } from "lucide-react";
import GiftPanel from "@/components/gift-panel";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useGuestCheck } from "@/components/guest-gate";
import { getWealthLevel } from "@shared/wealth-utils";
import type { UserItem, StoreItem } from "@shared/schema";

type UserItemWithItem = UserItem & { item: StoreItem };

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { isGuest, requireAccount } = useGuestCheck();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showGiftPanel, setShowGiftPanel] = useState(false);

  const { data: profileUser, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.getUser(userId!),
    enabled: !!userId,
  });

  const { data: liveStreamsData } = useQuery({
    queryKey: ['liveStreams'],
    queryFn: () => api.getLiveStreams(),
  });
  const liveStreams = liveStreamsData?.streams;

  const { data: isFollowingData } = useQuery({
    queryKey: ['isFollowing', currentUser?.id, userId],
    queryFn: () => api.isFollowing(currentUser!.id, userId!),
    enabled: !!currentUser && !!userId && currentUser.id !== userId,
  });

  const { data: equippedItems = [] } = useQuery<UserItemWithItem[]>({
    queryKey: ['equipped-items', userId],
    queryFn: () => api.getEquippedItems(userId!),
    enabled: !!userId,
  });

  const equippedFrame = equippedItems.find(item => item.item.type === 'frame');
  const equippedBadge = equippedItems.find(item => item.item.type === 'badge');
  const equippedEffect = equippedItems.find(item => item.item.type === 'effect');

  const isLive = liveStreams?.some(stream => stream.userId === userId) ?? false;
  const liveStream = liveStreams?.find(stream => stream.userId === userId);
  const isFollowing = isFollowingData?.isFollowing ?? false;
  const isOwnProfile = currentUser?.id === userId;

  const followMutation = useMutation({
    mutationFn: () => api.followUser(currentUser!.id, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      toast({ title: "Followed!", description: `You are now following ${profileUser?.username}` });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => api.unfollowUser(currentUser!.id, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });

  const requestCallMutation = useMutation({
    mutationFn: () => api.requestPrivateCall(currentUser!.id, userId!),
    onSuccess: (call) => {
      setShowCallDialog(false);
      setLocation(`/private-call/${call.id}`);
    },
    onError: (error: any) => {
      const description = error?.code === "DND_ENABLED" 
        ? "This user has Do Not Disturb enabled"
        : error.message;
      toast({ title: "Cannot start call", description, variant: "destructive" });
    },
  });

  const handleFollow = () => {
    if (isGuest) { requireAccount(); return; }
    if (isFollowing) unfollowMutation.mutate();
    else followMutation.mutate();
  };

  const handlePrivateCall = () => {
    if (isGuest) { requireAccount(); return; }
    if (profileUser?.dndEnabled) {
      toast({ title: "Not Available", description: "This user has Do Not Disturb enabled", variant: "destructive" });
      return;
    }
    if (!profileUser?.availableForPrivateCall) {
      toast({ title: "Not Available", description: "This user has disabled private calls", variant: "destructive" });
      return;
    }
    setShowCallDialog(true);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/profile/${userId}`;
    if (navigator.share) {
      navigator.share({ title: `${profileUser?.username} on IgnytLIVE`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Profile link copied!" });
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!profileUser) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">User not found</div>
        </div>
      </Layout>
    );
  }

  const wealthLevel = getWealthLevel(profileUser.totalSpent || 0);
  const vipName = profileUser.vipTier === 1 ? "Bronze" : profileUser.vipTier === 2 ? "Silver" : profileUser.vipTier === 3 ? "Gold" : profileUser.vipTier === 4 ? "Platinum" : profileUser.vipTier === 5 ? "Millionaire" : null;
  const location = profileUser.city ? `${profileUser.city}, ${profileUser.country || ''}` : profileUser.country || null;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black pb-20">
        <div className="relative">
          <div
            className="h-36 bg-gradient-to-br from-pink-500/30 via-purple-600/30 to-blue-500/20"
            style={profileUser.profileBanner ? { backgroundImage: `url(${profileUser.profileBanner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            data-testid="user-profile-banner"
          />
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : setLocation('/')}
              className="p-2 rounded-full bg-black/50 text-white"
              data-testid="btn-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-xs bg-black/30 px-3 py-1 rounded-full">
                ID: {profileUser.id.slice(0, 8)}
              </span>
              <button onClick={handleShare} className="p-2 rounded-full bg-black/50 text-white" data-testid="btn-share">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 -mt-16">
          <div className="flex flex-col items-center">
            <div className="relative">
              {equippedFrame && (
                <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 p-0.5 animate-pulse z-0">
                  <div className="w-full h-full rounded-full bg-gray-900" />
                </div>
              )}
              {equippedEffect && (
                <div className="absolute -inset-4 flex items-center justify-center z-0">
                  <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
                  <Sparkles className="w-6 h-6 text-pink-400 absolute -bottom-1 -left-2 animate-pulse delay-75" />
                </div>
              )}
              <UserAvatar
                userId={profileUser.id}
                username={profileUser.username}
                avatar={profileUser.avatar}
                isLive={isLive}
                isOnline={true}
                size="lg"
                showStatus={true}
                linkToProfile={false}
                className="w-28 h-28 relative z-10"
              />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full z-20" data-testid="badge-level">
                {profileUser.level}
              </span>
              {equippedBadge && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full z-20" data-testid="equipped-badge">
                  {equippedBadge.item.name}
                </span>
              )}
            </div>

            <div className="mt-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl font-bold text-white" data-testid="text-username">
                  {profileUser.username}
                </h1>
                <BadgesDisplay userId={profileUser.id} size="md" />
              </div>

              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                {location && (
                  <span className="flex items-center gap-1 text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-full" data-testid="text-location">
                    <MapPin className="w-3 h-3" /> {location}
                  </span>
                )}
                {vipName && (
                  <span className="flex items-center gap-1 text-xs font-bold bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30 px-2.5 py-1 rounded-full" data-testid="badge-vip">
                    <Crown className="w-3 h-3" /> {vipName}
                  </span>
                )}
                <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${wealthLevel.color} bg-black/30`} data-testid="badge-wealth">
                  {wealthLevel.emoji} {wealthLevel.name}
                </span>
                {profileUser.isVerified && (
                  <span className="text-xs bg-blue-500 text-white px-2.5 py-1 rounded-full font-bold" data-testid="badge-verified">
                    Verified
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-6 mt-6 text-center w-full max-w-sm">
              <div className="flex-1">
                <div className="font-bold text-white text-lg" data-testid="stat-followers">{formatNumber(profileUser.followersCount)}</div>
                <div className="text-[11px] text-gray-500">Followers</div>
              </div>
              <div className="flex-1">
                <div className="font-bold text-white text-lg" data-testid="stat-following">{formatNumber(profileUser.followingCount)}</div>
                <div className="text-[11px] text-gray-500">Following</div>
              </div>
              <div className="flex-1">
                <div className="font-bold text-white text-lg flex items-center justify-center gap-1" data-testid="stat-received">
                  <span className="text-yellow-400 text-sm">💎</span> {formatNumber(profileUser.diamonds || 0)}
                </div>
                <div className="text-[11px] text-gray-500">Received</div>
              </div>
              <div className="flex-1">
                <div className="font-bold text-white text-lg flex items-center justify-center gap-1" data-testid="stat-sent">
                  <span className="text-yellow-400 text-sm">🪙</span> {formatNumber(profileUser.totalSpent || 0)}
                </div>
                <div className="text-[11px] text-gray-500">Sent</div>
              </div>
            </div>

            {profileUser.bio && (
              <div className="mt-4 w-full max-w-sm">
                <p className="text-gray-400 text-sm" data-testid="text-bio">
                  <span className="text-gray-500 font-medium">About: </span>{profileUser.bio}
                </p>
              </div>
            )}

            {isLive && liveStream && (
              <button
                onClick={() => setLocation(`/live/${liveStream.id}`)}
                className="mt-4 w-full max-w-sm py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold flex items-center justify-center gap-2 transition-colors animate-pulse"
                data-testid="btn-watch-live"
              >
                <span className="w-2 h-2 bg-white rounded-full" />
                Watch Live Now
              </button>
            )}

            {!isOwnProfile && (
              <div className="flex gap-3 mt-5 w-full max-w-sm">
                <button
                  onClick={handleFollow}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                    isFollowing 
                      ? "bg-white/10 text-pink-400 border border-pink-500/30" 
                      : "bg-pink-500 text-white hover:bg-pink-600"
                  }`}
                  data-testid="btn-follow"
                >
                  {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isFollowing ? "Following" : "Follow"}
                </button>
                
                <button
                  onClick={() => { if (isGuest) { requireAccount(); return; } setLocation(`/chat/${userId}`); }}
                  className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-white/10 text-white border border-white/10 hover:bg-white/15 transition-colors"
                  data-testid="btn-message"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message
                </button>
              </div>
            )}

            {!isOwnProfile && (
              <div className="flex gap-3 mt-3 w-full max-w-sm">
                <button
                  onClick={() => { if (isGuest) { requireAccount(); return; } setShowGiftPanel(true); }}
                  className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors"
                  data-testid="btn-send-gift"
                >
                  <Gift className="w-4 h-4" />
                  Send Gift
                </button>
              </div>
            )}

            {!isOwnProfile && (
              <button
                onClick={handlePrivateCall}
                className={`mt-3 w-full max-w-sm py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity ${
                  profileUser.availableForPrivateCall && !profileUser.dndEnabled
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:opacity-90 border border-yellow-400/50"
                    : "bg-white/10 text-gray-400 border border-white/10"
                }`}
                data-testid="btn-private-call"
              >
                <Video className="w-5 h-5" />
                Private Call
                {profileUser.availableForPrivateCall && profileUser.privateCallRate > 0 && profileUser.privateCallBillingMode === "per_minute" && (
                  <span className="text-xs opacity-70 ml-1">({profileUser.privateCallRate} coins/min)</span>
                )}
                {profileUser.availableForPrivateCall && profileUser.privateCallRate > 0 && profileUser.privateCallBillingMode === "per_session" && (
                  <span className="text-xs opacity-70 ml-1">({profileUser.privateCallSessionPrice} coins)</span>
                )}
              </button>
            )}

            {isOwnProfile && (
              <div className="flex gap-3 mt-5 w-full max-w-sm">
                <button
                  onClick={() => setLocation('/edit-profile')}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/10 text-white border border-white/10 hover:bg-white/15 transition-colors"
                  data-testid="btn-edit-profile"
                >
                  Edit Profile
                </button>
                <button
                  onClick={handleShare}
                  className="py-3 px-5 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/15 transition-colors"
                  data-testid="btn-share-profile"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="mt-8 w-full">
              <div className="border-t border-white/10 pt-4">
                <div className="grid grid-cols-3 gap-1">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="aspect-square bg-white/5 rounded-lg overflow-hidden" data-testid={`content-grid-${i}`}>
                      <div className="w-full h-full flex items-center justify-center text-white/10">
                        <Eye className="w-6 h-6" />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-center text-gray-600 text-xs mt-4">No posts yet</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Start Private Call</DialogTitle>
            <DialogDescription className="text-gray-400">
              Request a private video call with {profileUser.username}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Rate</span>
                <span className="text-yellow-400 flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  {profileUser.privateCallBillingMode === "per_minute"
                    ? `${profileUser.privateCallRate} coins/min`
                    : `${profileUser.privateCallSessionPrice} coins/session`
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Your Balance</span>
                <span className="text-white flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  {currentUser?.coins || 0} coins
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-400">
              {profileUser.privateCallBillingMode === "per_minute"
                ? "You will be charged every minute while the call is active."
                : "You will be charged the full session price when the host accepts."
              }
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCallDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => requestCallMutation.mutate()}
              className="bg-pink-500 hover:bg-pink-600"
              disabled={requestCallMutation.isPending}
            >
              {requestCallMutation.isPending ? "Calling..." : "Start Call"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {profileUser && (
        <GiftPanel
          receiverId={profileUser.id}
          receiverName={profileUser.username}
          isOpen={showGiftPanel}
          onClose={() => setShowGiftPanel(false)}
        />
      )}
    </Layout>
  );
}
