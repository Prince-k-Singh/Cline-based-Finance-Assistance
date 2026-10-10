/**
 * Predictive spending engine (pure, tested).
 * - Learns each category's typical monthly spend from history (robust: median + MAD).
 * - Flags anomalies with a robust z-score.
 * - Mid-month: projects month-end spend from pace (days elapsed) blended with the
 *   learned baseline, and warns before the user overshoots the optimised budget.
 */
import { CATEGORY_META } from "./assumptions";
import { computeBudget } from "./budget";
import { EXPENSE_CATEGORIES, type ExpenseCategory, type Expenses, type Household } from "./types";

export interface MonthRecord { month: string; expenses: Expenses } // month = "YYYY-MM"

export interface CategoryForecast {
  category: ExpenseCategory;
  label: string;
  spentSoFar: number;
  baseline: number | null; // learned typical month (median)
  budget: number; // optimised plan
  projected: number;
  projectedOverBudget: number;
  robustZ: number | null; // anomaly score of projected vs history
  status: "ok" | "watch" | "over";
}

export interface SpendingForecast {
  month: string;
  dayOfMonth: number;
  daysInMonth: number;
  elapsedShare: number;
  historyMonths: number;
  totalSpent: number;
  totalProjected: number;
  totalBudget: number;
  projectedSavingsShortfall: number;
  categories: CategoryForecast[];
  alerts: string[];
}

export const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Robust z-score: (x - median) / (1.4826 * MAD). */
export function robustZ(x: number, history: number[]): number | null {
  if (history.length < 3) return null;
  const med = median(history);
  const mad = median(history.map((v) => Math.abs(v - med))) * 1.4826;
  const scale = Math.max(mad, med * 0.1, 200); // floor avoids blow-ups on flat history
  return Math.round(((x - med) / scale) * 100) / 100;
}

export function daysIn(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * Forecast month-end spend per category.
 * Fixed obligations (EMI, fees, premiums) are lumpy: projected = max(spent, baseline/budget).
 * Variable categories: blend pace-based run-rate with the learned baseline;
 * the weight on pace grows as the month progresses.
 */
export function forecastMonth(h: Household, partial: Expenses, month: string, dayOfMonth: number, history: MonthRecord[] = []): SpendingForecast {
  const dim = daysIn(month);
  const day = Math.min(Math.max(1, dayOfMonth), dim);
  const share = day / dim;
  const plan = Object.fromEntries(computeBudget(h).lines.map((l) => [l.category, l.optimised])) as Record<ExpenseCategory, number>;
  const past = history.filter((r) => r.month < month).slice(-12);
  const cats: CategoryForecast[] = EXPENSE_CATEGORIES.map((c) => {
    const spent = Math.max(0, partial[c] ?? 0);
    const hist = past.map((r) => r.expenses[c] ?? 0);
    const baseline = hist.length ? median(hist) : null;
    const budget = plan[c] ?? 0;
    const meta = CATEGORY_META[c];
    let projected: number;
    if (meta.kind === "fixed" || c === "housing") {
      projected = Math.max(spent, baseline ?? budget);
    } else {
      const pace = spent / share;
      const prior = baseline ?? budget;
      const w = Math.min(1, share * 1.2); // trust pace more later in the month
      projected = Math.max(spent, w * pace + (1 - w) * prior);
    }
    projected = Math.round(projected / 10) * 10;
    const over = Math.max(0, projected - budget);
    const z = robustZ(projected, hist);
    const status: CategoryForecast["status"] = over > Math.max(500, budget * 0.15) || (z ?? 0) > 3 ? "over" : over > 0 || (z ?? 0) > 2 ? "watch" : "ok";
    return { category: c, label: meta.label, spentSoFar: spent, baseline: baseline === null ? null : Math.round(baseline), budget, projected, projectedOverBudget: over, robustZ: z, status };
  });
  const totalSpent = cats.reduce((a, c) => a + c.spentSoFar, 0);
  const totalProjected = cats.reduce((a, c) => a + c.projected, 0);
  const totalBudget = cats.reduce((a, c) => a + c.budget, 0);
  const shortfall = Math.max(0, totalProjected - totalBudget);
  const alerts = cats
    // Only alert when it matters: ≥₹500 over plan, or statistically unusual vs history.
    .filter((c) => c.status !== "ok" && meta(c.category) !== "fixed" && (c.projectedOverBudget >= 500 || (c.robustZ ?? 0) > 2))
    .sort((a, b) => b.projectedOverBudget - a.projectedOverBudget)
    .slice(0, 4)
    .map((c) => {
      const pctUsed = c.budget ? Math.round((c.spentSoFar / c.budget) * 100) : 100;
      return `${c.label}: ₹${c.spentSoFar.toLocaleString("en-IN")} spent by day ${day} (${pctUsed}% of the ₹${c.budget.toLocaleString("en-IN")} budget, ${Math.round(share * 100)}% of the month gone). On this pace you'll reach about ₹${c.projected.toLocaleString("en-IN")}${c.projectedOverBudget > 0 ? `, ₹${c.projectedOverBudget.toLocaleString("en-IN")} over plan` : ""}.${c.robustZ !== null && c.robustZ > 2 ? ` That's unusually high vs your last ${past.length} months.` : ""}`;
    });
  if (shortfall > 0) alerts.push(`Overall you're on track to spend ₹${totalProjected.toLocaleString("en-IN")} vs a ₹${totalBudget.toLocaleString("en-IN")} plan, ₹${shortfall.toLocaleString("en-IN")} less saved this month unless you slow down.`);
  return {
    month, dayOfMonth: day, daysInMonth: dim, elapsedShare: Math.round(share * 100) / 100, historyMonths: past.length,
    totalSpent, totalProjected, totalBudget, projectedSavingsShortfall: shortfall, categories: cats, alerts,
  };
}

const meta = (c: ExpenseCategory) => CATEGORY_META[c].kind;
