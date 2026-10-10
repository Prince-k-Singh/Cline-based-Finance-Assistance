import {
  BENCHMARKS,
  CATEGORY_META,
  CHILD_FOOD_WEIGHT,
  CONTINGENCY_PCT,
  OPTIMISED_NEED_MULTIPLE,
  WANTS_CAP_HIGH_EMI_PCT,
  WANTS_CAP_PCT,
} from "./assumptions";
import { round, safe, sum } from "./math";
import { EXPENSE_CATEGORIES, type BudgetLine, type BudgetResult, type ExpenseCategory, type Household } from "./types";

export function householdUnits(h: Household) {
  const adults = Math.max(1, safe(h.adults) + safe(h.dependentParents));
  return { adults, foodUnits: adults + safe(h.children) * CHILD_FOOD_WEIGHT, people: adults + safe(h.children) };
}

/** Bare-minimum floor for one category. */
function floorFor(cat: ExpenseCategory, actual: number, h: Household): number {
  const b = BENCHMARKS[h.cityTier];
  const { adults, foodUnits, people } = householdUnits(h);
  const meta = CATEGORY_META[cat];
  if (meta.kind === "fixed") return actual; // cannot be paused
  if (meta.kind === "want") return 0;
  let bench: number;
  switch (cat) {
    case "housing": bench = b.rent; break;
    case "food": bench = b.food * foodUnits; break;
    case "utilities": bench = b.utilities * Math.sqrt(people) * 1.5; break;
    case "transport": bench = b.transport * Math.min(adults, h.earners + (h.children > 0 ? 1 : 0)); break;
    case "phoneInternet": bench = b.phoneInternet * Math.min(people, 4); break;
    case "clothingHousehold": bench = b.clothingHousehold * foodUnits; break;
    case "domesticHelp":
      // only an essential when both parents work and there are young children
      bench = h.earners === 2 && h.children > 0 ? b.domesticHelp : 0;
      break;
    default: bench = actual;
  }
  return Math.min(actual, bench);
}

export function computeBudget(h: Household): BudgetResult {
  const income = safe(h.netMonthlyIncome);
  const emiRatio = income > 0 ? (safe(h.expenses.emis) + housingEmiShare(h)) / income : 0;
  const wantsCapPct = emiRatio > 0.4 ? WANTS_CAP_HIGH_EMI_PCT : WANTS_CAP_PCT;

  const lines: BudgetLine[] = EXPENSE_CATEGORIES.map((cat) => {
    const today = safe(h.expenses[cat]);
    const meta = CATEGORY_META[cat];
    const bareMinimum = floorFor(cat, today, h);
    let optimised = today;
    // Trim flexible needs to ~1.4x the floor, but never below half of today (same life, just leaner).
    if (meta.kind === "need") optimised = Math.min(today, Math.max(bareMinimum * OPTIMISED_NEED_MULTIPLE, today * 0.5));
    return { category: cat, label: meta.label, kind: meta.kind, today, optimised, bareMinimum };
  });

  // Scale wants to the cap, respecting a per-category minimum share.
  const wants = lines.filter((l) => l.kind === "want");
  const wantsToday = sum(wants.map((l) => l.today));
  const wantsCap = (income * wantsCapPct) / 100;
  if (wantsToday > wantsCap && wantsToday > 0) {
    const floors = wants.map((l) => l.today * (CATEGORY_META[l.category].minKeepShare ?? 0.5));
    const floorTotal = sum(floors);
    const target = Math.max(wantsCap, floorTotal);
    const flexTotal = wantsToday - floorTotal;
    const keepFlex = flexTotal > 0 ? (target - floorTotal) / flexTotal : 0;
    wants.forEach((l, i) => {
      l.optimised = floors[i] + (l.today - floors[i]) * keepFlex;
    });
  }

  lines.forEach((l) => {
    l.optimised = round(l.optimised, 10);
    l.bareMinimum = round(l.bareMinimum, 10);
  });

  const bareSub = sum(lines.map((l) => l.bareMinimum));
  const contingency = round((bareSub * CONTINGENCY_PCT) / 100, 10);
  const totals = {
    today: sum(lines.map((l) => l.today)),
    optimised: sum(lines.map((l) => l.optimised)),
    bareMinimum: bareSub + contingency,
  };
  const unaccounted = Math.max(0, income - totals.today - safe(h.monthlyInvesting));
  return {
    lines,
    totals,
    contingency,
    unaccounted,
    unaccountedFlag: income > 0 && unaccounted > income * 0.05,
    savingsToday: income - totals.today,
    savingsOptimised: income - totals.optimised,
    wantsCapPct,
    emiRatio,
  };
}

/** Housing counts as an EMI when the family has a home loan listed. */
function housingEmiShare(h: Household): number {
  return h.loans.some((l) => /home|house/i.test(l.name)) ? safe(h.expenses.housing) : 0;
}
