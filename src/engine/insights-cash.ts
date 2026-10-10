import { ASSETS, INFLATION_PCT } from "./assumptions";
import type { SeriesSignals } from "./market";
import { lakh, round, safe } from "./math";
import type { Household } from "./types";

export interface MarketInsight {
  id: string;
  severity: "info" | "opportunity" | "warning";
  title: string;
  detail: string;
  impactRupees?: number;
}

export interface InsightCtx {
  h: Household;
  total: number;
  infl: number;
  cpi: { year: string; valuePct: number } | null;
  realCash: number;
  realFd: number;
  goldRet: number | null;
  nifty?: SeriesSignals;
}

/** Inflation vs cash/FD insights. */
export function cashInsights(c: InsightCtx): MarketInsight[] {
  const out: MarketInsight[] = [];
  const { h, infl, cpi, realCash, realFd } = c;
  if (safe(h.holdings.cash) > 0) {
    const loss = round((safe(h.holdings.cash) * Math.max(0, -realCash)) / 100, 100);
    out.push({
      id: "cash-real",
      severity: realCash < 0 ? "warning" : "info",
      title: realCash < 0 ? "Idle cash is losing value" : "Cash roughly keeps pace with inflation",
      detail:
        `India CPI inflation is ${infl.toFixed(1)}%${cpi ? ` (${cpi.year}, World Bank)` : " (assumed)"}. After ${h.taxSlabPct}% tax, a ${ASSETS.cash.preTaxPct}% savings account earns a real ${realCash}% a year.` +
        (loss > 0 ? ` On ${lakh(h.holdings.cash)} that's about ${lakh(loss)} of buying power lost yearly. Keep one month of expenses in savings; move the rest to a liquid fund or FD.` : ""),
      impactRupees: loss || undefined,
    });
  }
  if (cpi && Math.abs(cpi.valuePct - INFLATION_PCT) >= 1.5) {
    out.push({
      id: "infl-drift",
      severity: "info",
      title: `Inflation (${cpi.valuePct.toFixed(1)}%) differs from the plan's ${INFLATION_PCT}% assumption`,
      detail:
        cpi.valuePct < INFLATION_PCT
          ? "Your plan is conservative: real returns and goal costs are likely a bit better than shown. Long-run Indian inflation averages 5 to 6%, so the buffer is sensible."
          : "Goal costs may rise faster than planned. Add ~10% to goal amounts or extend timelines.",
    });
  }
  if (safe(h.holdings.fd) > 0) {
    out.push({
      id: "fd-real",
      severity: realFd < 1 ? "warning" : "info",
      title: `FDs earn a real ${realFd}% after tax and inflation`,
      detail: `${lakh(h.holdings.fd)} in FDs at ~${ASSETS.fd.preTaxPct}% pre-tax. ${
        realFd < 1
          ? "That barely beats inflation. Keep FDs for the emergency fund and goals under 3 years; long-term money belongs in a diversified mix."
          : "Fine for short-term goals and the emergency fund."
      }`,
    });
  }
  return out;
}
