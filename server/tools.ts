import { createTool } from "@cline/sdk";
import { z } from "zod";
import { loadHistory } from "./history";
import { getMarketSnapshot } from "./market-data";
import {
  analyseMarket,
  forecastMonth,
  ASSETS,
  ASSUMPTIONS_REVIEWED,
  BENCHMARKS,
  buildPlan,
  computeBudget,
  computeEmergency,
  computePortfolio,
  EXPENSE_CATEGORIES,
  INFLATION_PCT,
  planGoal,
  prepayVsInvest,
  vehicleAffordability,
  type Household,
} from "../src/engine";

export interface ToolLogEntry {
  tool: string;
  input: unknown;
  at: string;
}

const expensePatch = z
  .object(Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, z.number().nonnegative().optional()])))
  .partial()
  .describe(`Monthly expense overrides in ₹. Keys: ${EXPENSE_CATEGORIES.join(", ")}`);

/**
 * Tools that wrap the deterministic finance engine. The model never computes
 * numbers itself; every figure it quotes must come from one of these results.
 * `log` records each call so answers can be audited.
 */
export function createFinanceTools(household: Household, log: ToolLogEntry[]) {
  const track = (tool: string, input: unknown) => log.push({ tool, input, at: new Date().toISOString() });
  const withChanges = (changes?: { netMonthlyIncome?: number; earners?: 1 | 2; expenses?: Record<string, number | undefined> }) => {
    const h: Household = structuredClone(household);
    if (!changes) return h;
    if (changes.netMonthlyIncome !== undefined) h.netMonthlyIncome = changes.netMonthlyIncome;
    if (changes.earners !== undefined) h.earners = changes.earners;
    for (const [k, v] of Object.entries(changes.expenses ?? {})) if (v !== undefined) (h.expenses as Record<string, number>)[k] = v;
    return h;
  };

  const whatIf = z
    .object({
      netMonthlyIncome: z.number().nonnegative().optional().describe("New monthly take-home income in ₹"),
      earners: z.union([z.literal(1), z.literal(2)]).optional(),
      expenses: expensePatch.optional(),
    })
    .optional();

  return [
    createTool({
      name: "get_plan",
      description: "Returns the full computed plan (budget, emergency fund, lifestyle fund, investments, score, waterfall, actions) for this household.",
      inputSchema: z.object({}),
      async execute() {
        track("get_plan", {});
        const p = buildPlan(household);
        return { household: { income: household.netMonthlyIncome, city: household.cityTier, earners: household.earners, children: household.children }, ...p };
      },
    }),
    createTool({
      name: "recompute_budget",
      description: "Re-runs the Today / Optimised / Bare-minimum budget with changed inputs (what-if: rent drops, cut eating out, spouse quits job).",
      inputSchema: z.object({ changes: whatIf }),
      async execute({ changes }) {
        track("recompute_budget", changes);
        const b = computeBudget(withChanges(changes));
        return { totals: b.totals, savingsToday: b.savingsToday, savingsOptimised: b.savingsOptimised, unaccounted: b.unaccounted, lines: b.lines };
      },
    }),
    createTool({
      name: "emergency_fund_target",
      description: "Re-runs the emergency fund calculation (months of cover, target, gap, runway, insurance check), optionally with what-if changes.",
      inputSchema: z.object({ changes: whatIf }),
      async execute({ changes }) {
        track("emergency_fund_target", changes);
        const h = withChanges(changes);
        return computeEmergency(h, computeBudget(h));
      },
    }),
    createTool({
      name: "goal_planner",
      description: "Monthly amount needed for a lifestyle goal (vehicle, furniture, trip) given today's price and years until needed.",
      inputSchema: z.object({ name: z.string(), costToday: z.number().positive(), years: z.number().positive() }),
      async execute(input) {
        track("goal_planner", input);
        return planGoal({ id: "adhoc", ...input });
      },
    }),
    createTool({
      name: "vehicle_affordability",
      description: "20/4/10 rule check for buying a vehicle at a given on-road price in ₹.",
      inputSchema: z.object({ price: z.number().positive() }),
      async execute({ price }) {
        track("vehicle_affordability", { price });
        const b = computeBudget(household);
        return vehicleAffordability(household, price, Math.max(0, b.savingsOptimised) * 0.5);
      },
    }),
    createTool({
      name: "portfolio_compare",
      description: "Current vs suggested investment mix: post-tax and real returns, worst-year drawdown, rupee moves, flags and 10/20-year projections.",
      inputSchema: z.object({}),
      async execute() {
        track("portfolio_compare", {});
        return computePortfolio(household);
      },
    }),
    createTool({
      name: "prepay_vs_invest",
      description: "Compares a loan's interest rate with the expected post-tax return of the suggested investment mix.",
      inputSchema: z.object({ loanRatePct: z.number().positive() }),
      async execute({ loanRatePct }) {
        track("prepay_vs_invest", { loanRatePct });
        return prepayVsInvest(loanRatePct, computePortfolio(household).suggestedPostTaxPct);
      },
    }),
    createTool({
      name: "market_impact",
      description: "LIVE real-world data: Nifty 50 trend/volatility/drawdown, gold in INR, India CPI inflation, and their computed rupee impact on this family's holdings. Use for questions about markets, inflation, gold, 'is now a good time', etc.",
      inputSchema: z.object({}),
      async execute() {
        track("market_impact", {});
        const a = analyseMarket(household, await getMarketSnapshot());
        return { asOf: a.asOf, source: a.source, latestCpiPct: a.latestCpiPct, cpiYear: a.cpiYear, realCashReturnPct: a.realCashReturnPct, realFdReturnPct: a.realFdReturnPct, goldInrRet1yPct: a.goldInrRet1yPct, signals: a.signals, insights: a.insights };
      },
    }),
    createTool({
      name: "spending_forecast",
      description: "Predicts month-end spending per category from spending so far this month (pace + learned history) and flags categories heading over budget.",
      inputSchema: z.object({
        dayOfMonth: z.number().int().min(1).max(31).describe("Today's day of the month"),
        spentSoFar: expensePatch.describe("Amounts spent so far this month by category (₹)"),
      }),
      async execute({ dayOfMonth, spentSoFar }) {
        track("spending_forecast", { dayOfMonth });
        const partial = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, Number((spentSoFar as Record<string, number | undefined>)[c] ?? 0)])) as Household["expenses"];
        const month = new Date().toISOString().slice(0, 7);
        const f = forecastMonth(household, partial, month, dayOfMonth, await loadHistory());
        return { ...f, categories: f.categories.filter((c) => c.spentSoFar > 0 || c.status !== "ok") };
      },
    }),
    createTool({
      name: "get_assumptions",
      description: "Returns the assumptions table (returns, tax treatment, drawdowns, city benchmarks, inflation) so answers can cite it.",
      inputSchema: z.object({}),
      async execute() {
        track("get_assumptions", {});
        return { reviewedOn: ASSUMPTIONS_REVIEWED, inflationPct: INFLATION_PCT, assets: ASSETS, cityBenchmarks: BENCHMARKS };
      },
    }),
  ];
}
