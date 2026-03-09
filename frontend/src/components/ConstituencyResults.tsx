"use client";

import { useState } from "react";
import { Search, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import type { Constituency } from "@/data/electionData";

interface ConstituencyResultsProps {
  constituencies: Constituency[];
}

const STATUS_STYLES = {
  declared: {
    label: "Declared",
    bg: "bg-green-900/50",
    text: "text-green-400",
    border: "border-green-700/50",
  },
  counting: {
    label: "Counting",
    bg: "bg-yellow-900/50",
    text: "text-yellow-400",
    border: "border-yellow-700/50",
  },
  pending: {
    label: "Pending",
    bg: "bg-gray-800/50",
    text: "text-gray-500",
    border: "border-gray-700/50",
  },
};

const PROVINCES = [
  "All",
  "Koshi",
  "Madhesh",
  "Bagmati",
  "Gandaki",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
];

export default function ConstituencyResults({
  constituencies,
}: ConstituencyResultsProps) {
  const [search, setSearch] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("All");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = constituencies.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesProvince =
      selectedProvince === "All" || c.province === selectedProvince;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesProvince && matchesStatus;
  });

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/50">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-400" />
          Constituency Results
        </h2>
        <p className="text-xs text-gray-400">
          निर्वाचन क्षेत्रगत नतिजा
        </p>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-gray-700/50 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search constituency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900/50 border border-gray-600/50 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {PROVINCES.map((prov) => (
            <button
              key={prov}
              onClick={() => setSelectedProvince(prov)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedProvince === prov
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
              }`}
            >
              {prov}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {["all", "declared", "counting", "pending"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === status
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
              }`}
            >
              {status === "all"
                ? "All"
                : STATUS_STYLES[status as keyof typeof STATUS_STYLES].label}
            </button>
          ))}
        </div>
      </div>

      {/* Results list */}
      <div className="max-h-[500px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">
            No constituencies found
          </p>
        ) : (
          <div className="divide-y divide-gray-700/30">
            {filtered.map((c) => {
              const style = STATUS_STYLES[c.status];
              const isExpanded = expandedId === c.id;
              const winner = c.candidates[0];
              return (
                <div key={c.id}>
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : c.id)
                    }
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium text-sm truncate">
                            {c.name}
                          </p>
                          <span
                            className={`${style.bg} ${style.text} ${style.border} border text-xs px-2 py-0.5 rounded-full`}
                          >
                            {style.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {c.province}
                        </p>
                      </div>

                      {winner && c.status !== "pending" && (
                        <div className="text-right shrink-0 ml-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: winner.color }}
                            />
                            <span className="text-white text-sm font-bold">
                              {winner.partyShort}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">
                            {winner.votes.toLocaleString()} votes
                          </p>
                        </div>
                      )}

                      <span className="text-gray-500 ml-2">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-2">
                      {c.candidates.map((cand, idx) => {
                        const maxVotes = c.candidates[0]?.votes || 1;
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cand.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-xs mb-0.5">
                                <span className="text-gray-300 truncate">
                                  {cand.partyShort}
                                </span>
                                <span className="text-gray-400 shrink-0 ml-2">
                                  {cand.votes.toLocaleString()}
                                </span>
                              </div>
                              <div className="w-full bg-gray-700/50 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{
                                    width:
                                      maxVotes > 0
                                        ? `${(cand.votes / maxVotes) * 100}%`
                                        : "0%",
                                    backgroundColor: cand.color,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
