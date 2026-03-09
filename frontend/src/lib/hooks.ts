import useSWR from "swr";
import type {
  Party,
  ElectionSummary,
  Constituency,
  LegacyElectionData,
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
