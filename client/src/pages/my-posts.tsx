import Layout from "@/components/layout";
import { GuestGate } from "@/components/guest-gate";
import { ArrowLeft, Play, Heart, Grid3X3 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useRef, useState } from "react";

const MAX_CONCURRENT_PREVIEWS = 4;

function VideoTile({ src, testId }: { src: string; testId: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setShouldPlay(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setShouldPlay(entry.isIntersecting && entry.intersectionRatio >= 0.5);
        });
      },
      { threshold: [0, 0.5, 1] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (shouldPlay || isHovered) {
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } else {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {}
    }
  }, [shouldPlay, isHovered]);

  return (
    <video
      ref={videoRef}
      src={src}
      className="w-full h-full object-cover"
      muted
      loop
      playsInline
      preload="metadata"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={testId}
    />
  );
}

export default function MyPosts() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: shorts, isLoading } = useQuery({
    queryKey: ['user-shorts', user?.id],
    queryFn: () => api.getUserShorts(user!.id),
    enabled: !!user,
  });

  const tileRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const visibilityRatios = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!shorts || shorts.length === 0) return;

    if (typeof IntersectionObserver === "undefined") {
      const fallback = shorts.slice(0, MAX_CONCURRENT_PREVIEWS).map((s) => s.id);
      setVisibleIds(new Set(fallback));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.shortId;
          if (!id) return;
          visibilityRatios.current.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        const sorted = Array.from(visibilityRatios.current.entries())
          .filter(([, ratio]) => ratio >= 0.5)
          .sort((a, b) => b[1] - a[1])
          .slice(0, MAX_CONCURRENT_PREVIEWS)
          .map(([id]) => id);

        setVisibleIds(new Set(sorted));
      },
      { threshold: [0, 0.5, 1] }
    );

    tileRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [shorts]);

  if (!user) {
    return null;
  }

  return (
    <GuestGate>
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-white/10">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setLocation("/profile")} className="p-2" data-testid="button-back">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-lg font-bold text-white">My Posts</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Grid3X3 className="w-5 h-5 text-purple-400" />
            <span className="text-white font-medium">{shorts?.length || 0} Posts</span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-3 gap-1">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="aspect-[9/16] bg-gray-800 animate-pulse rounded" />
              ))}
            </div>
          ) : !shorts || shorts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Play className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">No Posts Yet</h3>
              <p className="text-gray-400 text-sm mb-4">Share your first short video!</p>
              <Link href="/post-short">
                <button className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-full" data-testid="button-create-first-post">
                  Create Post
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {shorts.map((short) => {
                const isVideo = short.videoUrl && (
                  short.videoUrl.startsWith('data:video/') || 
                  short.videoUrl.endsWith('.mp4') ||
                  short.videoUrl.endsWith('.webm') ||
                  short.videoUrl.endsWith('.mov')
                );
                const isPreviewing = visibleIds.has(short.id);

                return (
                  <Link key={short.id} href={`/shorts?id=${short.id}`}>
                    <div
                      ref={(el) => {
                        if (el) {
                          el.dataset.shortId = short.id;
                          tileRefs.current.set(short.id, el);
                        } else {
                          tileRefs.current.delete(short.id);
                        }
                      }}
                      className="aspect-[9/16] bg-gray-800 rounded overflow-hidden relative group cursor-pointer"
                      data-testid={`post-${short.id}`}
                    >
                      {isVideo ? (
                        isPreviewing ? (
                          <VideoTile src={short.videoUrl!} testId={`video-preview-${short.id}`} />
                        ) : (
                          <>
                            {short.thumbnail ? (
                              <img
                                src={short.thumbnail}
                                alt="Post thumbnail"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <video
                                src={short.videoUrl || undefined}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            )}
                          </>
                        )
                      ) : (
                        <img 
                          src={short.thumbnail || short.videoUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${short.id}`}
                          alt="Post thumbnail"
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex items-center gap-1 text-white">
                          <Heart className="w-4 h-4 fill-white" />
                          <span className="text-sm font-semibold">{short.likesCount || 0}</span>
                        </div>
                      </div>

                      <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs">
                        <Play className="w-3 h-3 fill-white" />
                        <span>{short.viewsCount || 0}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
    </GuestGate>
  );
}
