"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MapPin, Trophy } from "lucide-react";
import Header from "@/components/Header";
import DrillDown from "@/components/DrillDown";
import DisclaimerFooter from "@/components/DisclaimerFooter";
import { supabase } from "@/lib/supabase";
import type { Constituency, Candidate, District, Province } from "@/lib/types";

export default function ConstituencyPage() {
  const params = useParams();
  const constId = Number(params.id);

  const [constituency, setConstituency] = useState<Constituency | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [district, setDistrict] = useState<District | null>(null);
  const [province, setProvince] = useState<Province | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Load constituency
      const cRes = await supabase
        .from("constituencies")
        .select("*")
        .eq("id", constId)
        .single();

      if (cRes.data) {
        setConstituency(cRes.data);

        // Load district & province
        const dRes = await supabase
          .from("districts")
          .select("*")
          .eq("id", cRes.data.district_id)
          .single();

        if (dRes.data) {
          setDistrict(dRes.data);
          const pRes = await supabase
            .from("provinces")
            .select("*")
            .eq("id", dRes.data.province_id)
            .single();
          if (pRes.data) setProvince(pRes.data);
        }
      }

      // Load candidates with party info
      const candRes = await supabase
        .from("candidates")
        .select("*, party:parties(id, name_en, name_ne, short_name, color)")
        .eq("constituency_id", constId)
        .order("votes", { ascending: false });

      if (candRes.data) setCandidates(candRes.data);
      setLoading(false);
    }
    load();
  }, [constId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Header lastUpdated={null} totalSeats={275} />
        <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          <div className="glass-card rounded-2xl p-4 animate-pulse h-12" />
          <div className="glass-card rounded-2xl p-4 animate-pulse h-64" />
        </main>
      </div>
    );
  }

  if (!constituency) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Header lastUpdated={null} totalSeats={275} />
        <main className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-400">Constituency not found</p>
        </main>
      </div>
    );
  }

  const STATUS_STYLES = {
    declared: { label: "Declared", color: "text-green-400", bg: "bg-green-900/50", border: "border-green-700/50" },
    counting: { label: "Counting", color: "text-yellow-400", bg: "bg-yellow-900/50", border: "border-yellow-700/50" },
    pending: { label: "Pending", color: "text-gray-500", bg: "bg-gray-800/50", border: "border-gray-700/50" },
  };

  const style = STATUS_STYLES[constituency.status];
  const maxVotes = candidates[0]?.votes || 1;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header lastUpdated={null} totalSeats={275} />

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <DrillDown
          breadcrumbs={[
            ...(province
              ? [{ label: province.name_en, href: `/province/${province.id}` }]
              : []),
            ...(district
              ? [{ label: district.name_en, href: `/district/${district.id}` }]
              : []),
            {
              label: constituency.name_en,
              href: `/constituency/${constituency.id}`,
            },
          ]}
        />

        {/* Constituency header */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-red-400" />
              <div>
                <h1 className="text-xl font-bold text-white">
                  {constituency.name_en}
                </h1>
                <p className="text-sm text-gray-400">{constituency.name_ne}</p>
              </div>
            </div>
            <span
              className={`${style.bg} ${style.color} ${style.border} border text-sm px-3 py-1 rounded-full`}
            >
              {style.label}
            </span>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-400">
            <span>
              Registered voters:{" "}
              {constituency.total_registered_voters?.toLocaleString() ?? "N/A"}
            </span>
            <span>
              Votes cast:{" "}
              {constituency.total_votes_cast?.toLocaleString() ?? "0"}
            </span>
            {constituency.total_registered_voters > 0 && (
              <span>
                Turnout:{" "}
                {(
                  (constituency.total_votes_cast /
                    constituency.total_registered_voters) *
                  100
                ).toFixed(1)}
                %
              </span>
            )}
          </div>
        </div>

        {/* Candidate results */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/50">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              Candidates
            </h2>
          </div>

          {candidates.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">
              No candidate data available yet
            </p>
          ) : (
            <div className="divide-y divide-gray-700/30">
              {candidates.map((cand, idx) => {
                const party = cand.party;
                const pctOfMax =
                  maxVotes > 0 ? (cand.votes / maxVotes) * 100 : 0;
                const pctOfTotal =
                  constituency.total_votes_cast > 0
                    ? (
                        (cand.votes / constituency.total_votes_cast) *
                        100
                      ).toFixed(1)
                    : "0";

                return (
                  <div key={cand.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 text-sm font-mono w-6">
                          #{idx + 1}
                        </span>
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{
                            backgroundColor: party?.color ?? "#6B7280",
                          }}
                        />
                        <div>
                          <p className="text-white font-medium">
                            {cand.name_en}
                            {cand.is_winner && (
                              <span className="ml-2 text-xs bg-green-600/80 text-white px-2 py-0.5 rounded-full">
                                Winner
                              </span>
                            )}
                            {cand.is_leading && !cand.is_winner && (
                              <span className="ml-2 text-xs bg-yellow-600/80 text-white px-2 py-0.5 rounded-full">
                                Leading
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {cand.name_ne} •{" "}
                            {party?.short_name ?? "Independent"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">
                          {cand.votes.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">{pctOfTotal}%</p>
                      </div>
                    </div>
                    <div className="ml-9 bg-gray-700/50 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${pctOfMax}%`,
                          backgroundColor: party?.color ?? "#6B7280",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <DisclaimerFooter />
    </div>
  );
}
