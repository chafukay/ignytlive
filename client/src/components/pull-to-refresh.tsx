import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const THRESHOLD = 80;
const MAX_PULL = 130;
const RESISTANCE = 0.45;

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const pulling = useRef(false);
  const directionLocked = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const isAtTop = useCallback(() => {
    const el = containerRef.current;
    if (!el) return false;
    let scrollParent: HTMLElement | null = el;
    while (scrollParent) {
      if (scrollParent.scrollTop > 0) return false;
      scrollParent = scrollParent.parentElement;
    }
    return true;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing) return;
    if (isAtTop()) {
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      pulling.current = true;
      directionLocked.current = false;
    }
  }, [isRefreshing, isAtTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const diffY = currentY - startY.current;
    const diffX = Math.abs(currentX - startX.current);

    if (!directionLocked.current && (diffY > 10 || diffX > 10)) {
      directionLocked.current = true;
      if (diffX > Math.abs(diffY)) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }
    }

    if (diffY > 0 && isAtTop()) {
      const distance = Math.min(diffY * RESISTANCE, MAX_PULL);
      setPullDistance(distance);
      if (distance > 10) {
        e.preventDefault();
      }
    } else {
      pulling.current = false;
      setPullDistance(0);
    }
  }, [isRefreshing, isAtTop]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || isRefreshing) return;
    pulling.current = false;
    directionLocked.current = false;
    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD);
      await queryClient.invalidateQueries();
      await new Promise(r => setTimeout(r, 600));
      setIsRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, isRefreshing, queryClient]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[60] flex items-center justify-center transition-opacity duration-200 pointer-events-none"
        style={{
          top: pullDistance - 40,
          opacity: progress > 0.1 ? 1 : 0,
        }}
      >
        <div className="w-9 h-9 rounded-full bg-card border border-border shadow-lg flex items-center justify-center">
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <svg
              className="w-5 h-5 text-primary transition-transform duration-200"
              style={{ transform: `rotate(${progress * 360}deg)` }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </div>
      </div>
      <div
        className="h-full w-full"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: pulling.current ? "none" : "transform 0.3s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
