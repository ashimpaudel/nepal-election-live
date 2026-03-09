"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MapPin, Trophy } from "lucide-react";
import Header from "@/components/Header";
import DrillDown from "@/components/DrillDown";
import DisclaimerFooter from "@/components/DisclaimerFooter";
import { getSupabase } from "@/lib/supabase";
import { useLiveConstituencyCandidates } from "@/lib/hooks";
import type { Constituency, Candidate, District, Province } from "@/lib/types";

const PARTY_MAP: Record<string, { en: string; short: string; color: string }> = {
  "राष्ट्रिय स्वतन्त्र पार्टी": { en: "RSP", short: "RSP", color: "#F59E0B" },
  "नेपाली काँग्रेस": { en: "Nepali Congress", short: "NC", color: "#E11D48" },
  "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)": { en: "CPN-UML", short: "UML", color: "#2563EB" },
  "नेपाली कम्युनिष्ट पार्टी": { en: "CPN-Maoist", short: "MC", color: "#DC2626" },
  "राष्ट्रिय प्रजातन्त्र पार्टी": { en: "RPP", short: "RPP", color: "#8B5CF6" },
  "जनता समाजवादी पार्टी, नेपाल": { en: "Janata Samajbadi", short: "JSP", color: "#10B981" },
  "जनमत पार्टी": { en: "Janamat", short: "JP", color: "#F97316" },
  "श्रम संस्कृति पार्टी": { en: "Shram Sanskriti", short: "SSP", color: "#059669" },
  "नागरिक उन्मुक्ति पार्टी, नेपाल(एकल चुनाव चिन्ह)": { en: "Nagarik Unmukti", short: "NUP", color: "#14B8A6" },
  "स्वतन्त्र": { en: "Independent", short: "Ind", color: "#6B7280" },
};

function getPartyInfo(name: string) {
  for (const [np, info] of Object.entries(PARTY_MAP)) {
    if (name.includes(np) || np.includes(name)) return info;
  }
  return { en: name, short: name.substring(0, 4), color: "#6B7280" };
}

export default function ConstituencyPage() {
  const params = useParams();
  const constId = Number(params.id);

  const [constituency, setConstituency] = useState<Constituency | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [district, setDistrict] = useState<District | null>(null);
  const [province, setProvince] = useState<Province | null>(null);
  const [loading, setLoading] = useState(true);

  const ecDistrictCd = district?.id;
  const ecConstNo = constituency?.number;
  const { candidateData } = useLiveConstituencyCandidates(
    candidates.length === 0 ? ecDistrictCd : undefined,
    candidates.length === 0 ? ecConstNo : undefined
  );

  const liveCandidates: Candidate[] = candidateData?.data?.map((c, idx) => ({
    id: idx,
    constituency_id: constId,
    party_id: null as unknown as number,
    name_en: c.CandidateName,
    name_ne: c.CandidateName,
    votes: c.TotalVoteReceived || 0,
    is_winner: c.Remarks === "Elected",
    is_leading: idx === 0 && c.Remarks !== "Elected",
    updated_at: candidateData.lastFetched,
    party: {
      id: 0,
      name_en: getPartyInfo(c.PoliticalPartyName).en,
      name_ne: c.PoliticalPartyName,
      short_name: getPartyInfo(c.PoliticalPartyName).short,
      color: getPartyInfo(c.PoliticalPartyName).color,
    } as Candidate["party"],
  })) ?? [];

  const displayCandidates = candidates.length > 0 ? candidates : liveCandidates;
  const totalVotes = candidates.length > 0
    ? constituency?.total_votes_cast ?? 0
    : displayCandidates.reduce((s, c) => s + c.votes, 0);

  useEffect(() => {
    async function load() {
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setLoading(false);
          return;
        }

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
      } catch (err) {
        console.warn("Failed to load constituency data:", err);
      } finally {
        setLoading(false);
      }
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
  const maxVotes = displayCandidates[0]?.votes || 1;

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
              {totalVotes?.toLocaleString() ?? "0"}
            </span>
            {constituency.total_registered_voters > 0 && totalVotes > 0 && (
              <span>
                Turnout:{" "}
                {(
                  (totalVotes /
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

          {candidates.length === 0 && displayCandidates.length > 0 && (
            <div className="px-4 py-2 bg-green-900/20 border-b border-green-700/20 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-xs text-green-400/80">Live data from Election Commission • Auto-refreshes every 30s</p>
            </div>
          )}

          {displayCandidates.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">
              No candidate data available yet
            </p>
          ) : (
            <div className="divide-y divide-gray-700/30">
              {displayCandidates.map((cand, idx) => {
                const party = cand.party;
                const pctOfMax =
                  maxVotes > 0 ? (cand.votes / maxVotes) * 100 : 0;
                const pctOfTotal =
                  totalVotes > 0
                    ? (
                        (cand.votes / totalVotes) *
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
