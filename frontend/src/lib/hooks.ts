import useSWR from "swr";
import type {
  Party,
  ElectionSummary,
  Constituency,
  LegacyElectionData,
  PAPartyResult,
  PAElectionSummary,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// Polling interval: 30 seconds
const REFRESH_INTERVAL = 30_000;

/**
 * Hook to fetch election summary data with 30s auto-refresh.
 */
export function useElectionSummary() {
  const { data, error, isLoading } = useSWR<ElectionSummary>(
    `${API_BASE}/api/summary`,
    fetcher,
    { refreshInterval: REFRESH_INTERVAL, dedupingInterval: 10_000 }
  );
  return { summary: data, error, isLoading };
}

/**
 * Hook to fetch all parties with FPTP and PR data.
 */
export function useParties() {
  const { data, error, isLoading } = useSWR<Party[]>(
    `${API_BASE}/api/parties`,
    fetcher,
    { refreshInterval: REFRESH_INTERVAL, dedupingInterval: 10_000 }
  );
  return { parties: data ?? [], error, isLoading };
}

/**
 * Hook to fetch constituencies with optional filters.
 */
export function useConstituencies(filters?: {
  province_id?: number;
  district_id?: number;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.province_id)
    params.set("province_id", String(filters.province_id));
  if (filters?.district_id)
    params.set("district_id", String(filters.district_id));
  if (filters?.status) params.set("status", filters.status);

  const queryString = params.toString();
  const url = `${API_BASE}/api/constituencies${queryString ? `?${queryString}` : ""}`;

  const { data, error, isLoading } = useSWR<Constituency[]>(url, fetcher, {
    refreshInterval: REFRESH_INTERVAL,
    dedupingInterval: 10_000,
  });
  return { constituencies: data ?? [], error, isLoading };
}

/**
 * Hook to fetch PR results.
 */
export function usePRResults() {
  const { data, error, isLoading } = useSWR<{
    totalPRVotes: number;
    threshold: number;
    totalPRSeats: number;
    parties: Array<
      Party & {
        pr_vote_percent: number;
        meets_threshold: boolean;
      }
    >;
  }>(`${API_BASE}/api/pr-results`, fetcher, {
    refreshInterval: REFRESH_INTERVAL,
    dedupingInterval: 10_000,
  });
  return { prResults: data, error, isLoading };
}

// ─── Live EC Data (direct from Election Commission) ────────

interface ECPartyData {
  PoliticalPartyName: string;
  TotalVoteReceived?: number;
  TotWin?: number;
  TotLead?: number;
  TotWinLead?: number;
  SymbolID: number;
}

interface ECProxyResponse {
  type: string;
  file: string;
  data: ECPartyData[];
  lastFetched: string;
}

/**
 * Hook to fetch live PR (Samanupātik) vote data from EC via proxy.
 * Polls every 30 seconds.
 */
export function useLiveECData(type: "pr" | "fptp" = "pr") {
  const { data, error, isLoading } = useSWR<ECProxyResponse>(
    `${API_BASE}/api/ec-proxy?type=${type}`,
    fetcher,
    { refreshInterval: REFRESH_INTERVAL, dedupingInterval: 10_000 }
  );
  return { ecData: data, error, isLoading };
}

// ─── Provincial Assembly (PA) Data ──────────────────────────

/**
 * Hook to fetch PA results for a specific province.
 */
export function usePAResults(provinceId: number | undefined) {
  const { data, error, isLoading } = useSWR<{
    province_id: number;
    summary: {
      totalConstituencies: number;
      declared: number;
      counting: number;
      pending: number;
      totalVotesCast: number;
    };
    parties: Array<PAPartyResult & { party: { id: number; name_en: string; name_ne: string; short_name: string; color: string } }>;
  }>(
    provinceId ? `${API_BASE}/api/pa-results?province_id=${provinceId}` : null,
    fetcher,
    { refreshInterval: REFRESH_INTERVAL, dedupingInterval: 10_000 }
  );
  return { paResults: data, error, isLoading };
}

/**
 * Hook to fetch live PA data from EC proxy for a province.
 * Uses the FPTP PA data from the Election Commission.
 */
export function useLivePAData(provinceId: number | undefined) {
  const { data, error, isLoading } = useSWR<{
    type: string;
    file: string;
    data: Array<{
      PoliticalPartyName: string;
      TotalVoteReceived?: number;
      TotWin?: number;
      TotLead?: number;
      TotWinLead?: number;
      SymbolID: number;
    }>;
    lastFetched: string;
  }>(
    provinceId ? `${API_BASE}/api/ec-proxy?type=pa-s${provinceId}` : null,
    fetcher,
    { refreshInterval: REFRESH_INTERVAL, dedupingInterval: 10_000 }
  );
  return { paData: data, error, isLoading };
}

/**
 * Hook to fetch live FPTP candidate data for a specific constituency from EC.
 * @param districtCd - EC district code
 * @param constNo - Constituency number within the district
 */
export function useLiveConstituencyCandidates(districtCd: number | undefined, constNo: number | undefined) {
  const { data, error, isLoading } = useSWR<{
    type: string;
    file: string;
    data: Array<{
      CandidateID: number;
      CandidateName: string;
      Age: number;
      Gender: string;
      PoliticalPartyName: string;
      SymbolID: number;
      TotalVoteReceived: number;
      Remarks: string | null;
    }>;
    lastFetched: string;
  }>(
    districtCd && constNo
      ? `${API_BASE}/api/ec-proxy?type=hor-fptp-cand&dist=${districtCd}&const=${constNo}`
      : null,
    fetcher,
    { refreshInterval: REFRESH_INTERVAL, dedupingInterval: 10_000 }
  );
  return { candidateData: data, error, isLoading };
}

/**
 * Hook to fetch live PR vote data for a specific constituency from EC.
 */
export function useLiveConstituencyPR(districtCd: number | undefined, constNo: number | undefined) {
  const { data, error, isLoading } = useSWR<{
    type: string;
    file: string;
    data: Array<{
      PoliticalPartyName: string;
      TotalVoteReceived: number;
      SymbolID: number;
    }>;
    lastFetched: string;
  }>(
    districtCd && constNo
      ? `${API_BASE}/api/ec-proxy?type=hor-pr-cand&dist=${districtCd}&const=${constNo}`
      : null,
    fetcher,
    { refreshInterval: REFRESH_INTERVAL, dedupingInterval: 10_000 }
  );
  return { prData: data, error, isLoading };
}

// ─── Legacy fallback: fetch from static data.json ─────────────

const LEGACY_CACHE_KEY = "nepal-election-data";
const LEGACY_CACHE_MAX_AGE = 5 * 60 * 1000;

export function readLegacyCache(): LegacyElectionData | null {
  try {
    const raw = localStorage.getItem(LEGACY_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > LEGACY_CACHE_MAX_AGE) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeLegacyCache(data: LegacyElectionData) {
  try {
    localStorage.setItem(
      LEGACY_CACHE_KEY,
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch {
    // ignore storage errors
  }
}

/**
 * Fetch election news from Hamro Patro API.
 */
export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string | null;
  imageUrl: string | null;
}

const HAMROPATRO_NEWS_BASE = "https://news.hamropatro.com/news";

export async function fetchElectionNews(
  query = "Nepali%20Communist%20Party"
): Promise<NewsArticle[]> {
  try {
    const url = `${HAMROPATRO_NEWS_BASE}?nextPageToken=&q=${query}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const items = json.news ?? json.articles ?? json.data ?? [];
    return items.map(
      (item: Record<string, string | undefined>): NewsArticle => ({
        title: item.title ?? "",
        description: item.description ?? "",
        url: item.link ?? item.url ?? "#",
        source: item.source ?? item.sourceName ?? "Hamro Patro",
        publishedAt: item.publishedAt ?? item.pubDate ?? null,
        imageUrl: item.image ?? item.imageUrl ?? item.thumbnail ?? null,
      })
    );
  } catch (err) {
    console.warn("Failed to fetch election news:", err);
    return [];
  }
}
