import { createTool } from "@cline/sdk";
import { z } from "zod";
import { analyseMarket, buildPlan, forecastMonth, type Expenses, type Household, type MarketAnalysis, type MonthRecord } from "../src/engine";
import { makeAgent, type LlmConfig } from "./llm";
import { getMarketSnapshot } from "./market-data";

export const MACRO_SYSTEM_PROMPT = `You are the "Prospera Macro Analyst" for an Indian family.
Call get_market_analysis first. If spending data is provided, also call get_spending_forecast.
Then write a short personalised briefing (max 120 words, 3-5 bullets):
- Lead with the single most important action for THIS family.
- Use ONLY numbers that appear in tool results. Never invent or compute new figures.
- Connect market facts to their actual holdings (cash, FDs, gold, equity) and goals.
- No fund/stock names, no return promises, mention risk where relevant.
- End with: "Educational guidance, not SEBI-registered advice."
Reply in {LANG}.`;

export interface MacroBriefing {
  analysis: MarketAnalysis;
  briefing: string | null;
  toolCalls: string[];
  error?: string;
}

export async function runMacroAnalyst(
  cfg: LlmConfig | null,
  h: Household,
  opts: { language?: string; partial?: Expenses; month?: string; day?: number; history?: MonthRecord[]; force?: boolean } = {},
): Promise<MacroBriefing> {
  const snap = await getMarketSnapshot(opts.force);
  const analysis = analyseMarket(h, snap);
  if (!cfg) return { analysis, briefing: null, toolCalls: [] };

  const calls: string[] = [];
  const tools = [
    createTool({
      name: "get_market_analysis",
      description: "Live Indian market + inflation signals (Nifty 50 trend/volatility/drawdown, gold in INR, CPI) mapped to this family's holdings, with computed rupee impacts.",
      inputSchema: z.object({}),
      async execute() {
        calls.push("get_market_analysis");
        const { signals, insights, latestCpiPct, cpiYear, realCashReturnPct, realFdReturnPct, goldInrRet1yPct, asOf } = analysis;
        return { asOf, latestCpiPct, cpiYear, realCashReturnPct, realFdReturnPct, goldInrRet1yPct, signals, insights, holdings: h.holdings };
      },
    }),
    createTool({
      name: "get_plan_summary",
      description: "This family's plan headline numbers: budget totals, emergency fund status, score, goals.",
      inputSchema: z.object({}),
      async execute() {
        calls.push("get_plan_summary");
        const p = buildPlan(h);
        return { budget: p.budget.totals, savingsOptimised: p.budget.savingsOptimised, emergency: { target: p.emergency.target, existing: p.emergency.existing, gap: p.emergency.gap }, score: p.score.total, goals: p.lifestyle.goals.map((g) => ({ name: g.name, futureCost: g.futureCost, years: g.years })) };
      },
    }),
    createTool({
      name: "get_spending_forecast",
      description: "Mid-month spending forecast: projected month-end spend per category vs budget, anomalies and alerts.",
      inputSchema: z.object({}),
      async execute() {
        calls.push("get_spending_forecast");
        if (!opts.partial || !opts.month || !opts.day) return { available: false };
        const f = forecastMonth(h, opts.partial, opts.month, opts.day, opts.history ?? []);
        return { available: true, ...f, categories: f.categories.filter((c) => c.status !== "ok") };
      },
    }),
  ];
  try {
    const agent = makeAgent(cfg, { systemPrompt: MACRO_SYSTEM_PROMPT.replace("{LANG}", opts.language || "simple English"), tools, maxIterations: 6 });
    const r = await agent.run(`Prepare this month's real-world money briefing for this family.${opts.partial ? " Spending data for this month is available." : ""}`);
    if (r.status !== "completed") throw r.error ?? new Error(`agent ${r.status}`);
    return { analysis, briefing: r.outputText.trim(), toolCalls: calls };
  } catch (e) {
    return { analysis, briefing: null, toolCalls: calls, error: (e as Error).message };
  }
}
