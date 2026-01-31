import Layout from "@/components/layout";
import { Heart, MessageCircle, Share2, Music2, Disc, Plus, Video } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Shorts() {
  const [activeShort, setActiveShort] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shorts, isLoading } = useQuery({
    queryKey: ['shorts'],
    queryFn: () => api.getShortsFeed(),
  });

  const likeMutation = useMutation({
    mutationFn: (shortId: string) => api.likeShort(shortId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const index = Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight);
    setActiveShort(index);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[calc(100vh-5rem)] md:h-screen w-full bg-black flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Post Short Button - Fixed at top */}
      {user && (
        <Link href="/post-short">
          <button
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-full shadow-lg hover:opacity-90 transition-opacity"
            data-testid="button-post-short"
          >
            <Video className="w-5 h-5" />
            <span>Post Short</span>
          </button>
        </Link>
      )}

      {!shorts || shorts.length === 0 ? (
        <div className="h-[calc(100vh-5rem)] md:h-screen w-full bg-black flex flex-col items-center justify-center">
          <div className="text-white/50 text-center">
            <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No shorts available yet</p>
            <p className="text-sm mt-2">Be the first to post a short!</p>
            {user && (
              <Link href="/post-short">
                <button className="mt-6 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-full">
                  Post Your First Short
                </button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div 
          className="h-[calc(100vh-5rem)] md:h-screen w-full snap-y snap-mandatory overflow-y-scroll no-scrollbar bg-black"
          onScroll={handleScroll}
        >
          {shorts.map((short, i) => {
            // Check if videoUrl is a video (data URL or file extension)
            const isVideo = short.videoUrl && (
              short.videoUrl.startsWith('data:video/') || 
              short.videoUrl.endsWith('.mp4') ||
              short.videoUrl.endsWith('.webm') ||
              short.videoUrl.endsWith('.mov')
            );

            return (
            <div key={short.id} className="h-full w-full snap-start relative flex items-center justify-center bg-gray-900">
              {/* Video or Thumbnail */}
              {isVideo ? (
                <video 
                  src={short.videoUrl}
                  className="w-full h-full object-cover"
                  autoPlay={i === activeShort}
                  loop
                  muted
                  playsInline
                  data-testid={`video-short-${short.id}`}
                />
              ) : (
                <img 
                  src={short.thumbnail || short.videoUrl || "https://api.dicebear.com/7.x/shapes/svg?seed=" + short.id} 
                  alt="Short" 
                  className="w-full h-full object-cover opacity-90"
                  data-testid={`img-short-${short.id}`}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />

              {/* Right Side Actions */}
              <div className="absolute right-4 bottom-20 flex flex-col items-center gap-6 z-20">
                <Link href={`/profile/${short.user.id}`}>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden p-0.5">
                      <img 
                        src={short.user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + short.user.username} 
                        className="w-full h-full rounded-full object-cover" 
                        data-testid={`img-avatar-${short.id}`}
                      />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary rounded-full p-0.5">
                      <Plus className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </Link>

                <div className="flex flex-col items-center gap-1">
                  <button 
                    onClick={() => user && likeMutation.mutate(short.id)}
                    disabled={!user || likeMutation.isPending}
                    className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors cursor-pointer disabled:opacity-50"
                    data-testid={`button-like-${short.id}`}
                  >
                    <Heart className="w-7 h-7 text-white fill-white/20 hover:fill-red-500 hover:text-red-500 transition-colors" />
                  </button>
                  <span className="text-white text-xs font-bold" data-testid={`text-likes-${short.id}`}>
                    {formatCount(short.likesCount)}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors cursor-pointer">
                    <MessageCircle className="w-7 h-7 text-white fill-white/20" />
                  </div>
                  <span className="text-white text-xs font-bold">{formatCount(short.commentsCount)}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors cursor-pointer">
                    <Share2 className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-white text-xs font-bold">{formatCount(short.sharesCount)}</span>
                </div>

                <div className="mt-2 animate-[spin_5s_linear_infinite]">
                  <div className="w-12 h-12 rounded-full bg-gray-800 border-4 border-gray-900 flex items-center justify-center relative overflow-hidden">
                    <img 
                      src={short.user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + short.user.username} 
                      className="w-full h-full object-cover opacity-80" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Disc className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-6 left-4 right-16 z-20 text-white">
                <Link href={`/profile/${short.user.id}`}>
                  <h3 className="font-bold text-lg mb-2 hover:underline" data-testid={`text-username-${short.id}`}>
                    @{short.user.username}
                  </h3>
                </Link>
                <p className="text-sm mb-4 line-clamp-2">{short.description || "Check out this short!"}</p>
                
                {short.song && (
                  <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm animate-pulse">
                    <Music2 className="w-3 h-3" />
                    <div className="text-xs overflow-hidden w-32 whitespace-nowrap">
                      <span className="inline-block animate-marquee">{short.song}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
