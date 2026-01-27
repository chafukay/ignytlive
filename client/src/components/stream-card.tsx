import { Link } from "wouter";
import type { Stream, User } from "@shared/schema";
import { Eye } from "lucide-react";

interface StreamCardProps {
  stream: Stream & { user: User };
}

export default function StreamCard({ stream }: StreamCardProps) {
  const formatViewers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDiamonds = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <Link href={`/live/${stream.id}`}>
      <div className="relative group cursor-pointer overflow-hidden rounded-2xl aspect-[3/4] bg-muted">
        <img 
          src={stream.thumbnail || stream.user.avatar || "https://api.dicebear.com/7.x/shapes/svg?seed=" + stream.id} 
          alt={stream.user.username}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          data-testid={`img-stream-${stream.id}`}
        />
        
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />

        {/* Viewer Count */}
        <div 
          className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1"
          data-testid={`text-viewers-${stream.id}`}
        >
          <Eye className="w-3 h-3" />
          {formatViewers(stream.viewersCount)}
        </div>

        {/* VIP/Special Badge */}
        {stream.isPKBattle && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
            VS
          </div>
        )}

        {/* User Info at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2 mb-1">
            <img 
              src={stream.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.user.username}`}
              className="w-6 h-6 rounded-full border border-white/20"
            />
            <h3 
              className="font-bold text-white text-sm truncate flex-1"
              data-testid={`text-username-${stream.id}`}
            >
              {stream.user.username}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-white/80 text-xs">
            <span className="text-pink-400">💎</span>
            <span>{formatDiamonds(stream.user.diamonds || 0)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
