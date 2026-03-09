"use client";

import { useState, useEffect, useRef } from "react";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";
import { useLivePAData } from "@/lib/hooks";

interface PAResultsProps {
  provinceId: number;
  provinceName: string;
}

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

const PARTY_MAP: Record<string, { en: string; short: string; color: string }> = {
  "राष्ट्रिय स्वतन्त्र पार्टी": { en: "RSP", short: "RSP", color: "#F59E0B" },
  "नेपाली काँग्रेस": { en: "Nepali Congress", short: "NC", color: "#E11D48" },
  "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)": { en: "CPN-UML", short: "UML", color: "#2563EB" },
  "नेपाली कम्युनिष्ट पार्टी": { en: "CPN-Maoist", short: "MC", color: "#DC2626" },
  "राष्ट्रिय प्रजातन्त्र पार्टी": { en: "RPP", short: "RPP", color: "#8B5CF6" },
  "जनता समाजवादी पार्टी": { en: "Janata Samajbadi", short: "JSP", color: "#10B981" },
  "जनमत पार्टी": { en: "Janamat", short: "JP", color: "#F97316" },
  "श्रम संस्कृति पार्टी": { en: "Shram Sanskriti", short: "SSP", color: "#059669" },
};

function getPartyInfo(name: string) {
  for (const [np, info] of Object.entries(PARTY_MAP)) {
    if (name.includes(np) || np.includes(name)) return info;
  }
  return { en: name, short: name.substring(0, 4), color: "#6B7280" };
}

export default function PAResults({ provinceId, provinceName }: PAResultsProps) {
  const { paData, isLoading } = useLivePAData(provinceId);
  const [showAll, setShowAll] = useState(false);

  if (isLoading && !paData) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <div className="h-6 w-56 animate-pulse rounded bg-white/5 mb-3" />
        <div className="h-4 w-32 animate-pulse rounded bg-white/5 mb-4" />
        <div className="flex gap-3 mb-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 flex-1 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const parties = paData?.data ?? [];

  if (parties.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <Building2 className="w-8 h-8 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">
          No Provincial Assembly data available for {provinceName} yet.
        </p>
        <p className="text-gray-600 text-xs mt-1">
          Data will appear once counting begins.
        </p>
      </div>
    );
  }

  const totalWon = parties.reduce((s, p) => s + (p.TotWin ?? 0), 0);
  const totalLeading = parties.reduce((s, p) => s + (p.TotLead ?? 0), 0);
  const totalSeats = totalWon + totalLeading;
  const maxWinLead = Math.max(...parties.map((p) => (p.TotWin ?? 0) + (p.TotLead ?? 0)), 1);

  const sortedParties = [...parties]
    .filter((p) => (p.TotWinLead ?? (p.TotWin ?? 0) + (p.TotLead ?? 0)) > 0)
    .sort((a, b) => {
      const aTotal = a.TotWinLead ?? (a.TotWin ?? 0) + (a.TotLead ?? 0);
      const bTotal = b.TotWinLead ?? (b.TotWin ?? 0) + (b.TotLead ?? 0);
      return bTotal - aTotal;
    });

  const displayed = showAll ? sortedParties : sortedParties.slice(0, 6);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-white/5">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-purple-400" />
          प्रदेश सभा • Provincial Assembly
        </h2>
        <p className="text-xs text-gray-400">{provinceName}</p>
      </div>

      {/* Compact seat distribution bar */}
      {sortedParties.length > 0 && (
        <div className="px-4 sm:px-5 py-3 border-b border-white/5">
          <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
            {sortedParties
              .filter((p) => (p.TotWin ?? 0) > 0)
              .map((party, idx) => {
                const info = getPartyInfo(party.PoliticalPartyName);
                const won = party.TotWin ?? 0;
                return (
                  <div
                    key={idx}
                    title={`${info.short}: ${won} won`}
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${totalSeats > 0 ? (won / totalSeats) * 100 : 0}%`,
                      backgroundColor: info.color,
                    }}
                  />
                );
              })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {sortedParties
              .filter((p) => (p.TotWin ?? 0) > 0)
              .slice(0, 6)
              .map((party, idx) => {
                const info = getPartyInfo(party.PoliticalPartyName);
                return (
                  <div key={idx} className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: info.color }}
                    />
                    <span className="text-[10px] text-gray-400">
                      {info.short} ({party.TotWin ?? 0})
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Summary row */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
        <div className="px-4 py-3 text-center">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Won</p>
          <p className="text-xl font-black text-green-400 tabular-nums mt-0.5">
            <AnimatedCount value={totalWon} />
          </p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Leading</p>
          <p className="text-xl font-black text-yellow-400 tabular-nums mt-0.5">
            <AnimatedCount value={totalLeading} />
          </p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Total</p>
          <p className="text-xl font-black text-white tabular-nums mt-0.5">
            <AnimatedCount value={totalSeats} />
          </p>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-gray-500 text-xs uppercase">
              <th className="text-left px-4 py-2">Party</th>
              <th className="text-center px-2 py-2">Won</th>
              <th className="text-center px-2 py-2">Leading</th>
              <th className="text-center px-2 py-2">Total</th>
              <th className="text-left px-4 py-2 w-36">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {displayed.map((party, idx) => {
              const info = getPartyInfo(party.PoliticalPartyName);
              const won = party.TotWin ?? 0;
              const leading = party.TotLead ?? 0;
              const total = party.TotWinLead ?? won + leading;
              const barWidth = (total / maxWinLead) * 100;

              return (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-lg"
                        style={{
                          backgroundColor: info.color,
                          boxShadow: `0 0 6px ${info.color}40`,
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm">{info.short}</p>
                        <p className="text-gray-500 text-xs truncate">
                          {party.PoliticalPartyName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center px-2 py-3">
                    <span className="text-green-400 font-bold">{won}</span>
                  </td>
                  <td className="text-center px-2 py-3">
                    <span className="text-yellow-400 font-medium">{leading}</span>
                  </td>
                  <td className="text-center px-2 py-3">
                    <span className="text-white font-black text-base">{total}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${barWidth}%`,
                          background: `linear-gradient(90deg, ${info.color}, ${info.color}99)`,
                          boxShadow: `0 0 8px ${info.color}30`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="sm:hidden divide-y divide-white/5">
        {displayed.map((party, idx) => {
          const info = getPartyInfo(party.PoliticalPartyName);
          const won = party.TotWin ?? 0;
          const leading = party.TotLead ?? 0;
          const total = party.TotWinLead ?? won + leading;
          const barWidth = (total / maxWinLead) * 100;

          return (
            <div key={idx} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: info.color }}
                  />
                  <div>
                    <p className="text-white font-medium text-sm">{info.short}</p>
                    <p className="text-gray-500 text-xs">{party.PoliticalPartyName}</p>
                  </div>
                </div>
                <span className="text-white font-black text-xl">{total}</span>
              </div>

              <div className="flex items-center gap-3 text-xs mb-2">
                <span className="text-green-400">
                  Won: <strong>{won}</strong>
                </span>
                <span className="text-yellow-400">
                  Leading: <strong>{leading}</strong>
                </span>
              </div>

              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-700 ease-out"
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

      {/* Show All toggle */}
      {sortedParties.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center py-3 text-sm text-blue-400 hover:text-blue-300 border-t border-white/5 transition-colors flex items-center justify-center gap-1"
        >
          {showAll ? (
            <>
              Show Less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Show All {sortedParties.length} Parties <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
