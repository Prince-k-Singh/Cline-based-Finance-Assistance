import { ASSETS, INFLATION_PCT } from "./assumptions";
import { cashInsights, type InsightCtx, type MarketInsight } from "./insights-cash";
import { analyseSeries, closeAtDaysAgo, pct, r1, type MarketSnapshot, type Series, type SeriesSignals } from "./market";
import { lakh, round, safe } from "./math";
import type { Household } from "./types";

export type { MarketInsight } from "./insights-cash";

export interface MarketAnalysis {
  asOf: string;
  source: MarketSnapshot["source"];
  latestCpiPct: number | null;
  cpiYear: string | null;
  assumedInflationPct: number;
  realCashReturnPct: number;
  realFdReturnPct: number;
  goldInrRet1yPct: number | null;
  signals: SeriesSignals[];
  insights: MarketInsight[];
  notes: string[];
}

/** Gold (USD/oz) × USD/INR → INR gold 1-year return. */
export function goldInr1y(gold?: Series, fx?: Series): number | null {
  if (!gold || !fx || gold.points.length < 2 || fx.points.length < 2) return null;
  const g0 = closeAtDaysAgo(gold.points, 365), f0 = closeAtDaysAgo(fx.points, 365);
  if (!g0 || !f0) return null;
  return pct(gold.points[gold.points.length - 1].close * fx.points[fx.points.length - 1].close, g0 * f0);
}

const realAfterTax = (preTax: number, slab: number, infl: number) => r1(((1 + (preTax * (1 - slab)) / 100) / (1 + infl / 100) - 1) * 100)!;

function regimeInsights(c: InsightCtx): MarketInsight[] {
  const out: MarketInsight[] = [];
  const { h, total, nifty, goldRet } = c;
  if (nifty) {
    const eq = safe(h.holdings.equityFunds) + safe(h.holdings.stocks);
    const eqPct = total ? (eq / total) * 100 : 0;
    const desc = `Nifty 50: ${nifty.ret1yPct ?? "–"}% over 1 year, ${nifty.drawdownFromHighPct ?? "–"}% from its 1-year high, volatility ${nifty.volAnnPct ?? "–"}%, trend "${nifty.regime}".`;
    if (nifty.regime === "correction") {
      out.push({ id: "eq-correction", severity: "opportunity", title: "Markets are in a correction: SIPs buy more units now",
        detail: `${desc} Continuing SIPs through corrections has historically improved long-run returns. Don't stop SIPs; stagger planned moves into equity over 6 to 12 months.${eq ? ` A further 10% fall would move your equity (${lakh(eq)}) by about ${lakh(eq * 0.1)}.` : ""}`,
        impactRupees: eq ? round(eq * 0.1, 100) : undefined });
    } else if (nifty.regime === "strong-uptrend" && (nifty.zScore200 ?? 0) > 1.5) {
      out.push({ id: "eq-stretched", severity: "warning", title: "Equity is well above its 200-day average",
        detail: `${desc} Prices are ${nifty.zScore200} standard deviations above the 200-day mean. Lump sums carry higher short-term risk: use a 6 to 12 month STP.` });
    } else {
      out.push({ id: "eq-normal", severity: "info", title: `Equity market: ${nifty.regime.replace("-", " ")}`,
        detail: `${desc} No action needed; keep SIPs running.${total > 0 && eqPct < 20 ? ` Your equity is only ${eqPct.toFixed(0)}% of investments; the suggested mix is higher.` : ""}` });
    }
  }
  if (goldRet !== null && safe(h.holdings.gold) > 0 && total > 0) {
    const gPct = (safe(h.holdings.gold) / total) * 100;
    if (gPct > 15) {
      const excess = round(safe(h.holdings.gold) - total * 0.08, 1000);
      out.push({ id: "gold-rebalance", severity: goldRet > 10 ? "opportunity" : "info",
        title: goldRet > 10 ? `Gold is up ${goldRet}% in rupees: a good moment to rebalance` : `Gold is ${gPct.toFixed(0)}% of your investments`,
        detail: `Suggested gold share is 5 to 8%; excess above 8% ≈ ${lakh(excess)}.${goldRet > 10 ? " Trimming after a strong year locks in gains." : ""} Gold's 1-year rupee return: ${goldRet}%.`,
        impactRupees: excess });
    }
  }
  return out;
}

/** Map live market signals onto this household. Every number is computed, never generated. */
export function analyseMarket(h: Household, snap: MarketSnapshot): MarketAnalysis {
  const signals = [snap.nifty, snap.gold, snap.usdinr].filter((s): s is Series => !!s).map(analyseSeries);
  const cpi = snap.cpi?.find((c) => Number.isFinite(c.valuePct)) ?? null;
  const infl = cpi ? cpi.valuePct : INFLATION_PCT;
  const slab = safe(h.taxSlabPct) / 100;
  const ctx: InsightCtx = {
    h, infl, cpi,
    total: Object.values(h.holdings).reduce((a, b) => a + safe(b), 0),
    realCash: realAfterTax(ASSETS.cash.preTaxPct, slab, infl),
    realFd: realAfterTax(ASSETS.fd.preTaxPct, slab, infl),
    goldRet: r1(goldInr1y(snap.gold, snap.usdinr)),
    nifty: signals.find((s) => s.symbol === "^NSEI"),
  };
  const order = { warning: 0, opportunity: 1, info: 2 } as const;
  const insights = [...cashInsights(ctx), ...regimeInsights(ctx)].sort((a, b) => order[a.severity] - order[b.severity]);
  return {
    asOf: snap.fetchedAt, source: snap.source, latestCpiPct: cpi?.valuePct ?? null, cpiYear: cpi?.year ?? null,
    assumedInflationPct: INFLATION_PCT, realCashReturnPct: ctx.realCash, realFdReturnPct: ctx.realFd, goldInrRet1yPct: ctx.goldRet,
    signals, insights, notes: snap.notes,
  };
}
