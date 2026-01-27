import { Link } from "wouter";
import type { Stream, User } from "@shared/schema";
import { Users } from "lucide-react";

interface StreamCardProps {
  stream: Stream & { user: User };
}

export default function StreamCard({ stream }: StreamCardProps) {
  const formatViewers = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <Link href={`/live/${stream.id}`}>
      <div className="relative group cursor-pointer overflow-hidden rounded-2xl aspect-[3/4] bg-muted">
        {/* Image */}
        <img 
          src={stream.thumbnail || stream.user.avatar || "https://api.dicebear.com/7.x/shapes/svg?seed=" + stream.id} 
          alt={stream.user.username}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          data-testid={`img-stream-${stream.id}`}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />

        {/* Live Badge */}
        {stream.isLive && (
          <div className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-primary/20">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}

        {/* PK Battle Badge */}
        {stream.isPKBattle && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-orange-500/30 animate-pulse">
            ⚔️ PK BATTLE
          </div>
        )}

        {/* Viewers Badge */}
        <div 
          className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1"
          data-testid={`text-viewers-${stream.id}`}
        >
          <Users className="w-3 h-3" />
          {formatViewers(stream.viewersCount)}
        </div>

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold bg-accent px-1.5 py-0.5 rounded text-white">
              Lv.{stream.user.level}
            </span>
            <h3 
              className="font-bold text-white text-lg truncate shadow-black drop-shadow-md"
              data-testid={`text-username-${stream.id}`}
            >
              {stream.user.username}
            </h3>
          </div>
          <p className="text-white/80 text-sm truncate mb-2">{stream.title}</p>
          
          {stream.tags && stream.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
              {stream.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
