const HAMROPATRO_NEWS_URL =
  "https://news.hamropatro.com/news?nextPageToken=&q=Nepali%20Communist%20Party";

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl: string | null;
}

interface HamroPatroNewsItem {
  title?: string;
  description?: string;
  link?: string;
  url?: string;
  source?: string;
  sourceName?: string;
  publishedAt?: string;
  pubDate?: string;
  image?: string;
  imageUrl?: string;
  thumbnail?: string;
}

interface HamroPatroResponse {
  news?: HamroPatroNewsItem[];
  articles?: HamroPatroNewsItem[];
  data?: HamroPatroNewsItem[];
  nextPageToken?: string;
}

/**
 * Maps the raw Hamro Patro news API response to a normalized NewsArticle format.
 */
function mapNewsItem(item: HamroPatroNewsItem): NewsArticle {
  return {
    title: item.title ?? "",
    description: item.description ?? "",
    url: item.link ?? item.url ?? "#",
    source: item.source ?? item.sourceName ?? "Hamro Patro",
    publishedAt: item.publishedAt ?? item.pubDate ?? new Date().toISOString(),
    imageUrl: item.image ?? item.imageUrl ?? item.thumbnail ?? null,
  };
}

/**
 * Fetches election-related news from Hamro Patro API.
 * Used as a supplementary data source alongside the main election data.
 */
export async function fetchElectionNews(): Promise<NewsArticle[]> {
  try {
    const res = await fetch(HAMROPATRO_NEWS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: HamroPatroResponse = await res.json();

    const items = json.news ?? json.articles ?? json.data ?? [];
    return items.map(mapNewsItem);
  } catch (err) {
    console.warn("Failed to fetch election news:", err);
    return [];
  }
}
