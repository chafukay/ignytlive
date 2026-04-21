import { Play, Pause } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

interface VideoTapOverlayProps {
  videoRef?: RefObject<HTMLVideoElement | null>;
  testId?: string;
  forceLive?: boolean;
}

export function VideoTapOverlay({ videoRef, testId, forceLive = false }: VideoTapOverlayProps) {
  const [indicator, setIndicator] = useState<{ kind: "play" | "pause" | "live" } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const flash = (kind: "play" | "pause" | "live") => {
    setIndicator({ kind });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIndicator(null), 600);
  };

  const handleTap = () => {
    const video = videoRef?.current ?? null;
    if (forceLive || !video) {
      flash("live");
      return;
    }
    const isLive =
      (video.seekable.length === 0 && !isFinite(video.duration)) ||
      !!(video as HTMLVideoElement & { srcObject?: MediaProvider | null }).srcObject;

    if (isLive) {
      flash("live");
      return;
    }

    if (video.paused) {
      flash("pause");
      video.play().catch(() => flash("play"));
    } else {
      video.pause();
      flash("play");
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Toggle play/pause"
        onClick={handleTap}
        className="absolute inset-0 z-10 w-full h-full bg-transparent cursor-pointer"
        data-testid={testId ? `button-toggle-play-${testId}` : "button-toggle-play"}
      />
      {indicator && (
        <div
          className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center"
          style={{ animation: "shorts-tap-fade 600ms ease-out forwards" }}
          data-testid={testId ? `indicator-play-state-${testId}` : "indicator-play-state"}
        >
          <div className="bg-black/50 backdrop-blur-sm rounded-full px-5 py-5 flex items-center justify-center">
            {indicator.kind === "live" ? (
              <span className="flex items-center gap-2 px-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white font-bold text-sm tracking-wide">LIVE</span>
              </span>
            ) : indicator.kind === "play" ? (
              <Play className="w-12 h-12 text-white fill-white" />
            ) : (
              <Pause className="w-12 h-12 text-white fill-white" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
