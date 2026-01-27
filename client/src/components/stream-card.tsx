import { Link } from "wouter";
import type { Stream, User } from "@shared/schema";
import { Eye, Swords, Video } from "lucide-react";

interface StreamCardProps {
  stream: Stream & { user: User };
  rank?: number;
}

export default function StreamCard({ stream, rank }: StreamCardProps) {
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

        {/* TOP Rank Badge */}
        {rank && rank <= 50 && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
            TOP {rank}
          </div>
        )}

        {/* In Battle Badge */}
        {stream.isPKBattle && (
          <div className="absolute bottom-16 left-3 flex items-center gap-1">
            <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Swords className="w-3 h-3" /> In battle
            </span>
            {rank && (
              <span className="bg-yellow-500/90 text-black text-[9px] font-bold px-2 py-0.5 rounded">
                TOP {rank}
              </span>
            )}
          </div>
        )}

        {/* Video Call Button */}
        <button 
          className="absolute bottom-16 right-3 bg-yellow-500 text-black p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Video className="w-4 h-4" />
        </button>

        {/* User Info at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="relative">
              <img 
                src={stream.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.user.username}`}
                className="w-7 h-7 rounded-full border-2 border-pink-500"
              />
              {stream.user.level && (
                <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[8px] font-bold px-1 rounded-full min-w-[14px] text-center">
                  {stream.user.level}
                </span>
              )}
            </div>
            <h3 
              className="font-bold text-white text-sm truncate flex-1"
              data-testid={`text-username-${stream.id}`}
            >
              {stream.user.username}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-white/80 text-xs">
            <span className="text-yellow-400">💎</span>
            <span>{formatDiamonds(stream.user.diamonds || 0)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
