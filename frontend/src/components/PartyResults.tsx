"use client";

import { useState } from "react";
import { Users, ChevronDown, ChevronUp } from "lucide-react";
import type { Party } from "@/data/electionData";

interface PartyResultsProps {
  parties: Party[];
  totalSeats: number;
}

export default function PartyResults({
  parties,
  totalSeats,
}: PartyResultsProps) {
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? parties : parties.slice(0, 6);

  const maxTotal = Math.max(...parties.map((p) => p.won + p.leading), 1);
  const totalVotes = parties.reduce((s, p) => s + p.totalVotes, 0);
  const majority = Math.floor(totalSeats / 2) + 1;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Party-wise Results
          </h2>
          <p className="text-xs text-gray-400">
            दलगत नतिजा • Majority: {majority} seats
          </p>
        </div>
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700/50 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-2">Party</th>
              <th className="text-center px-2 py-2">Won</th>
              <th className="text-center px-2 py-2">Leading</th>
              <th className="text-center px-2 py-2">Total</th>
              <th className="text-left px-4 py-2 w-40">Progress</th>
              <th className="text-right px-4 py-2">Votes</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((party) => {
              const total = party.won + party.leading;
              const votePercent =
                totalVotes > 0
                  ? ((party.totalVotes / totalVotes) * 100).toFixed(1)
                  : "0";
              return (
                <tr
                  key={party.name}
                  className="border-b border-gray-700/30 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: party.color }}
                      />
                      <div>
                        <p className="text-white font-medium text-sm">
                          {party.shortName}
                        </p>
                        <p className="text-gray-500 text-xs">{party.nameNp}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center px-2 py-3">
                    <span className="text-green-400 font-bold">
                      {party.won}
                    </span>
                  </td>
                  <td className="text-center px-2 py-3">
                    <span className="text-yellow-400 font-medium">
                      {party.leading}
                    </span>
                  </td>
                  <td className="text-center px-2 py-3">
                    <span className="text-white font-black text-base">
                      {total}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-gray-700/50 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${(total / maxTotal) * 100}%`,
                          backgroundColor: party.color,
                        }}
                      />
                    </div>
                  </td>
                  <td className="text-right px-4 py-3 text-gray-300 text-xs">
                    {party.totalVotes.toLocaleString()}
                    <span className="text-gray-500 ml-1">({votePercent}%)</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile vertical card layout */}
      <div className="sm:hidden divide-y divide-gray-700/30">
        {displayed.map((party) => {
          const total = party.won + party.leading;
          const votePercent =
            totalVotes > 0
              ? ((party.totalVotes / totalVotes) * 100).toFixed(1)
              : "0";
          return (
            <div key={party.name} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: party.color }}
                  />
                  <div>
                    <p className="text-white font-medium text-sm">
                      {party.shortName}
                    </p>
                    <p className="text-gray-500 text-xs">{party.nameNp}</p>
                  </div>
                </div>
                <span className="text-white font-black text-xl">{total}</span>
              </div>

              <div className="flex items-center gap-3 text-xs mb-2">
                <span className="text-green-400">
                  Won: <strong>{party.won}</strong>
                </span>
                <span className="text-yellow-400">
                  Leading: <strong>{party.leading}</strong>
                </span>
                <span className="text-gray-400 ml-auto">
                  {party.totalVotes.toLocaleString()} ({votePercent}%)
                </span>
              </div>

              <div className="w-full bg-gray-700/50 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(total / maxTotal) * 100}%`,
                    backgroundColor: party.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {parties.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center py-3 text-sm text-blue-400 hover:text-blue-300 border-t border-gray-700/50 transition-colors flex items-center justify-center gap-1"
        >
          {showAll ? (
            <>
              Show Less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Show All {parties.length} Parties <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
