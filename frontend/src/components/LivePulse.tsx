"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { CheckCircle } from "lucide-react";

/* ── Animated number counter (same pattern as LivePRTicker) ─────────── */
function AnimatedCount({
  value,
  duration = 800,
}: {
  value: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    if (value === 0 && from === 0) return;
    const start = performance.now();
    let frameId: number;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

/* ── Relative-time hook (refreshes every 10 s) ─────────────────────── */
function useRelativeTime(date: Date | null): string {
  const getRelative = useCallback((d: Date | null): string => {
    if (!d) return "";
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }, []);

  const [text, setText] = useState(() => getRelative(date));

  useEffect(() => {
    setText(getRelative(date));
    const id = setInterval(() => setText(getRelative(date)), 10_000);
    return () => clearInterval(id);
  }, [date, getRelative]);

  return text;
}

/* ── Props ──────────────────────────────────────────────────────────── */
interface LivePulseProps {
  declared: number;
  totalFPTP: number;
  prVotesCounted: number;
  lastUpdated: Date | null;
  isLive: boolean;
}

/* ── Component ──────────────────────────────────────────────────────── */
export default function LivePulse({
  declared,
  totalFPTP,
  prVotesCounted,
  lastUpdated,
  isLive,
}: LivePulseProps) {
  const relativeTime = useRelativeTime(lastUpdated);
  const allDeclared = declared === totalFPTP;

  return (
    <div
      className="sticky top-0 z-50 w-full h-10 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-b border-white/5 select-none"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between gap-4 text-[13px] tabular-nums overflow-x-auto scrollbar-hide">
        {/* ── Live indicator / All declared badge ────────────────── */}
        <div className="flex items-center gap-3 shrink-0">
          {allDeclared ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
              <CheckCircle className="w-3.5 h-3.5" />
              ALL SEATS DECLARED
            </span>
          ) : isLive ? (
            <span className="flex items-center gap-2 font-bold text-white text-xs">
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-[live-dot-ping_1.5s_ease-in-out_infinite]" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              LIVE
            </span>
          ) : (
            <span className="text-xs font-bold text-gray-400">OFFLINE</span>
          )}

          <span
            className="hidden sm:block w-px h-4 bg-white/10"
            aria-hidden="true"
          />
        </div>

        {/* ── Stats ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto scrollbar-hide whitespace-nowrap">
          {/* FPTP declared — always visible */}
          <span className="text-gray-300">
            <span className="text-gray-500 mr-1 hidden sm:inline">FPTP:</span>
            <span className="font-semibold text-white">
              <AnimatedCount value={declared} />
            </span>
            <span className="text-gray-500">/{totalFPTP}</span>
            <span className="text-gray-500 ml-1 hidden sm:inline">
              declared
            </span>
          </span>

          <span
            className="hidden md:block w-px h-4 bg-white/10"
            aria-hidden="true"
          />

          {/* PR votes — hidden on mobile */}
          <span className="hidden md:flex items-center text-gray-300">
            <span className="text-gray-500 mr-1">PR:</span>
            <span className="font-semibold text-white">
              <AnimatedCount value={prVotesCounted} duration={1200} />
            </span>
            <span className="text-gray-500 ml-1">votes counted</span>
          </span>

          {relativeTime && (
            <span
              className="hidden md:block w-px h-4 bg-white/10"
              aria-hidden="true"
            />
          )}

          {/* Updated time — hidden on mobile */}
          {relativeTime && (
            <span className="hidden md:inline text-gray-500 text-xs">
              Updated {relativeTime}
            </span>
          )}
        </div>
      </div>

      {/* Pulsing dot keyframes (scoped) */}
      <style jsx>{`
        @keyframes live-dot-ping {
          0%,
          100% {
            opacity: 0.75;
            transform: scale(1);
          }
          50% {
            opacity: 0;
            transform: scale(2);
          }
        }
      `}</style>
    </div>
  );
}
