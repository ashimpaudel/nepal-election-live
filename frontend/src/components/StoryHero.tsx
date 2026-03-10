"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Vote, BarChart3, Clock } from "lucide-react";
import type { Party, ElectionSummary } from "@/data/electionData";

interface StoryHeroProps {
  parties: Party[];
  summary: ElectionSummary;
}

/* ── Animated counter (ease-out cubic, requestAnimationFrame) ── */
function AnimatedCount({
  value,
  duration = 1500,
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

/* ── Time-ago helper ── */
function timeAgo(date: Date | null): string {
  if (!date) return "—";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

const TOTAL_SEATS = 275;
const MAJORITY = Math.floor(TOTAL_SEATS / 2) + 1; // 138
const SUPERMAJORITY = Math.ceil((TOTAL_SEATS * 2) / 3); // 184
const FPTP_SEATS = 165;

export default function StoryHero({ parties, summary }: StoryHeroProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  /* ── Derived data ── */
  const leadingParty = useMemo(() => {
    if (!parties.length) return null;
    return parties.reduce((a, b) => {
      const aTotal = a.totalSeats || (a.won + a.leading);
      const bTotal = b.totalSeats || (b.won + b.leading);
      return aTotal > bTotal ? a : b;
    });
  }, [parties]);

  const leaderTotal = leadingParty
    ? (leadingParty.totalSeats || (leadingParty.won + leadingParty.leading))
    : 0;

  const headlineLabel = useMemo(() => {
    if (!leadingParty)
      return { en: "Election Results", ne: "निर्वाचन नतिजा" };
    if (leaderTotal > TOTAL_SEATS / 2) {
      return {
        en: `${leadingParty.shortName}'s Historic Landslide`,
        ne: "ऐतिहासिक बहुमत",
      };
    }
    return {
      en: `${leadingParty.shortName} Takes the Lead`,
      ne: "अग्रस्थानमा",
    };
  }, [leadingParty, leaderTotal]);

  const majorityStatus = useMemo(() => {
    const hasMajority = leaderTotal >= MAJORITY;
    const hasSuper = leaderTotal >= SUPERMAJORITY;
    const seatsAway = SUPERMAJORITY - leaderTotal;
    return { hasMajority, hasSuper, seatsAway };
  }, [leaderTotal]);

  const fptpDeclared = useMemo(
    () => parties.reduce((s, p) => s + p.won, 0),
    [parties]
  );

  const partyColor = leadingParty?.color ?? "#3b82f6";

  /* ── SVG Arc geometry ── */
  const ARC_CX = 200;
  const ARC_CY = 190;
  const ARC_R = 150;
  const ARC_START_ANGLE = Math.PI; // left (180°)
  const ARC_END_ANGLE = 0; // right (0°)
  const ARC_LENGTH = Math.PI * ARC_R; // semicircle perimeter

  const seatAngle = (seats: number) =>
    ARC_START_ANGLE -
    (seats / TOTAL_SEATS) * (ARC_START_ANGLE - ARC_END_ANGLE);

  const pointOnArc = (seats: number) => {
    const a = seatAngle(seats);
    return {
      x: ARC_CX + ARC_R * Math.cos(a),
      y: ARC_CY - ARC_R * Math.sin(a),
    };
  };

  const filledLength = (leaderTotal / TOTAL_SEATS) * ARC_LENGTH;

  const majorityPt = pointOnArc(MAJORITY);
  const superPt = pointOnArc(SUPERMAJORITY);

  /* Tick mark endpoints (short lines pointing inward) */
  const tickLine = (seats: number, len: number) => {
    const a = seatAngle(seats);
    return {
      outer: {
        x: ARC_CX + (ARC_R + len) * Math.cos(a),
        y: ARC_CY - (ARC_R + len) * Math.sin(a),
      },
      inner: {
        x: ARC_CX + (ARC_R - len) * Math.cos(a),
        y: ARC_CY - (ARC_R - len) * Math.sin(a),
      },
    };
  };

  const majTick = tickLine(MAJORITY, 12);
  const superTick = tickLine(SUPERMAJORITY, 14);

  /* Label placement (offset outward) */
  const labelPoint = (seats: number, offset: number) => {
    const a = seatAngle(seats);
    return {
      x: ARC_CX + (ARC_R + offset) * Math.cos(a),
      y: ARC_CY - (ARC_R + offset) * Math.sin(a),
    };
  };
  const majLabel = labelPoint(MAJORITY, 30);
  const superLabel = labelPoint(SUPERMAJORITY, 32);

  const nearThreshold =
    !majorityStatus.hasSuper &&
    majorityStatus.hasMajority &&
    majorityStatus.seatsAway <= 10;

  return (
    <section
      className="relative overflow-hidden rounded-2xl"
      role="banner"
      aria-label="Election results hero"
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-20 blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 30%, ${partyColor}, transparent)`,
        }}
      />

      <div className="relative glass-card rounded-2xl px-4 py-8 sm:px-8 sm:py-10">
        {/* ── THE STORY: Three boxes telling what matters ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* Box 1: RSP has WON (the fact) */}
          <div
            className="text-center lg:text-left space-y-2 transition-all duration-700 ease-out"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(18px)",
            }}
          >
            <p className="text-xs uppercase tracking-widest text-gray-500">
              प्रतिनिधि सभा निर्वाचन २०८२
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">
              {headlineLabel.en}
            </h1>
            <p className="text-base text-gray-400 font-medium">
              {headlineLabel.ne}
            </p>
            {leadingParty && leaderTotal > TOTAL_SEATS / 2 && (
              <p className="text-xs text-gray-500 italic leading-relaxed max-w-sm">
                The {leadingParty.name}, founded just 4 years ago, has crushed
                Nepal&apos;s political establishment in the biggest upset since
                the restoration of democracy.
              </p>
            )}
          </div>

          {/* Box 2: THE BIG QUESTION — ⅔ majority tracker (center stage) */}
          <div
            className="flex flex-col items-center justify-center transition-all duration-700 ease-out"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "scale(1)" : "scale(0.95)",
              transitionDelay: "200ms",
            }}
          >
            {majorityStatus.hasSuper ? (
              /* ✅ Supermajority achieved */
              <div className="text-center space-y-2">
                <p className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                  ⅔ Supermajority Achieved
                </p>
                <p
                  className="text-7xl sm:text-8xl font-black tabular-nums"
                  style={{ color: partyColor, textShadow: `0 0 40px ${partyColor}44` }}
                >
                  <AnimatedCount value={leaderTotal} />
                </p>
                <p className="text-sm text-gray-400">of 275 seats</p>
              </div>
            ) : majorityStatus.hasMajority ? (
              /* 🔥 Majority secured, approaching ⅔ */
              <div className="text-center space-y-3">
                <p className="text-xs uppercase tracking-widest text-red-400 font-bold animate-pulse">
                  Can {leadingParty?.shortName} amend the constitution?
                </p>
                <div className="flex items-end justify-center gap-1">
                  <span
                    className="text-7xl sm:text-8xl font-black tabular-nums leading-none"
                    style={{ color: partyColor, textShadow: `0 0 40px ${partyColor}44` }}
                  >
                    <AnimatedCount value={leaderTotal} />
                  </span>
                  <span className="text-3xl sm:text-4xl font-bold text-gray-600 mb-2">
                    / {SUPERMAJORITY}
                  </span>
                </div>
                <div className="w-full max-w-xs mx-auto">
                  {/* Linear progress bar — much clearer than arc */}
                  <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: mounted ? `${(leaderTotal / SUPERMAJORITY) * 100}%` : "0%",
                        backgroundColor: partyColor,
                        boxShadow: `0 0 12px ${partyColor}66`,
                      }}
                    />
                    {/* Majority marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-green-500"
                      style={{ left: `${(MAJORITY / SUPERMAJORITY) * 100}%` }}
                      title={`Majority: ${MAJORITY}`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-0.5">
                    <span>0</span>
                    <span className="text-green-500 font-bold">
                      ✓ {MAJORITY} majority
                    </span>
                    <span className="text-red-400 font-bold">
                      {SUPERMAJORITY} ⅔
                    </span>
                  </div>
                </div>
                {/* THE number everyone wants to see */}
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-4xl sm:text-5xl font-black text-red-400 tabular-nums">
                    <AnimatedCount value={majorityStatus.seatsAway} />
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-red-300">
                      more {majorityStatus.seatsAway === 1 ? "seat" : "seats"} needed
                    </p>
                    <p className="text-xs text-gray-500">
                      for ⅔ supermajority to amend constitution
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Race to majority */
              <div className="text-center space-y-2">
                <p className="text-xs uppercase tracking-widest text-gray-400">
                  Race to Majority
                </p>
                <p
                  className="text-7xl sm:text-8xl font-black tabular-nums"
                  style={{ color: partyColor }}
                >
                  <AnimatedCount value={leaderTotal} />
                </p>
                <p className="text-sm text-gray-400">
                  {MAJORITY - leaderTotal} seats to majority ({MAJORITY})
                </p>
              </div>
            )}
          </div>

          {/* Box 3: Key numbers at a glance */}
          <div
            className="flex flex-col items-center lg:items-end justify-center gap-3 transition-all duration-700 ease-out"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(18px)",
              transitionDelay: "400ms",
            }}
          >
            {/* FPTP breakdown */}
            <div className="glass rounded-xl px-4 py-3 text-center lg:text-right w-full max-w-[200px]">
              <p className="text-[10px] uppercase tracking-widest text-gray-500">FPTP Won</p>
              <p className="text-2xl font-black text-white tabular-nums">
                {leadingParty?.won ?? 0}
                <span className="text-sm text-gray-500 font-normal"> / {FPTP_SEATS}</span>
              </p>
            </div>
            {/* PR seats */}
            <div className="glass rounded-xl px-4 py-3 text-center lg:text-right w-full max-w-[200px]">
              <p className="text-[10px] uppercase tracking-widest text-gray-500">PR Seats</p>
              <p className="text-2xl font-black text-purple-400 tabular-nums">
                {leadingParty?.prSeats ?? 0}
                <span className="text-sm text-gray-500 font-normal"> / 110</span>
              </p>
            </div>
            {/* PR votes being counted */}
            <div className="glass rounded-xl px-4 py-3 text-center lg:text-right w-full max-w-[200px]">
              <p className="text-[10px] uppercase tracking-widest text-gray-500">PR Votes</p>
              <p className="text-lg font-bold text-gray-300 tabular-nums">
                {(summary.totalVotesCast / 1_000_000).toFixed(1)}M
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Scoped keyframes */}
      <style>{`
        @keyframes hero-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </section>
  );
}
