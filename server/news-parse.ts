/**
 * Pure helpers for the news feed (no network; unit-tested in tests/news.test.ts).
 * Shapes are mirrored for the browser in src/ui/types.ts.
 */
export type NewsTopic = "markets" | "money" | "economy";

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  summary: string;
  image: string | null;
  source: string;
  topic: NewsTopic;
  publishedAt: string | null; // ISO
}

export interface Quote {
  symbol: string;
  label: string;
  short: string; // 2-3 character badge
  price: number;
  change: number;
  changePct: number;
  currency: string;
  unit?: string;
  spark: number[]; // last ~month of daily closes
}

export interface NewsFeed {
  fetchedAt: string;
  source: "live" | "cache" | "fallback";
  articles: NewsArticle[];
  quotes: Quote[];
  notes: string[];
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** CDATA unwrapped, tags stripped, entities decoded, whitespace collapsed. */
export function cleanText(raw: string): string {
  const unwrapped = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return decodeEntities(unwrapped.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function tag(item: string, name: string): string {
  const m = item.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
}

function attrUrl(item: string, el: string): string | null {
  const m = item.match(new RegExp(`<${el}\\b[^>]*\\burl=["']([^"']+)["']`, "i"));
  return m ? decodeEntities(m[1]) : null;
}

/** ET's enclosure is the full-size original (often ~2 MB); its thumb service returns a 640px version. */
export function optimiseImage(url: string): string {
  const et = url.match(/^https:\/\/img\.etimg\.com\/photo\/msid-(\d+)/);
  return et ? `https://img.etimg.com/thumb/msid-${et[1]},width-640,height-360,resizemode-4/photo.jpg` : url;
}

export function hashId(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Trim to a word boundary with an ellipsis. */
export function summarise(text: string, max = 220): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30)).replace(/[\s,;:.–-]+$/, "")}…`;
}

export function parseRss(xml: string, source: string, topic: NewsTopic): NewsArticle[] {
  const out: NewsArticle[] = [];
  for (const [item] of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const title = cleanText(tag(item, "title"));
    const link = cleanText(tag(item, "link")) || cleanText(tag(item, "guid"));
    if (!title || !/^https?:\/\//.test(link)) continue;
    const rawDesc = tag(item, "description");
    const imgInDesc = rawDesc.replace(/<!\[CDATA\[|\]\]>/g, "").match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1];
    const image = attrUrl(item, "media:content") ?? attrUrl(item, "media:thumbnail") ?? attrUrl(item, "enclosure") ?? (imgInDesc ? decodeEntities(imgInDesc) : null);
    const date = Date.parse(cleanText(tag(item, "pubDate")));
    out.push({
      id: hashId(link), title, link, source, topic,
      summary: summarise(cleanText(rawDesc)),
      image: image && /^https:\/\//.test(image) ? optimiseImage(image) : null,
      publishedAt: Number.isFinite(date) ? new Date(date).toISOString() : null,
    });
  }
  return out;
}

/** Drop duplicate links/headlines (outlets syndicate the same story), newest first. */
export function mergeArticles(lists: NewsArticle[][], max = 60): NewsArticle[] {
  const time = (a: NewsArticle) => (a.publishedAt ? Date.parse(a.publishedAt) : 0);
  const all = lists.flat().sort((a, b) => time(b) - time(a));
  const seen = new Set<string>();
  const out: NewsArticle[] = [];
  for (const a of all) {
    const key = a.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(a.link) || seen.has(key)) continue;
    seen.add(a.link); seen.add(key);
    out.push(a);
    if (out.length >= max) break;
  }
  return out;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Price + change on the day from a daily close series.
 * The last daily bar is the current (or most recent) session, so the day's change is
 * measured against the bar before it. A live price, if given, replaces the last bar's close.
 */
export function toQuote(meta: { symbol: string; label: string; short: string; unit?: string }, currency: string, closes: number[], live?: number): Quote | null {
  const c = closes.filter((x) => Number.isFinite(x) && x > 0);
  if (c.length < 2) return null;
  const price = live && live > 0 ? live : c[c.length - 1];
  const prev = c[c.length - 2];
  const spark = [...c.slice(0, -1), price].map(r2);
  return { ...meta, currency, price: r2(price), change: r2(price - prev), changePct: r2((price / prev - 1) * 100), spark };
}

const TROY_OZ_G = 31.1035;

/** International gold in ₹ per 10 g (before import duty and GST): gold $/oz × USD/INR. */
export function goldInrPer10g(gold?: Quote, fx?: Quote): Quote | null {
  if (!gold || !fx) return null;
  const k = 10 / TROY_OZ_G;
  const n = Math.min(gold.spark.length, fx.spark.length);
  const spark = Array.from({ length: n }, (_, i) => Math.round(gold.spark[gold.spark.length - n + i] * fx.spark[fx.spark.length - n + i] * k));
  const price = gold.price * fx.price * k;
  const prev = (gold.price - gold.change) * (fx.price - fx.change) * k;
  return {
    symbol: "GOLD-INR", label: "Gold ₹/10g", short: "Au", unit: "intl, pre-duty", currency: "INR",
    price: Math.round(price), change: Math.round(price - prev), changePct: r2((price / prev - 1) * 100), spark,
  };
}
