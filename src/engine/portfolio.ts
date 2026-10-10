import { ASSETS, GOLD_TARGET_PCT, INFLATION_PCT, LTCG_DRAG_PCT } from "./assumptions";
import { computeBudget } from "./budget";
import { computeEmergency } from "./emergency";
import { clamp, lakh, round, safe, sum } from "./math";
import { HOLDING_TYPES, type Holdings, type HoldingType, type Household, type PortfolioResult } from "./types";

export function postTaxReturn(type: HoldingType, slabPct: number): number {
  const a = ASSETS[type];
  if (a.tax === "none") return a.preTaxPct;
  if (a.tax === "slab") return a.preTaxPct * (1 - slabPct / 100);
  return a.preTaxPct * (1 - LTCG_DRAG_PCT / 100);
}

export const realReturn = (nominalPct: number) => ((1 + nominalPct / 100) / (1 + INFLATION_PCT / 100) - 1) * 100;

function weighted(mix: Holdings, f: (t: HoldingType) => number): number {
  const total = sum(HOLDING_TYPES.map((t) => safe(mix[t])));
  if (total === 0) return 0;
  return sum(HOLDING_TYPES.map((t) => (safe(mix[t]) / total) * f(t)));
}

/** Target allocation percentages by age and risk appetite. */
export function targetAllocation(age: number, risk: Household["riskAppetite"]) {
  const adj = risk === "low" ? -15 : risk === "high" ? 10 : 0;
  const equity = clamp(100 - age + adj, 20, 80);
  return { equity, gold: GOLD_TARGET_PCT, safe: 100 - equity - GOLD_TARGET_PCT };
}

const LOCKED: HoldingType[] = ["retirement", "property", "endowment"];

/**
 * Suggested mix with the same capital. Locked assets (EPF/PPF, property, policies) are never moved,
 * and `emergencyReserve` rupees always stay in safe, liquid assets (cash / FD / debt funds).
 */
export function suggestMix(h: Household, cur: Holdings, total: number, emergencyReserve = 0): Holdings {
  const tgt = targetAllocation(h.age, h.riskAppetite);
  const sug = Object.fromEntries(HOLDING_TYPES.map((t) => [t, 0])) as Holdings;
  LOCKED.forEach((t) => (sug[t] = cur[t]));
  const movable = Math.max(0, total - sum(LOCKED.map((t) => cur[t])));
  const reserve = Math.min(movable, Math.max(0, emergencyReserve));
  let investable = movable - reserve;
  const gold = Math.min(investable, (total * tgt.gold) / 100);
  investable -= gold;
  const eq = Math.min(investable, (total * tgt.equity) / 100);
  investable -= eq;
  sug.stocks = round(Math.min(cur.stocks, eq * 0.15), 1000);
  sug.equityFunds = round(eq - sug.stocks, 1000);
  sug.gold = round(gold, 1000);
  let safeMoney = reserve + investable;
  const cashKeep = Math.min(safeMoney, cur.cash, Math.max(50000, cur.cash * 0.2));
  sug.cash = round(cashKeep, 1000);
  safeMoney -= cashKeep;
  sug.fd = round(safeMoney * 0.4, 1000);
  sug.debtFunds = round(Math.max(0, safeMoney - sug.fd), 1000);
  return sug;
}


