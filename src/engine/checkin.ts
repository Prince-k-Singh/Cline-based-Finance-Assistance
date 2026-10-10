import { computeBudget } from "./budget";
import { CATEGORY_META } from "./assumptions";
import { EXPENSE_CATEGORIES, type Expenses, type Household } from "./types";

export interface CheckIn {
  month: string;
  overspends: { category: string; planned: number; actual: number; pctOver: number }[];
  totalPlanned: number;
  totalActual: number;
  notes: string[];
}

/** Compares a month's actual expenses with the optimised plan (drift alerts). */
export function compareMonth(h: Household, actual: Expenses, month: string, emergencySaved = 0): CheckIn {
  const b = computeBudget(h);
  const planned = Object.fromEntries(b.lines.map((l) => [l.category, l.optimised]));
  const overspends = EXPENSE_CATEGORIES.map((c) => {
    const p = planned[c] ?? 0;
    const a = actual[c] ?? 0;
    return { category: CATEGORY_META[c].label, planned: p, actual: a, pctOver: p > 0 ? Math.round(((a - p) / p) * 100) : a > 0 ? 100 : 0 };
  })
    .filter((o) => o.actual - o.planned > 500 && o.pctOver >= 15)
    .sort((x, y) => y.actual - y.planned - (x.actual - x.planned));
  const totalActual = EXPENSE_CATEGORIES.reduce((s, c) => s + (actual[c] ?? 0), 0);
  const notes: string[] = overspends.slice(0, 3).map((o) => `${o.category} is up ${o.pctOver}% vs plan (₹${o.actual.toLocaleString("en-IN")} vs ₹${o.planned.toLocaleString("en-IN")}).`);
  if (totalActual <= b.totals.optimised) notes.push("Total spending is within the optimised budget. Well done!");
  if (emergencySaved > 0) notes.push(`₹${emergencySaved.toLocaleString("en-IN")} added to the emergency fund this month.`);
  if (month.endsWith("-04")) notes.push("New financial year: consider increasing SIPs by 10%.");
  return { month, overspends, totalPlanned: b.totals.optimised, totalActual, notes };
}
