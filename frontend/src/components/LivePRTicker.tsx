"use client";

import { useEffect, useState, useRef } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { useLiveECData } from "@/lib/hooks";

function AnimatedCount({ value, duration = 800 }: { value: number; duration?: number }) {
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

// Map EC Nepali party names to canonical English names and colors
const PARTY_MAP: Record<string, { en: string; short: string; color: string }> = {
  "राष्ट्रिय स्वतन्त्र पार्टी": { en: "RSP", short: "RSP", color: "#F59E0B" },
  "नेपाली काँग्रेस": { en: "Nepali Congress", short: "NC", color: "#E11D48" },
  "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)": { en: "CPN-UML", short: "UML", color: "#2563EB" },
  "नेपाली कम्युनिष्ट पार्टी": { en: "CPN-Maoist", short: "MC", color: "#DC2626" },
  "राष्ट्रिय प्रजातन्त्र पार्टी": { en: "RPP", short: "RPP", color: "#8B5CF6" },
  "जनता समाजवादी पार्टी": { en: "Janata Samajbadi", short: "JSP", color: "#10B981" },
  "जनमत पार्टी": { en: "Janamat", short: "JP", color: "#F97316" },
  "लोकतान्त्रिक समाजवादी": { en: "Loktantrik", short: "LSP", color: "#6366F1" },
  "नागरिक उन्मुक्ति पार्टी": { en: "Nagarik Unmukti", short: "NUP", color: "#14B8A6" },
  "श्रम संस्कृति पार्टी": { en: "Shram Sanskriti", short: "SSP", color: "#059669" },
};

function getPartyInfo(name: string) {
  for (const [np, info] of Object.entries(PARTY_MAP)) {
    if (name.includes(np) || np.includes(name)) return info;
  }
  return { en: name, short: name.substring(0, 4), color: "#6B7280" };
}

export default function LivePRTicker() {
  const { ecData, isLoading } = useLiveECData("pr");
  const lastUpdate = ecData?.lastFetched
    ? new Date(ecData.lastFetched).toLocaleTimeString()
    : null;

  if (isLoading && !ecData) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <div className="h-6 w-48 animate-pulse rounded mb-3" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  const parties = ecData?.data ?? [];
  const totalVotes = parties.reduce(
    (s, p) => s + (p.TotalVoteReceived ?? 0),
    0
  );
  const maxVotes = Math.max(...parties.map((p) => p.TotalVoteReceived ?? 0), 1);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" />
            Live समानुपातिक Votes
          </h2>
          <p className="text-[11px] text-gray-500">
            Proportional Representation • Auto-refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-[10px] text-gray-600 tabular-nums flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: "3s" }} />
              {lastUpdate}
            </span>
          )}
        </div>
      </div>

      {/* Total votes counter */}
      <div className="px-4 sm:px-5 py-3 border-b border-white/5 bg-gradient-to-r from-purple-500/5 to-transparent">
        <p className="text-xs text-gray-400">Total PR Votes Cast</p>
        <p className="text-3xl font-black text-white tabular-nums mt-0.5">
          <AnimatedCount value={totalVotes} duration={1200} />
        </p>
      </div>

      {/* Party list */}
      <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
        {parties
          .filter((p) => (p.TotalVoteReceived ?? 0) > 0)
          .slice(0, 20)
          .map((party, idx) => {
            const info = getPartyInfo(party.PoliticalPartyName);
            const votes = party.TotalVoteReceived ?? 0;
            const pct = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : "0";
            const barWidth = (votes / maxVotes) * 100;
            const meetsThreshold = totalVotes > 0 && votes / totalVotes >= 0.03;

            return (
              <div
                key={idx}
                className="px-4 sm:px-5 py-3 hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-gray-600 text-xs font-mono w-5 shrink-0">
                      {idx + 1}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-lg"
                      style={{
                        backgroundColor: info.color,
                        boxShadow: `0 0 6px ${info.color}40`,
                      }}
                    />
                    <div className="min-w-0">
                      <span className="text-sm text-white font-semibold">
                        {info.short}
                      </span>
                      <span className="text-[11px] text-gray-500 ml-2 hidden sm:inline truncate">
                        {party.PoliticalPartyName}
                      </span>
                    </div>
                    {!meetsThreshold && totalVotes > 0 && (
                      <span className="text-[9px] text-red-400/60 bg-red-900/20 px-1.5 py-0.5 rounded hidden sm:inline">
                        &lt;3%
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-sm font-bold text-white tabular-nums">
                      <AnimatedCount value={votes} />
                    </span>
                    <span className="text-[11px] text-gray-500 ml-1.5 tabular-nums">
                      {pct}%
                    </span>
                  </div>
                </div>

                {/* Vote bar */}
                <div className="ml-[30px] h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${barWidth}%`,
                      background: `linear-gradient(90deg, ${info.color}, ${info.color}99)`,
                      boxShadow: `0 0 8px ${info.color}30`,
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>

      {/* 3% threshold line */}
      {totalVotes > 0 && (
        <div className="px-4 sm:px-5 py-2 border-t border-white/5 bg-yellow-500/[0.03]">
          <p className="text-[10px] text-yellow-500/70">
            ३% सीमा (threshold): {Math.floor(totalVotes * 0.03).toLocaleString()} votes needed for PR seats
          </p>
        </div>
      )}
    </div>
  );
}
