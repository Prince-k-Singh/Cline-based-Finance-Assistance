/**
 * Market analytics engine (pure, deterministic, tested).
 * Turns raw price series + macro data into signals: returns, EWMA volatility,
 * drawdown, trend regression, z-score vs 200-day mean, and a regime label.
 * Then maps those signals onto a household's holdings to produce personalised,
 * number-backed impact insights. The AI layer only explains these.
 */
import { round } from "./math";

export interface PricePoint { t: number; close: number } // t = unix seconds
export interface Series { symbol: string; label: string; currency: string; points: PricePoint[] }

export interface MarketSnapshot {
  fetchedAt: string;
  source: "live" | "cache" | "fallback";
  nifty?: Series;
  gold?: Series; // USD/oz
  usdinr?: Series;
  cpi?: { year: string; valuePct: number }[]; // India CPI inflation, latest first
  notes: string[];
}

export interface SeriesSignals {
  symbol: string;
  label: string;
  last: number;
  ret1mPct: number | null;
  ret3mPct: number | null;
  ret1yPct: number | null;
  volAnnPct: number | null; // EWMA (lambda 0.94) annualised
  maxDrawdown1yPct: number | null;
  drawdownFromHighPct: number | null;
  trendSlopeAnnPct: number | null; // log-linear regression slope, annualised
  trendR2: number | null;
  zScore200: number | null; // (last - mean200) / sd200
  regime: "strong-uptrend" | "uptrend" | "sideways" | "downtrend" | "correction" | "unknown";
}

export const pct = (a: number, b: number) => (b > 0 ? (a / b - 1) * 100 : 0);
export const r1 = (n: number | null) => (n === null || !Number.isFinite(n) ? null : Math.round(n * 10) / 10);

export function closeAtDaysAgo(points: PricePoint[], days: number): number | null {
  if (points.length < 2) return null;
  const target = points[points.length - 1].t - days * 86400;
  for (let i = points.length - 1; i >= 0; i--) if (points[i].t <= target) return points[i].close;
  // A "1y" feed often starts a few days short of 365; accept the first point if within 7 days.
  return points[0].t - target <= 7 * 86400 ? points[0].close : null;
}

export function ewmaVolAnnual(closes: number[], lambda = 0.94): number | null {
  if (closes.length < 20) return null;
  let v = 0;
  for (let i = 1; i < closes.length; i++) {
    const r = Math.log(closes[i] / closes[i - 1]);
    v = i === 1 ? r * r : lambda * v + (1 - lambda) * r * r;
  }
  return Math.sqrt(v * 252) * 100;
}

export function maxDrawdown(closes: number[]): number | null {
  if (closes.length < 2) return null;
  let peak = closes[0], mdd = 0;
  for (const c of closes) { peak = Math.max(peak, c); mdd = Math.min(mdd, c / peak - 1); }
  return mdd * 100;
}

/** Ordinary least squares of ln(price) on time (years). Returns annualised slope % and R². */
export function logTrend(points: PricePoint[]): { slopePct: number; r2: number } | null {
  if (points.length < 30) return null;
  const t0 = points[0].t;
  const xs = points.map((p) => (p.t - t0) / (365 * 86400));
  const ys = points.map((p) => Math.log(p.close));
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  if (sxx === 0 || syy === 0) return null;
  const b = sxy / sxx;
  return { slopePct: (Math.exp(b) - 1) * 100, r2: (sxy * sxy) / (sxx * syy) };
}

export function zScore(closes: number[], window = 200): number | null {
  if (closes.length < Math.min(window, 60)) return null;
  const w = closes.slice(-window);
  const m = w.reduce((a, b) => a + b, 0) / w.length;
  const sd = Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / w.length);
  return sd > 0 ? (closes[closes.length - 1] - m) / sd : null;
}

export function analyseSeries(s: Series): SeriesSignals {
  const pts = s.points.filter((p) => Number.isFinite(p.close) && p.close > 0);
  const closes = pts.map((p) => p.close);
  const last = closes[closes.length - 1] ?? 0;
  const ago = (d: number) => { const c = closeAtDaysAgo(pts, d); return c ? pct(last, c) : null; };
  const trend = logTrend(pts);
  const z = zScore(closes);
  const high = closes.length ? Math.max(...closes) : 0;
  const ddHigh = high ? pct(last, high) : null;
  const ret3 = ago(91);
  let regime: SeriesSignals["regime"] = "unknown";
  if (ddHigh !== null && ddHigh <= -10) regime = "correction";
  else if (trend && z !== null) {
    if (trend.slopePct > 15 && trend.r2 > 0.6 && z > 0.5) regime = "strong-uptrend";
    else if (trend.slopePct > 3 && (ret3 ?? 0) > 0) regime = "uptrend";
    else if (trend.slopePct < -3 && (ret3 ?? 0) < 0) regime = "downtrend";
    else regime = "sideways";
  }
  return {
    symbol: s.symbol, label: s.label, last: round(last, 0.01),
    ret1mPct: r1(ago(30)), ret3mPct: r1(ret3), ret1yPct: r1(ago(365)),
    volAnnPct: r1(ewmaVolAnnual(closes)), maxDrawdown1yPct: r1(maxDrawdown(closes)),
    drawdownFromHighPct: r1(ddHigh), trendSlopeAnnPct: r1(trend?.slopePct ?? null),
    trendR2: trend ? Math.round(trend.r2 * 100) / 100 : null, zScore200: z === null ? null : Math.round(z * 100) / 100,
    regime,
  };
}
