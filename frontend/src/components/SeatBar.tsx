import type { Party } from "@/data/electionData";

interface SeatBarProps {
  parties: Party[];
  totalSeats: number;
}

export default function SeatBar({ parties, totalSeats }: SeatBarProps) {
  const majority = Math.floor(totalSeats / 2) + 1;
  const declaredSeats = parties.reduce((s, p) => s + p.won, 0);
  const majorityPct = (majority / totalSeats) * 100;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-white">Seat Distribution</h2>
        <span className="text-xs text-gray-400">
          {declaredSeats}/{totalSeats} declared
        </span>
      </div>

      {/* Stacked bar */}
      <div className="relative">
        <div className="flex h-6 rounded-full overflow-hidden bg-gray-700">
          {parties
            .filter((p) => p.won > 0)
            .map((party) => (
              <div
                key={party.name}
                title={`${party.shortName}: ${party.won} seats`}
                className="h-full transition-all duration-500 relative group"
                style={{
                  width: `${(party.won / totalSeats) * 100}%`,
                  backgroundColor: party.color,
                }}
              >
                {party.won > 3 && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">
                    {party.won}
                  </span>
                )}
              </div>
            ))}
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

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-8">
        {parties
          .filter((p) => p.won > 0)
          .slice(0, 6)
          .map((party) => (
            <div key={party.name} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: party.color }}
              />
              <span className="text-xs text-gray-400">
                {party.shortName} ({party.won})
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
