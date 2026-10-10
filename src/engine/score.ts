import { clamp, lakh, safe } from "./math";
import type { BudgetResult, EmergencyResult, Household, PortfolioResult, ScorePart } from "./types";

export function healthScore(h: Household, b: BudgetResult, e: EmergencyResult, p: PortfolioResult) {
  const income = safe(h.netMonthlyIncome);
  const sr = income ? (income - b.totals.today) / income : 0;
  const parts: ScorePart[] = [];

  parts.push({ name: "Savings rate", score: clamp(Math.round((sr / 0.3) * 25), 0, 25), max: 25,
    reason: `Saving ${(sr * 100).toFixed(0)}% of income (30%+ earns full marks).` });

  const ef = e.target ? e.existing / e.target : 1;
  parts.push({ name: "Emergency fund", score: clamp(Math.round(ef * 20), 0, 20), max: 20,
    reason: `${Math.min(100, Math.round(ef * 100))}% of the ${e.months}-month target.` });

  parts.push({ name: "Debt burden", score: clamp(Math.round(15 * (1 - Math.max(0, b.emiRatio - 0.2) / 0.3)), 0, 15), max: 15,
    reason: `EMIs take ${(b.emiRatio * 100).toFixed(0)}% of income (under 20% is ideal).` });

  const i = e.insurance;
  const ratio = (have: number, need: number) => (need ? Math.min(1, have / need) : 1);
  parts.push({ name: "Insurance", score: clamp(Math.round(7.5 * ratio(i.termHave, i.termRecommended) + 7.5 * ratio(i.healthHave, i.healthRecommended)), 0, 15), max: 15,
    reason: `Term ${lakh(i.termHave)} of ${lakh(i.termRecommended)}; health ${lakh(i.healthHave)} of ${lakh(i.healthRecommended)}.` });

  parts.push({ name: "Investment efficiency", score: p.total === 0 ? 5 : clamp(Math.round(((p.currentRealPct + 1) / 4) * 15), 0, 15), max: 15,
    reason: p.total ? `Current mix earns ~${p.currentRealPct}% a year after tax and inflation.` : "No investments yet." });

  const waste = b.totals.today ? (b.totals.today - b.totals.optimised) / b.totals.today : 0;
  parts.push({ name: "Spending efficiency", score: clamp(Math.round(10 * (1 - waste / 0.15)), 0, 10), max: 10,
    reason: `${(waste * 100).toFixed(0)}% of spending could be trimmed without changing your life much.` });

  return { total: parts.reduce((a, x) => a + x.score, 0), parts };
}
