import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { goldInrPer10g, mergeArticles, parseRss, toQuote, type NewsFeed, type NewsTopic, type Quote } from "./news-parse";

/**
 * Live money news + a market ticker for the Live insights page.
 * Free public sources, no key needed:
 *  - RSS: Mint, Economic Times, Business Standard (markets, personal finance, economy)
 *  - Yahoo Finance chart API for the ticker strip
 * Cached on disk for 15 minutes; if every source fails we serve the last cache.
 */
const FEEDS: { url: string; source: string; topic: NewsTopic }[] = [
  { url: "https://www.livemint.com/rss/markets", source: "Mint", topic: "markets" },
  { url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", source: "Economic Times", topic: "markets" },
  { url: "https://www.business-standard.com/rss/markets-106.rss", source: "Business Standard", topic: "markets" },
  { url: "https://www.livemint.com/rss/money", source: "Mint", topic: "money" },
  { url: "https://economictimes.indiatimes.com/wealth/personal-finance-news/rssfeeds/49674901.cms", source: "Economic Times", topic: "money" },
  { url: "https://www.livemint.com/rss/economy", source: "Mint", topic: "economy" },
  { url: "https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms", source: "Economic Times", topic: "economy" },
  { url: "https://www.business-standard.com/rss/economy-102.rss", source: "Business Standard", topic: "economy" },
];

const TICKER: { symbol: string; label: string; short: string; unit?: string }[] = [
  { symbol: "^NSEI", label: "Nifty 50", short: "N50" },
  { symbol: "^BSESN", label: "Sensex", short: "SX" },
  { symbol: "^NSEBANK", label: "Bank Nifty", short: "BN" },
  { symbol: "INR=X", label: "USD/INR", short: "$₹" },
  { symbol: "GC=F", label: "Gold", short: "Au", unit: "$/oz" },
  { symbol: "SI=F", label: "Silver", short: "Ag", unit: "$/oz" },
  { symbol: "BZ=F", label: "Brent crude", short: "Oil", unit: "$/bbl" },
];

const CACHE = join(process.cwd(), "data", "news-cache.json");
const TTL_MS = 15 * 60 * 1000;
const UA = { "User-Agent": "Mozilla/5.0 (Prospera; educational)" };

async function get(url: string, timeoutMs = 12000): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: UA, signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } finally {
    clearTimeout(t);
  }
}

async function yahooQuote(m: (typeof TICKER)[number]): Promise<Quote> {
  const r = await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(m.symbol)}?range=1mo&interval=1d`);
  const j = (await r.json()) as { chart: { result: { meta: { currency: string; regularMarketPrice?: number }; indicators: { quote: { close: (number | null)[] }[] } }[] } };
  const res = j.chart.result[0];
  const q = toQuote(m, res.meta.currency, res.indicators.quote[0].close.map((x) => x ?? NaN), res.meta.regularMarketPrice);
  if (!q) throw new Error("too few points");
  return q;
}

async function readCache(): Promise<NewsFeed | null> {
  try { return JSON.parse(await readFile(CACHE, "utf8")) as NewsFeed; } catch { return null; }
}

let inflight: Promise<NewsFeed> | null = null;

export async function getNewsFeed(force = false): Promise<NewsFeed> {
  const cached = await readCache();
  if (!force && cached && Date.now() - Date.parse(cached.fetchedAt) < TTL_MS) return { ...cached, source: "cache" };
  // Collapse concurrent refreshes (e.g. two open tabs) into one network round.
  inflight ??= fetchFresh(cached).finally(() => { inflight = null; });
  return inflight;
}

async function fetchFresh(cached: NewsFeed | null): Promise<NewsFeed> {
  const notes: string[] = [];
  const [feeds, quotes] = await Promise.all([
    Promise.all(FEEDS.map(async (f) => {
      try { return parseRss(await (await get(f.url)).text(), f.source, f.topic); }
      catch (e) { notes.push(`${f.source} ${f.topic} feed unavailable (${(e as Error).message}).`); return []; }
    })),
    Promise.all(TICKER.map(async (m) => {
      try { return await yahooQuote(m); } catch { notes.push(`${m.label} price unavailable.`); return null; }
    })),
  ]);
  const articles = mergeArticles(feeds);
  const got = quotes.filter((q): q is Quote => !!q);
  const goldInr = goldInrPer10g(got.find((q) => q.symbol === "GC=F"), got.find((q) => q.symbol === "INR=X"));
  // Show ₹ gold right after USD/INR; it's the number Indian families actually track.
  const fxAt = got.findIndex((q) => q.symbol === "INR=X");
  const ticker = goldInr ? [...got.slice(0, fxAt + 1), goldInr, ...got.slice(fxAt + 1)] : got;

  if (!articles.length && !ticker.length) {
    if (cached) return { ...cached, source: "cache", notes: [...notes, "Live fetch failed; showing the last saved news."] };
    return { fetchedAt: new Date().toISOString(), source: "fallback", articles: [], quotes: [], notes: [...notes, "News is unavailable right now. Check your internet connection."] };
  }
  const feed: NewsFeed = {
    fetchedAt: new Date().toISOString(), source: "live",
    articles: articles.length ? articles : cached?.articles ?? [],
    quotes: ticker.length ? ticker : cached?.quotes ?? [],
    notes,
  };
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(CACHE, JSON.stringify(feed));
  return feed;
}
