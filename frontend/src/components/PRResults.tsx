"use client";

import { PieChart, AlertCircle } from "lucide-react";
import type { Party } from "@/lib/types";

interface PRResultsProps {
  prData: {
    totalPRVotes: number;
    threshold: number;
    totalPRSeats: number;
    parties: Array<
      Party & {
        pr_vote_percent: number;
        meets_threshold: boolean;
      }
    >;
  } | null;
}

export default function PRResults({ prData }: PRResultsProps) {
  if (!prData) {
    return (
      <div className="glass-card rounded-2xl p-4 animate-pulse h-48" />
    );
  }

  const { totalPRVotes, threshold, totalPRSeats, parties } = prData;
  const allocatedSeats = parties.reduce((s, p) => s + (p.pr_seats || 0), 0);
  const qualifiedParties = parties.filter((p) => p.meets_threshold);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/50">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <PieChart className="w-4 h-4 text-purple-400" />
          Proportional Representation
        </h2>
        <p className="text-xs text-gray-400">
          समानुपातिक प्रतिनिधित्व • {totalPRSeats} Seats
        </p>
      </div>

      {/* PR Summary stats */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-gray-700/30">
        <div className="text-center">
          <p className="text-xs text-gray-400">Total PR Votes</p>
          <p className="text-lg font-bold text-white">
            {totalPRVotes.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Seats Allocated</p>
          <p className="text-lg font-bold text-purple-400">
            {allocatedSeats}/{totalPRSeats}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">3% Threshold</p>
          <p className="text-lg font-bold text-yellow-400">
            {threshold.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Threshold info */}
      <div className="px-4 py-2 bg-yellow-900/10 border-b border-yellow-700/20 flex items-center gap-2">
        <AlertCircle className="w-3 h-3 text-yellow-400 shrink-0" />
        <p className="text-xs text-yellow-400/80">
          Parties need ≥3% of total PR votes ({threshold.toLocaleString()}) to
          qualify for PR seats
        </p>
      </div>

      {/* PR seat allocation bar */}
      <div className="px-4 py-3">
        <div className="flex h-5 rounded-full overflow-hidden bg-gray-700/50 mb-2">
          {qualifiedParties
            .filter((p) => p.pr_seats > 0)
            .map((party) => (
              <div
                key={party.id ?? party.name_en}
                title={`${party.short_name}: ${party.pr_seats} PR seats`}
                className="h-full transition-all duration-500"
                style={{
                  width: `${(party.pr_seats / totalPRSeats) * 100}%`,
                  backgroundColor: party.color,
                }}
              />
            ))}
        </div>
      </div>

      {/* Party-wise PR breakdown */}
      <div className="divide-y divide-gray-700/30 max-h-[350px] overflow-y-auto">
        {parties
          .filter((p) => p.pr_votes > 0)
          .map((party) => (
            <div
              key={party.id ?? party.name_en}
              className={`px-4 py-2.5 flex items-center gap-3 ${
                !party.meets_threshold ? "opacity-50" : ""
              }`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: party.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">
                      {party.short_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {party.name_ne}
                    </span>
                    {!party.meets_threshold && (
                      <span className="text-[10px] text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded">
                        Below threshold
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-sm font-bold text-purple-400">
                      {party.pr_seats}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">seats</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-700/50 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${party.pr_vote_percent}%`,
                        backgroundColor: party.color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 w-20 text-right">
                    {party.pr_votes.toLocaleString()} ({party.pr_vote_percent}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
