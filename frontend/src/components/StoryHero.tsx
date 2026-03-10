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

      <div className="relative glass-card rounded-2xl px-4 py-8 sm:px-8 sm:py-10 space-y-6">
        {/* ── Headline ── */}
        <div
          className="text-center transition-all duration-700 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(18px)",
          }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
            {headlineLabel.en}
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 mt-1 font-medium">
            {headlineLabel.ne}
          </p>
        </div>

        {/* ── Big Number + Arc ── */}
        <div className="flex flex-col items-center gap-2">
          {/* The big number */}
          <div
            className="text-center transition-all duration-700 ease-out"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(24px)",
              transitionDelay: "200ms",
            }}
          >
            <p
              className="text-7xl sm:text-8xl md:text-9xl font-black tabular-nums leading-none"
              style={{
                color: partyColor,
                textShadow: `0 0 40px ${partyColor}44, 0 0 80px ${partyColor}22`,
              }}
            >
              <AnimatedCount value={leaderTotal} duration={1500} />
            </p>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              of {TOTAL_SEATS} seats
              {leadingParty && (
                <span className="ml-2 text-gray-400 font-semibold">
                  ({leadingParty.shortName})
                </span>
              )}
            </p>
          </div>

          {/* ── Semicircular Gauge ── */}
          <div
            className="w-full max-w-sm sm:max-w-md transition-opacity duration-700"
            style={{ opacity: mounted ? 1 : 0, transitionDelay: "400ms" }}
          >
            <svg
              viewBox="0 0 400 230"
              className="w-full h-auto"
              role="img"
              aria-label={`Seat gauge: ${leaderTotal} of ${TOTAL_SEATS} seats`}
            >
              <defs>
                <filter
                  id="hero-arc-glow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background arc */}
              <path
                d={`M ${ARC_CX - ARC_R} ${ARC_CY} A ${ARC_R} ${ARC_R} 0 0 1 ${ARC_CX + ARC_R} ${ARC_CY}`}
                fill="none"
                stroke="rgba(148,163,184,0.12)"
                strokeWidth="18"
                strokeLinecap="round"
              />

              {/* Filled arc */}
              <path
                d={`M ${ARC_CX - ARC_R} ${ARC_CY} A ${ARC_R} ${ARC_R} 0 0 1 ${ARC_CX + ARC_R} ${ARC_CY}`}
                fill="none"
                stroke={partyColor}
                strokeWidth="18"
                strokeLinecap="round"
                strokeDasharray={ARC_LENGTH}
                strokeDashoffset={
                  mounted ? ARC_LENGTH - filledLength : ARC_LENGTH
                }
                filter={nearThreshold ? "url(#hero-arc-glow)" : undefined}
                style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
                className={
                  nearThreshold
                    ? "animate-[hero-pulse_2s_ease-in-out_infinite]"
                    : ""
                }
              />

              {/* Majority tick (138) */}
              <line
                x1={majTick.outer.x}
                y1={majTick.outer.y}
                x2={majTick.inner.x}
                y2={majTick.inner.y}
                stroke={
                  majorityStatus.hasMajority
                    ? "#22c55e"
                    : "rgba(148,163,184,0.4)"
                }
                strokeWidth="2"
              />
              <circle
                cx={majorityPt.x}
                cy={majorityPt.y}
                r="4"
                fill={
                  majorityStatus.hasMajority
                    ? "#22c55e"
                    : "rgba(148,163,184,0.3)"
                }
              />
              <text
                x={majLabel.x}
                y={majLabel.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[9px] sm:text-[10px] font-semibold"
                fill={majorityStatus.hasMajority ? "#22c55e" : "#94a3b8"}
              >
                {majorityStatus.hasMajority
                  ? "✓ Majority"
                  : `${MAJORITY} Majority`}
              </text>

              {/* Supermajority tick (184) */}
              <line
                x1={superTick.outer.x}
                y1={superTick.outer.y}
                x2={superTick.inner.x}
                y2={superTick.inner.y}
                stroke={
                  majorityStatus.hasSuper
                    ? "#f59e0b"
                    : "rgba(148,163,184,0.5)"
                }
                strokeWidth="2.5"
              />
              <circle
                cx={superPt.x}
                cy={superPt.y}
                r="5"
                fill={
                  majorityStatus.hasSuper
                    ? "#f59e0b"
                    : "rgba(148,163,184,0.3)"
                }
                stroke={
                  majorityStatus.hasSuper
                    ? "#f59e0b"
                    : "rgba(148,163,184,0.15)"
                }
                strokeWidth="2"
              />
              <text
                x={superLabel.x}
                y={superLabel.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[9px] sm:text-[10px] font-bold"
                fill={majorityStatus.hasSuper ? "#f59e0b" : "#94a3b8"}
              >
                {majorityStatus.hasSuper
                  ? "✓ ⅔ Supermajority"
                  : `${SUPERMAJORITY} ⅔ Amendment`}
              </text>

              {/* Center status text */}
              <text
                x={ARC_CX}
                y={ARC_CY + 10}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[11px] sm:text-xs font-semibold"
                fill={
                  majorityStatus.hasSuper
                    ? "#f59e0b"
                    : majorityStatus.hasMajority
                      ? "#22c55e"
                      : "#94a3b8"
                }
              >
                {majorityStatus.hasSuper
                  ? "⅔ Supermajority Secured"
                  : majorityStatus.hasMajority
                    ? majorityStatus.seatsAway <= 10
                      ? `${majorityStatus.seatsAway} seat${majorityStatus.seatsAway !== 1 ? "s" : ""} from ⅔ supermajority`
                      : "✓ Majority Secured"
                    : `${MAJORITY - leaderTotal} seats to majority`}
              </text>

              {/* Arc endpoint labels */}
              <text
                x={ARC_CX - ARC_R - 4}
                y={ARC_CY + 16}
                textAnchor="middle"
                className="text-[10px]"
                fill="#475569"
              >
                0
              </text>
              <text
                x={ARC_CX + ARC_R + 4}
                y={ARC_CY + 16}
                textAnchor="middle"
                className="text-[10px]"
                fill="#475569"
              >
                {TOTAL_SEATS}
              </text>
            </svg>
          </div>
        </div>

        {/* ── Stat Pills ── */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {[
            {
              icon: Vote,
              label: `${fptpDeclared}/${FPTP_SEATS} FPTP Declared`,
              delay: "500ms",
            },
            {
              icon: BarChart3,
              label: `${(summary.totalVotesCast / 1_000_000).toFixed(1)}M PR Votes Counted`,
              delay: "600ms",
            },
            {
              icon: Clock,
              label: `Updated ${timeAgo(summary.lastUpdated)}`,
              delay: "700ms",
            },
          ].map((pill) => (
            <div
              key={pill.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs sm:text-sm text-gray-300 transition-all duration-500 ease-out"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(12px)",
                transitionDelay: pill.delay,
              }}
            >
              <pill.icon className="w-3.5 h-3.5 text-gray-400" />
              {pill.label}
            </div>
          ))}
        </div>

        {/* ── Editorial context line ── */}
        {leadingParty && leaderTotal > TOTAL_SEATS / 2 && (
          <p
            className="text-center text-xs sm:text-sm text-gray-500 max-w-2xl mx-auto leading-relaxed italic transition-all duration-700 ease-out"
            style={{
              opacity: mounted ? 1 : 0,
              transitionDelay: "900ms",
            }}
          >
            &ldquo;The {leadingParty.name}, founded just 4 years ago, has
            crushed Nepal&apos;s political establishment in the biggest electoral
            upset since the restoration of democracy.&rdquo;
          </p>
        )}
      </div>

      {/* Scoped keyframes */}
      <style>{`
        @keyframes hero-pulse {
          0%, 100% { opacity: 1; filter: url(#hero-arc-glow); }
          50% { opacity: 0.8; }
        }
      `}</style>
    </section>
  );
}
