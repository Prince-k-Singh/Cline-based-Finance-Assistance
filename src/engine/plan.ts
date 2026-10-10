import { ASSUMPTIONS_REVIEWED, FI_MULTIPLE, HIGH_INTEREST_DEBT_PCT } from "./assumptions";
import { computeBudget } from "./budget";
import { computeEmergency } from "./emergency";
import { computeLifestyle } from "./lifestyle";
import { lakh, round, safe } from "./math";
import { computePortfolio } from "./portfolio";
import { healthScore } from "./score";
import type { Household, Plan, WaterfallStep } from "./types";

/** Rough extra premium per ₹1 lakh of missing cover (monthly). */
const TERM_PREMIUM_PER_LAKH = 80 / 12;
const HEALTH_PREMIUM_PER_LAKH = 1500 / 12;

export function buildPlan(h: Household): Plan {
  const budget = computeBudget(h);
  const emergency = computeEmergency(h, budget);
  const surplus = Math.max(0, budget.savingsOptimised);

  const insuranceTopUp = round(
    (emergency.insurance.termGap / 1e5) * TERM_PREMIUM_PER_LAKH + (emergency.insurance.healthGap / 1e5) * HEALTH_PREMIUM_PER_LAKH,
    100,
  );
  const insurance = Math.min(surplus, insuranceTopUp);
  const afterInsurance = surplus - insurance;
  const efContribution = Math.min(afterInsurance, emergency.monthlyContribution);
  const afterEf = afterInsurance - efContribution;
  const lifestyle = computeLifestyle(h, afterEf);
  const lifestyleAmt = Math.min(afterEf, lifestyle.goals.length ? Math.min(lifestyle.affordable, lifestyle.totalNeeded) : lifestyle.affordable);
  const wealth = Math.max(0, afterEf - lifestyleAmt);
  const portfolio = computePortfolio(h);

  const waterfall: WaterfallStep[] = [
    { bucket: "Insurance top-up", amount: insurance, note: insurance ? "Approx. extra premium to close term/health cover gaps" : "Cover looks adequate" },
    { bucket: "Emergency fund", amount: efContribution, note: emergency.gap ? `Until ${lakh(emergency.target)} is reached` : "Already funded" },
    { bucket: "Lifestyle fund", amount: lifestyleAmt, note: "Vehicles, furniture, holidays without loans" },
    { bucket: "Long-term wealth (SIP)", amount: wealth, note: "Per the suggested allocation" },
  ];

  const debtAdvice = h.loans
    .filter((l) => safe(l.outstanding) > 0)
    .map((l) =>
      l.ratePct > HIGH_INTEREST_DEBT_PCT
        ? `${l.name} at ${l.ratePct}% costs more than investing is likely to earn. Prepay it before starting new SIPs (keep the emergency fund intact).`
        : `${l.name} at ${l.ratePct}%: keep paying EMIs; prepaying is optional.`,
    );

  const fiTarget = round(budget.totals.optimised * 12 * FI_MULTIPLE, 100000);
  const realPct = Math.max(0.5, portfolio.suggestedRealPct);
  const yearsToFi = yearsTo(fiTarget, portfolio.total, surplus, realPct);
  const fi = {
    target: fiTarget,
    years: yearsToFi,
    message:
      yearsToFi === null
        ? "Not reachable at this savings level. Raise the monthly surplus first."
        : `About ${yearsToFi} years at the current surplus and a ${realPct.toFixed(1)}% real return.`,
  };

  const score = healthScore(h, budget, emergency, portfolio);
  const actions = buildActions(h, budget, emergency, portfolio, debtAdvice);
  return {
    generatedAt: new Date().toISOString(),
    assumptionsReviewed: ASSUMPTIONS_REVIEWED,
    budget, emergency, lifestyle, portfolio, score, waterfall, debtAdvice, fi, actions,
  };
}

export function yearsTo(target: number, start: number, monthly: number, realPct: number): number | null {
  if (target <= 0 || start >= target) return 0;
  if (monthly <= 0) return null;
  let bal = start;
  const r = realPct / 100 / 12;
  for (let m = 1; m <= 12 * 60; m++) {
    bal = bal * (1 + r) + monthly;
    if (bal >= target) return Math.ceil(m / 12);
  }
  return null;
}

function buildActions(h: Household, b: Plan["budget"], e: Plan["emergency"], p: Plan["portfolio"], debt: string[]) {
  const d30: string[] = [], d90: string[] = [], m12: string[] = [];
  if (b.unaccountedFlag) d30.push(`Track ${lakh(b.unaccounted)}/month of unaccounted money for one month.`);
  if (e.insurance.healthGap > 0) d30.push(`Buy or top up family health cover to ${lakh(e.insurance.healthRecommended)}.`);
  if (e.insurance.termGap > 0) d30.push(`Buy term insurance of about ${lakh(e.insurance.termRecommended)}.`);
  if (e.gap > 0 && e.monthlyContribution > 0) d30.push(`Start an automatic ${lakh(e.monthlyContribution)}/month transfer to the emergency fund.`);
  if (b.savingsToday < 0) d30.push(`You spend ${lakh(-b.savingsToday)} more than you earn each month. Cut wants first.`);
  const trim = b.totals.today - b.totals.optimised;
  if (trim > 0) d90.push(`Trim spending by ${lakh(trim)}/month following the optimised column.`);
  debt.filter((d) => d.includes("Prepay")).forEach((d) => d90.push(d));
  p.moves.slice(0, 2).forEach((m) => d90.push(m));
  if (e.gap > 0) m12.push(`Complete the emergency fund (${lakh(e.target)}).`);
  m12.push("Increase SIPs by 10% with your annual raise.");
  if (h.goals.length) m12.push("Shift each lifestyle goal to safer funds a year before you need the money.");
  m12.push("Review this plan and the assumptions once a year.");
  return { d30, d90, m12 };
}
