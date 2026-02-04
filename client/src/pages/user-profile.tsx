import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Layout from "@/components/layout";
import UserAvatar from "@/components/user-avatar";
import BadgesDisplay from "@/components/badges-display";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, Video, UserPlus, UserCheck, Coins, Clock, Sparkles } from "lucide-react";
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
import type { UserItem, StoreItem } from "@shared/schema";

type UserItemWithItem = UserItem & { item: StoreItem };

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCallDialog, setShowCallDialog] = useState(false);

  const { data: profileUser, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.getUser(userId!),
    enabled: !!userId,
  });

  const { data: liveStreams } = useQuery({
    queryKey: ['liveStreams'],
    queryFn: () => api.getLiveStreams(),
  });

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
      toast({
        title: "Cannot start call",
        description,
        variant: "destructive",
      });
    },
  });

  const handleFollow = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const handlePrivateCall = () => {
    if (!profileUser?.availableForPrivateCall) {
      toast({
        title: "Not Available",
        description: "This user is not accepting private calls right now",
        variant: "destructive",
      });
      return;
    }
    setShowCallDialog(true);
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

  const isOwnProfile = currentUser?.id === userId;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black pb-20">
        <div className="relative">
          <div className="h-32 bg-gradient-to-br from-pink-500/30 to-purple-600/30" />
          
          <button
            onClick={() => setLocation('/')}
            className="absolute top-4 left-4 p-2 rounded-full bg-black/50 text-white"
            data-testid="btn-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
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
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full z-20">
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
              {profileUser.bio && (
                <p className="text-gray-400 mt-2 max-w-xs">{profileUser.bio}</p>
              )}
            </div>

            <div className="flex justify-center gap-8 mt-6 text-center">
              <div>
                <div className="font-bold text-white text-lg">{formatNumber(profileUser.followersCount)}</div>
                <div className="text-xs text-gray-400">Followers</div>
              </div>
              <div>
                <div className="font-bold text-white text-lg">{formatNumber(profileUser.followingCount)}</div>
                <div className="text-xs text-gray-400">Following</div>
              </div>
              <div>
                <div className="font-bold text-white text-lg">{formatNumber(profileUser.totalLikes)}</div>
                <div className="text-xs text-gray-400">Likes</div>
              </div>
            </div>

            {!isOwnProfile && (
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleFollow}
                  variant={isFollowing ? "outline" : "default"}
                  className={isFollowing ? "border-pink-500 text-pink-500" : "bg-pink-500 hover:bg-pink-600"}
                  data-testid="btn-follow"
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => setLocation(`/chat/${userId}`)}
                  variant="outline"
                  className="border-gray-600"
                  data-testid="btn-message"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>

                {profileUser.availableForPrivateCall && (
                  <Button
                    onClick={handlePrivateCall}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    data-testid="btn-private-call"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                )}
              </div>
            )}

            {isLive && liveStream && (
              <Button
                onClick={() => setLocation(`/live/${liveStream.id}`)}
                className="mt-4 bg-red-500 hover:bg-red-600"
                data-testid="btn-watch-live"
              >
                Watch Live Now
              </Button>
            )}

            {profileUser.availableForPrivateCall && (
              <div className="mt-6 bg-white/5 rounded-xl p-4 w-full max-w-sm">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Video className="w-4 h-4 text-pink-500" />
                  Private Video Call
                </h3>
                <div className="flex items-center gap-4 text-sm">
                  {profileUser.privateCallBillingMode === "per_minute" ? (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Coins className="w-4 h-4" />
                      <span>{profileUser.privateCallRate} coins/min</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Coins className="w-4 h-4" />
                      <span>{profileUser.privateCallSessionPrice} coins/session</span>
                    </div>
                  )}
                </div>
              </div>
            )}
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
    </Layout>
  );
}
