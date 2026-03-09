"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SummaryCards from "@/components/SummaryCards";
import PartyResults from "@/components/PartyResults";
import ConstituencyResults from "@/components/ConstituencyResults";
import SeatBar from "@/components/SeatBar";
import DataSourceBanner from "@/components/DataSourceBanner";
import type {
  Party,
  Constituency,
  ElectionSummary,
} from "@/data/electionData";

const CACHE_KEY = "nepal-election-data";
const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

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

interface ElectionData {
  lastUpdated: string | null;
  totalSeats: number;
  parties: Party[];
  constituencies: Constituency[];
  summary: {
    totalSeats: number;
    declared: number;
    counting: number;
    pending: number;
    totalVotesCast: number;
  };
}

function buildSummary(data: ElectionData): ElectionSummary {
  return {
    ...data.summary,
    lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : null,
  };
}

function readCache(): ElectionData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as {
      data: ElectionData;
      ts: number;
    };
    if (Date.now() - ts > CACHE_MAX_AGE_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data: ElectionData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // storage might be full or unavailable — ignore
  }
}

export const EMPTY_DATA: ElectionData = {
  lastUpdated: null,
  totalSeats: 165,
  parties: [],
  constituencies: [],
  summary: {
    totalSeats: 165,
    declared: 0,
    counting: 0,
    pending: 165,
    totalVotesCast: 0,
  },
};

export default function Home() {
  const [data, setData] = useState<ElectionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show cached data immediately for instant perceived load
    const cached = readCache();
    if (cached) {
      setData(cached);
      setLoading(false);
    }

    // Always fetch fresh data in the background
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${basePath}/data.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ElectionData>;
      })
      .then((fresh) => {
        writeCache(fresh);
        setData(fresh);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to fetch data.json:", err);
        // If no cached data either, fall back to an empty state so the page renders
        if (!cached) {
          setData(EMPTY_DATA);
          setLoading(false);
        }
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Header lastUpdated={null} totalSeats={165} />
        <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-800 border border-gray-700 rounded-xl p-4 animate-pulse h-24"
              />
            ))}
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 animate-pulse h-16" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 bg-gray-800 border border-gray-700 rounded-xl p-4 animate-pulse h-64" />
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-4 animate-pulse h-64" />
          </div>
        </main>
      </div>
    );
  }

  const summary = buildSummary(data);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header lastUpdated={summary.lastUpdated} totalSeats={summary.totalSeats} />

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Summary Statistics */}
        <SummaryCards summary={summary} />

        {/* Seat Distribution Bar */}
        <SeatBar parties={data.parties} totalSeats={summary.totalSeats} />

        {/* Two-column layout on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <PartyResults parties={data.parties} totalSeats={summary.totalSeats} />
          </div>
          <div className="lg:col-span-2">
            <ConstituencyResults constituencies={data.constituencies} />
          </div>
        </div>

        {/* Data Sources */}
        <DataSourceBanner sources={DATA_SOURCES} />
      </main>
    </div>
  );
}
