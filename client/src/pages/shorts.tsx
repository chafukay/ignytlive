import Layout from "@/components/layout";
import { MOCK_SHORTS } from "@/lib/mock-data";
import { Heart, MessageCircle, Share2, Music2, Disc, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Shorts() {
  const [activeShort, setActiveShort] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const index = Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight);
    setActiveShort(index);
  };

  return (
    <Layout>
      <div 
        className="h-[calc(100vh-5rem)] md:h-screen w-full snap-y snap-mandatory overflow-y-scroll no-scrollbar bg-black"
        onScroll={handleScroll}
      >
        {MOCK_SHORTS.map((short, i) => (
          <div key={short.id} className="h-full w-full snap-start relative flex items-center justify-center bg-gray-900">
            {/* Video Placeholder */}
            <img 
              src={short.video} 
              alt="Short" 
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />

            {/* Right Side Actions */}
            <div className="absolute right-4 bottom-20 flex flex-col items-center gap-6 z-20">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden p-0.5">
                  <img src={short.user.avatar} className="w-full h-full rounded-full object-cover" />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary rounded-full p-0.5">
                    <Plus className="w-3 h-3 text-white" />
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors cursor-pointer">
                    <Heart className="w-7 h-7 text-white fill-white/20 hover:fill-red-500 hover:text-red-500 transition-colors" />
                </div>
                <span className="text-white text-xs font-bold">{short.likes}</span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors cursor-pointer">
                    <MessageCircle className="w-7 h-7 text-white fill-white/20" />
                </div>
                <span className="text-white text-xs font-bold">{short.comments}</span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors cursor-pointer">
                    <Share2 className="w-7 h-7 text-white" />
                </div>
                <span className="text-white text-xs font-bold">{short.shares}</span>
              </div>

              <div className="mt-2 animate-[spin_5s_linear_infinite]">
                 <div className="w-12 h-12 rounded-full bg-gray-800 border-4 border-gray-900 flex items-center justify-center relative overflow-hidden">
                    <img src={short.user.avatar} className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Disc className="w-6 h-6 text-white" />
                    </div>
                 </div>
              </div>
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-6 left-4 right-16 z-20 text-white">
                <h3 className="font-bold text-lg mb-2">@{short.user.username}</h3>
                <p className="text-sm mb-4 line-clamp-2">{short.description}</p>
                
                <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm animate-pulse">
                    <Music2 className="w-3 h-3" />
                    <div className="text-xs overflow-hidden w-32 whitespace-nowrap">
                        <span className="inline-block animate-marquee">{short.song}</span>
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
