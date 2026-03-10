import { Trophy } from "lucide-react";
import type { Party } from "@/data/electionData";

interface SeatBarProps {
  parties: Party[];
  totalSeats: number;
}

// 138 seats needed for majority in Nepal's 275-seat House of Representatives
const MAJORITY_SEATS = 138;

export default function SeatBar({ parties, totalSeats }: SeatBarProps) {
  const majority = Math.floor(totalSeats / 2) + 1;
  const allocatedSeats = parties.reduce((s, p) => s + (p.totalSeats || p.won), 0);
  const majorityPct = (majority / totalSeats) * 100;

  // Leading party for the majority progress bar
  const leadingParty = parties.length
    ? parties.reduce((a, b) => {
        const aTotal = a.totalSeats || (a.won + a.leading);
        const bTotal = b.totalSeats || (b.won + b.leading);
        return aTotal > bTotal ? a : b;
      })
    : null;
  const leadingTotal = leadingParty
    ? (leadingParty.totalSeats || (leadingParty.won + leadingParty.leading))
    : 0;
  const majorityProgress = Math.min((leadingTotal / MAJORITY_SEATS) * 100, 100);

  return (
    <div className="glass-card rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          Seat Distribution (FPTP + PR)
        </h2>
        <span className="text-xs text-gray-400">
          {allocatedSeats}/{totalSeats} allocated
        </span>
      </div>

      {/* Stacked bar */}
      <div className="relative">
        <div className="flex h-6 rounded-full overflow-hidden bg-gray-700/50" role="img" aria-label={`Seat distribution: ${allocatedSeats} of ${totalSeats} seats allocated`}>
          {parties
            .filter((p) => (p.totalSeats || p.won) > 0)
            .map((party) => {
              const partyTotal = party.totalSeats || party.won;
              return (
                <div
                  key={party.name}
                  title={`${party.shortName}: ${partyTotal} seats (${party.won} FPTP + ${party.prSeats} PR)`}
                  aria-label={`${party.shortName}: ${partyTotal} seats`}
                  className="h-full transition-all duration-500 relative group"
                  style={{
                    width: `${(partyTotal / totalSeats) * 100}%`,
                    backgroundColor: party.color,
                  }}
                >
                  {partyTotal > 3 && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">
                      {partyTotal}
                    </span>
                  )}
                </div>
              );
            })}
        </div>

        {/* Majority line */}
        <div
          className="absolute top-0 h-full border-l-2 border-dashed border-white/60"
          style={{ left: `${majorityPct}%` }}
        />
        <p
          className="absolute -bottom-5 text-[10px] text-gray-400 -translate-x-1/2"
          style={{ left: `${majorityPct}%` }}
        >
          {majority} (majority)
        </p>
      </div>

      {/* Majority progress bar */}
      {leadingParty && (
        <div className="mt-8 glass rounded-xl p-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-300 font-medium">
              🏆 {leadingParty.shortName} — Path to Majority
            </span>
            <span className="text-gray-400">
              {leadingTotal} / {MAJORITY_SEATS} seats needed
            </span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-700"
              style={{
                width: `${majorityProgress}%`,
                backgroundColor: leadingParty.color,
              }}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-1 text-right">
            {MAJORITY_SEATS - leadingTotal > 0
              ? `${MAJORITY_SEATS - leadingTotal} more seats needed for majority`
              : "Majority achieved!"}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {parties
          .filter((p) => (p.totalSeats || p.won) > 0)
          .slice(0, 6)
          .map((party) => {
            const partyTotal = party.totalSeats || party.won;
            return (
              <div key={party.name} className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: party.color }}
                />
                <span className="text-xs text-gray-400">
                  {party.shortName} ({partyTotal})
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
