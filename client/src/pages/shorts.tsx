import Layout from "@/components/layout";
import { Heart, MessageCircle, Share2, Music2, Disc, Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function Shorts() {
  const [activeShort, setActiveShort] = useState(0);

  const { data: shorts, isLoading } = useQuery({
    queryKey: ['shorts'],
    queryFn: () => api.getShortsFeed(),
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

  if (!shorts || shorts.length === 0) {
    return (
      <Layout>
        <div className="h-[calc(100vh-5rem)] md:h-screen w-full bg-black flex items-center justify-center">
          <div className="text-white/50 text-center">
            <p className="text-lg">No shorts available yet</p>
            <p className="text-sm mt-2">Check back soon!</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div 
        className="h-[calc(100vh-5rem)] md:h-screen w-full snap-y snap-mandatory overflow-y-scroll no-scrollbar bg-black"
        onScroll={handleScroll}
      >
        {shorts.map((short, i) => (
          <div key={short.id} className="h-full w-full snap-start relative flex items-center justify-center bg-gray-900">
            {/* Video Placeholder */}
            <img 
              src={short.thumbnail || short.videoUrl || "https://api.dicebear.com/7.x/shapes/svg?seed=" + short.id} 
              alt="Short" 
              className="w-full h-full object-cover opacity-90"
              data-testid={`img-short-${short.id}`}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />

            {/* Right Side Actions */}
            <div className="absolute right-4 bottom-20 flex flex-col items-center gap-6 z-20">
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

              <div className="flex flex-col items-center gap-1">
                <div 
                  className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors cursor-pointer"
                  data-testid={`button-like-${short.id}`}
                >
                    <Heart className="w-7 h-7 text-white fill-white/20 hover:fill-red-500 hover:text-red-500 transition-colors" />
                </div>
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
                <h3 className="font-bold text-lg mb-2" data-testid={`text-username-${short.id}`}>
                  @{short.user.username}
                </h3>
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
        ))}
      </div>
    </Layout>
  );
}
