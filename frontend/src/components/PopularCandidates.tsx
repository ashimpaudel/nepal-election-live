"use client";

import { useMemo } from "react";
import { Trophy, Check } from "lucide-react";

interface PopularCandidatesProps {
  constituencies: Array<{
    id: number;
    name: string;
    status: "declared" | "counting" | "pending";
    candidates: Array<{
      name: string;
      party: string;
      partyShort: string;
      votes: number;
      color: string;
    }>;
  }>;
}

export default function PopularCandidates({
  constituencies,
}: PopularCandidatesProps) {
  const topCandidates = useMemo(() => {
    const winners: Array<{
      name: string;
      party: string;
      partyShort: string;
      votes: number;
      color: string;
      constituency: string;
    }> = [];

    for (const c of constituencies) {
      if (c.status !== "declared" || c.candidates.length === 0) continue;
      const sorted = [...c.candidates].sort((a, b) => b.votes - a.votes);
      const winner = sorted[0];
      winners.push({
        name: winner.name,
        party: winner.party,
        partyShort: winner.partyShort,
        votes: winner.votes,
        color: winner.color,
        constituency: c.name,
      });
    }

    return winners.sort((a, b) => b.votes - a.votes).slice(0, 15);
  }, [constituencies]);

  if (topCandidates.length === 0) return null;

  return (
    <div className="border-t border-gray-800 pt-4">
      <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3 flex items-center gap-2">
        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
        Top Vote-Getters • शीर्ष मत प्राप्तकर्ता
      </h2>

      {/* Mobile: horizontal scroll carousel */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 lg:hidden">
        {topCandidates.map((candidate, i) => (
          <CandidateCard key={i} candidate={candidate} />
        ))}
      </div>

      {/* Desktop: grid layout */}
      <div className="hidden lg:grid lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {topCandidates.map((candidate, i) => (
          <CandidateCard key={i} candidate={candidate} />
        ))}
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
}: {
  candidate: {
    name: string;
    party: string;
    partyShort: string;
    votes: number;
    color: string;
    constituency: string;
  };
}) {
  const initial = candidate.name.charAt(0).toUpperCase();

  return (
    <div className="glass-card rounded-2xl relative flex-shrink-0 w-[140px] lg:w-auto snap-start overflow-hidden">
      <div className="p-3 flex flex-col items-center text-center gap-2">
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold text-white/90 relative"
          style={{ backgroundColor: candidate.color }}
        >
          {initial}
          {/* Elected badge */}
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-gray-900">
            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </span>
        </div>

        {/* Name */}
        <p className="text-xs font-bold text-white leading-tight line-clamp-2 min-h-[2lh]">
          {candidate.name}
        </p>

        {/* Constituency */}
        <p className="text-[10px] text-gray-400 leading-tight line-clamp-1">
          {candidate.constituency}
        </p>

        {/* Votes */}
        <p className="text-sm font-bold text-white tabular-nums">
          {candidate.votes.toLocaleString("en-NP")}
        </p>

        {/* Party badge */}
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white/90"
          style={{ backgroundColor: `${candidate.color}33`, color: candidate.color }}
        >
          {candidate.partyShort}
        </span>
      </div>

      {/* Party color accent bar */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: candidate.color }}
      />
    </div>
  );
}
