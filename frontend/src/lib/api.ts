const HAMROPATRO_NEWS_BASE = "https://news.hamropatro.com/news";
const DEFAULT_QUERY = "Nepali%20Communist%20Party";

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string | null;
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
    publishedAt: item.publishedAt ?? item.pubDate ?? null,
    imageUrl: item.image ?? item.imageUrl ?? item.thumbnail ?? null,
  };
}

/**
 * Fetches election-related news from Hamro Patro API.
 * Used as a supplementary data source alongside the main election data.
 */
export async function fetchElectionNews(
  query: string = DEFAULT_QUERY
): Promise<NewsArticle[]> {
  try {
    const url = `${HAMROPATRO_NEWS_BASE}?nextPageToken=&q=${query}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: HamroPatroResponse = await res.json();

    const items = json.news ?? json.articles ?? json.data ?? [];
    return items.map(mapNewsItem);
  } catch (err) {
    console.warn("Failed to fetch election news:", err);
    return [];
  }
}
