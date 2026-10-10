import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { MarketSnapshot, PricePoint, Series } from "../src/engine";

/**
 * Live real-world data for India, from free public endpoints (no key needed):
 *  - Yahoo Finance chart API: Nifty 50 (^NSEI), Gold futures (GC=F, USD/oz), USD/INR (INR=X)
 *  - World Bank API: India CPI inflation, annual % (FP.CPI.TOTL.ZG)
 * Cached on disk for 6 hours; if the network fails we serve the last cache.
 */
const CACHE = join(process.cwd(), "data", "market-cache.json");
const TTL_MS = 6 * 60 * 60 * 1000;
const UA = { "User-Agent": "Mozilla/5.0 (ParivarPlan; educational)" };

async function getJson(url: string, timeoutMs = 15000): Promise<unknown> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: UA, signal: ctl.signal });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function yahoo(symbol: string, label: string): Promise<Series> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
  const j = (await getJson(url)) as { chart: { result: { meta: { currency: string }; timestamp: number[]; indicators: { quote: { close: (number | null)[] }[] } }[] } };
  const r = j.chart.result[0];
  const closes = r.indicators.quote[0].close;
  const points: PricePoint[] = r.timestamp.map((t, i) => ({ t, close: closes[i] ?? NaN })).filter((p) => Number.isFinite(p.close));
  if (points.length < 20) throw new Error(`too few points for ${symbol}`);
  return { symbol, label, currency: r.meta.currency, points };
}

async function worldBankCpi(): Promise<{ year: string; valuePct: number }[]> {
  const j = (await getJson("https://api.worldbank.org/v2/country/IND/indicator/FP.CPI.TOTL.ZG?format=json&per_page=10")) as [unknown, { date: string; value: number | null }[]];
  return (j[1] ?? []).filter((d) => d.value !== null).map((d) => ({ year: d.date, valuePct: Math.round((d.value as number) * 100) / 100 }));
}

async function readCache(): Promise<MarketSnapshot | null> {
  try {
    return JSON.parse(await readFile(CACHE, "utf8")) as MarketSnapshot;
  } catch {
    return null;
  }
}

export async function getMarketSnapshot(force = false): Promise<MarketSnapshot> {
  const cached = await readCache();
  if (!force && cached && Date.now() - Date.parse(cached.fetchedAt) < TTL_MS) return { ...cached, source: "cache" };

  const notes: string[] = [];
  const settle = async <T,>(label: string, p: Promise<T>): Promise<T | undefined> => {
    try { return await p; } catch (e) { notes.push(`${label} unavailable: ${(e as Error).message}`); return undefined; }
  };
  const [nifty, gold, usdinr, cpi] = await Promise.all([
    settle("Nifty 50", yahoo("^NSEI", "Nifty 50")),
    settle("Gold", yahoo("GC=F", "Gold (USD/oz)")),
    settle("USD/INR", yahoo("INR=X", "USD/INR")),
    settle("CPI", worldBankCpi()),
  ]);
  if (!nifty && !gold && !cpi) {
    if (cached) return { ...cached, source: "cache", notes: [...notes, "Live fetch failed; showing last saved data."] };
    return { fetchedAt: new Date().toISOString(), source: "fallback", notes: [...notes, "No market data available; using plan assumptions."] };
  }
  const snap: MarketSnapshot = {
    fetchedAt: new Date().toISOString(), source: "live",
    nifty: nifty ?? cached?.nifty, gold: gold ?? cached?.gold, usdinr: usdinr ?? cached?.usdinr, cpi: cpi ?? cached?.cpi,
    notes: [...notes, "Sources: Yahoo Finance (Nifty 50, gold, USD/INR), World Bank (India CPI)."],
  };
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(CACHE, JSON.stringify(snap));
  return snap;
}
