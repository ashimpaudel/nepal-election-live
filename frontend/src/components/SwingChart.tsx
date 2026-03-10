"use client";

import { useMemo, useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { Party } from "@/data/electionData";

const RESULTS_2079: Record<string, number> = {
  NC: 89,
  UML: 78,
  MC: 32,
  RSP: 20,
  RPP: 14,
  JSP: 12,
  LSP: 4,
  JP: 6,
  NUP: 3,
  SSP: 0,
  Ind: 5,
};

interface SwingChartProps {
  parties: Party[];
  totalSeats: number;
}

interface SwingEntry {
  name: string;
  shortName: string;
  color: string;
  seats2079: number;
  seats2082: number;
  swing: number;
}

export default function SwingChart({ parties, totalSeats }: SwingChartProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const swingData = useMemo<SwingEntry[]>(() => {
    const entries: SwingEntry[] = parties
      .map((p) => {
        const prev = RESULTS_2079[p.shortName] ?? 0;
        const current = p.totalSeats || (p.won + p.leading);
        return {
          name: p.name,
          shortName: p.shortName,
          color: p.color,
          seats2079: prev,
          seats2082: current,
          swing: current - prev,
        };
      })
      .filter((e) => e.seats2079 > 0 || e.seats2082 > 0);

    entries.sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing));
    return entries.slice(0, 8);
  }, [parties]);

  const maxAbsSwing = useMemo(
    () => Math.max(...swingData.map((e) => Math.abs(e.swing)), 1),
    [swingData]
  );

  const largestGainer = useMemo(
    () =>
      swingData.length > 0
        ? swingData.reduce((best, e) => (e.swing > best.swing ? e : best), swingData[0])
        : null,
    [swingData]
  );

  if (swingData.length === 0) return null;

  return (
    <section className="glass-card rounded-2xl p-4 sm:p-6" aria-label="Vote swing chart">
      <style>{`
        @keyframes swing-bar-grow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes swing-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="mb-5">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label="earthquake">
            🌊
          </span>
          The Earthquake: 2079 → 2082
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">भूकम्प: २०७९ → २०८२</p>
      </div>

      {/* Top swing callout */}
      {largestGainer && largestGainer.swing > 0 && (
        <div
          className="mb-5 flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            background: `linear-gradient(135deg, ${largestGainer.color}18, ${largestGainer.color}08)`,
            border: `1px solid ${largestGainer.color}30`,
          }}
        >
          <TrendingUp className="w-5 h-5 shrink-0" style={{ color: largestGainer.color }} />
          <p className="text-sm sm:text-base text-gray-200">
            <span className="font-bold text-white">+{largestGainer.swing} seats</span> gained by{" "}
            <span className="font-semibold" style={{ color: largestGainer.color }}>
              {largestGainer.name}
            </span>{" "}
            — largest swing in Nepal&apos;s democratic history
          </p>
        </div>
      )}

      {/* Diverging bar chart */}
      <div className="space-y-2.5">
        {swingData.map((entry, i) => {
          const barPct = (Math.abs(entry.swing) / maxAbsSwing) * 100;
          const isGain = entry.swing >= 0;
          const delay = `${i * 100}ms`;

          return (
            <div
              key={entry.shortName}
              className="grid items-center gap-x-2"
              style={{
                gridTemplateColumns: "48px 1fr auto",
                animation: animated ? `swing-fade-in 0.4s ease-out ${delay} both` : "none",
              }}
            >
              {/* Party label */}
              <span
                className="text-xs sm:text-sm font-bold text-right tabular-nums"
                style={{ color: entry.color }}
              >
                {entry.shortName}
              </span>

              {/* Bar area — left half = losses, right half = gains */}
              <div className="relative h-7 sm:h-8">
                {/* Center line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600/60" />

                {isGain ? (
                  <div
                    className="absolute top-0.5 bottom-0.5 left-1/2 rounded-r-md"
                    style={{
                      width: `${barPct / 2}%`,
                      background: `linear-gradient(90deg, ${entry.color}, ${entry.color}cc)`,
                      transformOrigin: "left",
                      animation: animated
                        ? `swing-bar-grow 0.6s cubic-bezier(0.34,1.56,0.64,1) ${delay} both`
                        : "none",
                      boxShadow: `0 0 12px ${entry.color}40`,
                    }}
                  />
                ) : (
                  <div
                    className="absolute top-0.5 bottom-0.5 right-1/2 rounded-l-md"
                    style={{
                      width: `${barPct / 2}%`,
                      background: `linear-gradient(270deg, ${entry.color}99, ${entry.color}55)`,
                      transformOrigin: "right",
                      animation: animated
                        ? `swing-bar-grow 0.6s cubic-bezier(0.34,1.56,0.64,1) ${delay} both`
                        : "none",
                      opacity: 0.7,
                    }}
                  />
                )}
              </div>

              {/* Seat count label */}
              <div
                className="text-right text-xs sm:text-sm whitespace-nowrap tabular-nums min-w-[120px] sm:min-w-[150px]"
                style={{
                  animation: animated ? `swing-fade-in 0.4s ease-out ${delay} both` : "none",
                }}
              >
                <span className="text-gray-400">{entry.seats2079}</span>
                <span className="text-gray-600 mx-1">→</span>
                <span className="text-white font-semibold">{entry.seats2082}</span>
                <span className="ml-1.5 font-bold" style={{ color: isGain ? "#22c55e" : "#ef4444" }}>
                  {isGain ? `(+${entry.swing})` : `(${entry.swing})`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-700/30 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-red-400" />
          <span>← Seats lost</span>
        </span>
        <span className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-green-400" />
          <span>Seats gained →</span>
        </span>
        <span className="text-gray-600 ml-auto">Total: {totalSeats} seats</span>
      </div>
    </section>
  );
}