export function computePortfolio(h: Household): PortfolioResult {
  const cur = Object.fromEntries(HOLDING_TYPES.map((t) => [t, safe(h.holdings[t])])) as Holdings;
  const total = sum(HOLDING_TYPES.map((t) => cur[t]));
  // The emergency fund is protected: it is never suggested for equity or gold.
  const reserve = computeEmergency(h, computeBudget(h)).target;
  const sug = suggestMix(h, cur, total, reserve);

  const moves: string[] = [];
  if (reserve > 0 && total > 0) moves.push(`Keep ${lakh(Math.min(reserve, total))} in cash / FDs / debt funds as your emergency fund. It is not moved.`);
  const gainers = HOLDING_TYPES.filter((x) => !LOCKED.includes(x) && sug[x] - cur[x] > 10000);
  HOLDING_TYPES.forEach((t) => {
    if (LOCKED.includes(t)) return;
    const diff = sug[t] - cur[t];
    if (diff < -10000) {
      const to = gainers.map((x) => ASSETS[x].label);
      const via = gainers.includes("equityFunds") ? " via a 6 to 12 month STP" : "";
      moves.push(`Move ${lakh(-diff)} from ${ASSETS[t].label} to ${to.join(" / ") || "other assets"}${via}.`);
    }
  });
  if (cur.endowment > 0) moves.push("Endowment policies: stop adding new money; compare surrender value vs making it paid-up before deciding.");
  if (cur.retirement > 0) moves.push("EPF/PPF/NPS stays untouched; direct new monthly savings per the suggested mix instead.");

  const pct = (t: HoldingType) => (total ? (cur[t] / total) * 100 : 0);
  const flags: string[] = [];
  if (cur.cash > Math.max(100000, total * 0.1)) flags.push(`Idle cash of ${lakh(cur.cash)} earns about 3% (below inflation).`);
  if (cur.endowment > 0) flags.push(`Endowment/money-back policies (${lakh(cur.endowment)}) typically return 4 to 6%. Insure with term cover, invest separately.`);
  if (pct("gold") > 15) flags.push(`Gold is ${pct("gold").toFixed(0)}% of the portfolio (suggested 5 to 8%).`);
  if (pct("property") > 40) flags.push(`One property is ${pct("property").toFixed(0)}% of investments: concentrated and illiquid.`);
  if (pct("stocks") > 25) flags.push(`Direct stocks are ${pct("stocks").toFixed(0)}%: high effort and concentration risk.`);
  if (pct("cash") + pct("fd") > 40) flags.push(`Cash + FDs are ${(pct("cash") + pct("fd")).toFixed(0)}%: post-tax returns barely beat inflation.`);

  const slab = h.taxSlabPct;
  const curPT = weighted(cur, (t) => postTaxReturn(t, slab));
  const sugPT = weighted(sug, (t) => postTaxReturn(t, slab));
  const proj = (r: number, yrs: number) => ({
    low: round(total * Math.pow(1 + (r - 3) / 100, yrs), 1000),
    base: round(total * Math.pow(1 + r / 100, yrs), 1000),
    high: round(total * Math.pow(1 + (r + 2) / 100, yrs), 1000),
  });
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    total,
    current: cur,
    suggested: sug,
    currentPostTaxPct: r1(curPT),
    currentRealPct: r1(realReturn(curPT)),
    suggestedPostTaxPct: r1(sugPT),
    suggestedRealPct: r1(realReturn(sugPT)),
    currentWorstYearPct: r1(weighted(cur, (t) => ASSETS[t].worstYearPct)),
    suggestedWorstYearPct: r1(weighted(sug, (t) => ASSETS[t].worstYearPct)),
    moves,
    flags,
    projections: [10, 20].map((years) => ({ years, current: proj(curPT, years), suggested: proj(sugPT, years) })),
  };
}

/** Compare prepaying a loan vs investing at the suggested mix's post-tax return. */
export function prepayVsInvest(loanRatePct: number, investPostTaxPct: number) {
  const better = loanRatePct >= investPostTaxPct ? "prepay" : "invest";
  return {
    loanRatePct,
    investPostTaxPct,
    better,
    message:
      better === "prepay"
        ? `The loan costs ${loanRatePct}%, more than the ~${investPostTaxPct.toFixed(1)}% expected post-tax return. Prepaying is a guaranteed, risk-free saving.`
        : `The loan costs ${loanRatePct}%, below the ~${investPostTaxPct.toFixed(1)}% expected post-tax return. Investing may win over long periods, with market risk. Keep paying EMIs on time.`,
  };
}
