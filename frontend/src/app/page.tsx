"use client";

import { useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import Header from "@/components/Header";
import SummaryCards from "@/components/SummaryCards";
import PartyResults from "@/components/PartyResults";
import ConstituencyResults from "@/components/ConstituencyResults";
import SeatBar from "@/components/SeatBar";
import PRResults from "@/components/PRResults";
import DataSourceBanner from "@/components/DataSourceBanner";
import DisclaimerFooter from "@/components/DisclaimerFooter";
import {
  useElectionSummary,
  useParties,
  useConstituencies,
  usePRResults,
  readLegacyCache,
  writeLegacyCache,
  fetchElectionNews,
  type NewsArticle,
} from "@/lib/hooks";
import type { LegacyElectionData } from "@/lib/types";
import type {
  Party as LegacyParty,
  Constituency as LegacyConstituency,
  ElectionSummary as LegacyElectionSummary,
} from "@/data/electionData";

const DATA_SOURCES = [
  {
    name: "Election Commission Nepal",
    url: "https://result.election.gov.np/PRVoteChartResult2082.aspx",
  },
  {
    name: "eKantipur Election",
    url: "https://election.ekantipur.com/?lng=eng",
  },
  {
    name: "Hamro Patro Election",
    url: "https://app.hamropatro.com/election",
  },
];

/**
 * Converts new Supabase Party type to legacy Party shape for existing components.
 */
function toLegacyParties(
  parties: Array<{
    name_en: string;
    name_ne: string;
    short_name: string;
    color: string;
    fptp_won: number;
    fptp_leading: number;
    pr_votes: number;
    total_seats: number;
  }>
): LegacyParty[] {
  return parties.map((p) => ({
    name: p.name_en,
    nameNp: p.name_ne,
    shortName: p.short_name,
    color: p.color,
    won: p.fptp_won,
    leading: p.fptp_leading,
    totalVotes: p.pr_votes, // approximate: using PR votes as proxy
  }));
}

/**
 * Converts new summary to legacy ElectionSummary shape.
 */
function toLegacySummary(summary: {
  totalSeats: number;
  declared: number;
  counting: number;
  pending: number;
  totalVotesCast: number;
  lastUpdated?: string | null;
}): LegacyElectionSummary {
  return {
    totalSeats: summary.totalSeats,
    declared: summary.declared,
    counting: summary.counting,
    pending: summary.pending,
    totalVotesCast: summary.totalVotesCast,
    lastUpdated: summary.lastUpdated ? new Date(summary.lastUpdated) : null,
  };
}

export default function Home() {
  const { summary, isLoading: summaryLoading } = useElectionSummary();
  const { parties, isLoading: partiesLoading } = useParties();
  const { constituencies } = useConstituencies();
  const { prResults } = usePRResults();
  const [news, setNews] = useState<NewsArticle[]>([]);

  // Fallback: try static data.json if Supabase APIs fail
  const [fallbackData, setFallbackData] = useState<LegacyElectionData | null>(
    null
  );

  useEffect(() => {
    // If Supabase data isn't loading, no need for fallback
    if (!summaryLoading && summary) return;

    let cancelled = false;

    async function loadFallback() {
      const cached = readLegacyCache();
      if (cached) {
        if (!cancelled) setFallbackData(cached);
        return;
      }

      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
        const res = await fetch(`${basePath}/data.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as LegacyElectionData;
        writeLegacyCache(data);
        if (!cancelled) setFallbackData(data);
      } catch {
        // No fallback available — will show loading/empty state
      }
    }

    loadFallback();
    return () => { cancelled = true; };
  }, [summaryLoading, summary]);

  useEffect(() => {
    fetchElectionNews()
      .then(setNews)
      .catch((err) => {
        console.warn("Unexpected error fetching news:", err);
      });
  }, []);

  // Determine data source: prefer Supabase, fall back to static
  const useSupabase = !!summary && parties.length > 0;

  const displaySummary: LegacyElectionSummary = useSupabase
    ? toLegacySummary(summary!)
    : fallbackData
      ? {
          ...fallbackData.summary,
          lastUpdated: fallbackData.lastUpdated
            ? new Date(fallbackData.lastUpdated)
            : null,
        }
      : {
          totalSeats: 275,
          declared: 0,
          counting: 0,
          pending: 165,
          totalVotesCast: 0,
          lastUpdated: null,
        };

  const displayParties: LegacyParty[] = useSupabase
    ? toLegacyParties(parties)
    : fallbackData?.parties ?? [];

  const displayConstituencies: LegacyConstituency[] = useSupabase
    ? constituencies.map((c) => ({
        id: c.id,
        name: c.name_en,
        province: c.district?.province?.name_en ?? "",
        status: c.status,
        totalVotes: c.total_votes_cast,
        candidates: (c.candidates ?? []).map((cand) => ({
          name: cand.name_en,
          party: cand.party?.name_en ?? "Independent",
          partyShort: cand.party?.short_name ?? "Ind",
          votes: cand.votes,
          color: cand.party?.color ?? "#6B7280",
        })),
      }))
    : fallbackData?.constituencies ?? [];

  const loading =
    (summaryLoading || partiesLoading) && !fallbackData;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Header lastUpdated={null} totalSeats={275} />
        <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="glass-card rounded-2xl p-4 animate-pulse h-24"
              />
            ))}
          </div>
          <div className="glass-card rounded-2xl p-4 animate-pulse h-16" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 glass-card rounded-2xl p-4 animate-pulse h-64" />
            <div className="lg:col-span-2 glass-card rounded-2xl p-4 animate-pulse h-64" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header
        lastUpdated={displaySummary.lastUpdated}
        totalSeats={displaySummary.totalSeats}
      />

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Summary Statistics */}
        <SummaryCards summary={displaySummary} />

        {/* Seat Distribution Bar + Majority Progress */}
        <SeatBar parties={displayParties} totalSeats={displaySummary.totalSeats} />

        {/* Three-column layout: Party Results | PR Results | Constituencies */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <PartyResults
              parties={displayParties}
              totalSeats={displaySummary.totalSeats}
            />
          </div>
          <div>
            <PRResults prData={prResults ?? null} />
          </div>
          <div>
            <ConstituencyResults constituencies={displayConstituencies} />
          </div>
        </div>

        {/* Election News from Hamro Patro API */}
        {news.length > 0 && (
          <div className="glass-card rounded-2xl p-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Newspaper className="w-4 h-4 text-purple-400" />
              Election News
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {news.slice(0, 6).map((article, idx) => (
                <a
                  key={idx}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass rounded-xl p-3 hover:bg-white/5 transition-colors block"
                >
                  <p className="text-sm text-white font-medium line-clamp-2">
                    {article.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {article.source}
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Data Sources */}
        <DataSourceBanner sources={DATA_SOURCES} />
      </main>

      {/* Unofficial Results Disclaimer Footer */}
      <DisclaimerFooter />
    </div>
  );
}
