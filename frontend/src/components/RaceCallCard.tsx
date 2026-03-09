"use client";

import { Check, Clock, Minus } from "lucide-react";

interface RaceCallCardProps {
  constituencyName: string;
  status: "declared" | "counting" | "pending";
  candidates: Array<{
    name: string;
    party: string;
    partyShort: string;
    votes: number;
    color: string;
  }>;
  totalVotes: number;
}

const STATUS_CONFIG = {
  declared: {
    label: "✓ Called",
    bg: "bg-green-500/15",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  counting: {
    label: "Counting",
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
  },
  pending: {
    label: "Pending",
    bg: "bg-gray-500/15",
    text: "text-gray-400",
    border: "border-gray-500/30",
  },
} as const;

function StatusIcon({ status }: { status: RaceCallCardProps["status"] }) {
  switch (status) {
    case "declared":
      return <Check className="w-3 h-3" />;
    case "counting":
      return <Clock className="w-3 h-3" />;
    case "pending":
      return <Minus className="w-3 h-3" />;
  }
}

export default function RaceCallCard({
  constituencyName,
  status,
  candidates,
  totalVotes,
}: RaceCallCardProps) {
  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
  const winner = status === "declared" ? sorted[0] : null;
  const visible = sorted.slice(0, 3);
  const remaining = sorted.length - 3;
  const maxVotes = sorted[0]?.votes ?? 1;
  const statusCfg = STATUS_CONFIG[status];

  return (
    <div className="glass-card rounded-2xl overflow-hidden max-h-[200px] flex flex-col">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-700/50 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white truncate">
          {constituencyName}
        </h3>
        <span
          className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
        >
          <StatusIcon status={status} />
          {statusCfg.label}
        </span>
      </div>

      {/* Candidates */}
      <div className="flex-1 overflow-hidden">
        {visible.map((candidate, idx) => {
          const isWinner = winner && idx === 0;
          const pct = totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0;
          const barWidth = maxVotes > 0 ? (candidate.votes / maxVotes) * 100 : 0;

          return (
            <div
              key={candidate.name}
              className={`relative flex items-center gap-3 px-4 transition-colors ${
                isWinner
                  ? "py-2.5 bg-white/[0.04]"
                  : "py-1.5 hover:bg-white/[0.02]"
              }`}
              style={{
                borderLeft: isWinner
                  ? `3px solid ${candidate.color}`
                  : `2px solid ${candidate.color}`,
              }}
            >
              {/* Name + party */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {isWinner && (
                    <span
                      className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: candidate.color }}
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                  <span
                    className={`truncate ${
                      isWinner
                        ? "text-sm font-bold text-white"
                        : "text-xs font-medium text-gray-300"
                    }`}
                  >
                    {candidate.name}
                  </span>
                  <span
                    className="shrink-0 text-[9px] font-bold uppercase px-1.5 py-px rounded"
                    style={{
                      backgroundColor: `${candidate.color}20`,
                      color: candidate.color,
                    }}
                  >
                    {candidate.partyShort}
                  </span>
                  {isWinner && (
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-green-400">
                      Elected
                    </span>
                  )}
                </div>

                {/* Vote bar */}
                <div className="mt-1 w-full bg-gray-700/30 rounded-full h-1">
                  <div
                    className="h-1 rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: candidate.color,
                      opacity: isWinner ? 1 : 0.6,
                    }}
                  />
                </div>
              </div>

              {/* Vote count + percentage */}
              <div className="shrink-0 text-right">
                <p
                  className={`tabular-nums ${
                    isWinner
                      ? "text-sm font-black text-white"
                      : "text-xs font-semibold text-gray-300"
                  }`}
                >
                  {candidate.votes.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500 tabular-nums">
                  {pct.toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })}

        {/* "X more" footer */}
        {remaining > 0 && (
          <p className="px-4 py-1.5 text-[10px] text-gray-500 text-center border-t border-gray-700/30">
            +{remaining} more candidate{remaining > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
