import { HEALTH_COVER_RECOMMENDED, TERM_COVER_MULTIPLE, VEHICLE } from "./assumptions";
import { round, safe } from "./math";
import type { BudgetResult, EmergencyResult, Household } from "./types";

export function emergencyMonths(h: Household, emiRatio: number): { months: number; reasons: string[] } {
  let m = 3;
  const reasons = ["Base: 3 months"];
  if (h.earners === 1) { m += 2; reasons.push("+2 single earner"); }
  if (h.jobType === "private") { m += 1; reasons.push("+1 private-sector job"); }
  if (h.jobType === "self_employed") { m += 2; reasons.push("+2 self-employed / variable income"); }
  if (h.children > 0 || h.dependentParents > 0) { m += 1; reasons.push("+1 dependants"); }
  if (emiRatio > 0.35) { m += 1; reasons.push("+1 EMIs above 35% of income"); }
  if (!h.hasHealthInsurance) { m += 1; reasons.push("+1 no health insurance"); }
  if (m > 12) { m = 12; reasons.push("Capped at 12 months"); }
  return { months: m, reasons };
}

export function computeEmergency(h: Household, b: BudgetResult): EmergencyResult {
  const { months, reasons } = emergencyMonths(h, b.emiRatio);
  const monthlyBase = b.totals.bareMinimum;
  const target = round(months * monthlyBase, 1000);
  const existing = safe(h.holdings.cash) + safe(h.holdings.fd) + safe(h.holdings.debtFunds);
  const gap = Math.max(0, target - existing);

  const surplus = Math.max(0, b.savingsOptimised);
  const bonusPerMonth = safe(h.annualBonus) / 2 / 12;
  // Up to 60% of surplus goes to filling the gap until it is full.
  const monthlyContribution = gap > 0 ? round(surplus * 0.6 + bonusPerMonth, 100) : 0;
  const monthsToFill = gap === 0 ? 0 : monthlyContribution > 0 ? Math.ceil(gap / monthlyContribution) : null;

  const liquid = existing;
  const runwayFor = (spend: number, otherIncome = 0) => {
    const net = spend - otherIncome;
    return net <= 0 ? null : Math.floor((liquid / net) * 10) / 10;
  };
  const runway: EmergencyResult["runway"] = [
    { scenario: "Today's lifestyle", monthlySpend: b.totals.today, months: runwayFor(b.totals.today) },
    { scenario: "Optimised budget", monthlySpend: b.totals.optimised, months: runwayFor(b.totals.optimised) },
    { scenario: "Bare minimum", monthlySpend: b.totals.bareMinimum, months: runwayFor(b.totals.bareMinimum) },
  ];
  if (h.earners === 2) {
    const primary = safe(h.primaryEarnerIncome) || safe(h.netMonthlyIncome) * 0.6;
    const other = Math.max(0, safe(h.netMonthlyIncome) - primary);
    runway.push({
      scenario: "Primary earner loses job (optimised)",
      monthlySpend: b.totals.optimised,
      months: runwayFor(b.totals.optimised, other),
    });
  }

  const grossAnnual = safe(h.netMonthlyIncome) * 12 * VEHICLE.grossToNetFactor;
  const termRecommended = round(grossAnnual * TERM_COVER_MULTIPLE, 100000);
  const healthRecommended = HEALTH_COVER_RECOMMENDED[h.cityTier];
  const healthHave = h.hasHealthInsurance ? safe(h.healthCover) : 0;
  return {
    months,
    reasons,
    monthlyBase,
    target,
    existing,
    gap,
    monthsToFill,
    monthlyContribution,
    holding: { savingsAccount: round(monthlyBase, 1000), liquidOrFd: Math.max(0, target - round(monthlyBase, 1000)) },
    runway,
    insurance: {
      termRecommended,
      termHave: safe(h.termCover),
      termGap: Math.max(0, termRecommended - safe(h.termCover)),
      healthRecommended,
      healthHave,
      healthGap: Math.max(0, healthRecommended - healthHave),
    },
  };
}
