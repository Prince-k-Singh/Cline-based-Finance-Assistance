# Parivar Plan: an AI money planner for the Indian middle-class family

Enter your income, expenses and holdings and get one clear, India-specific plan:

1. **Budget**: Today vs Optimised vs Bare-minimum, across 18 categories, with unaccounted-money detection
2. **Emergency fund**: dynamic months of cover (3 to 12), gap, how to hold it, job-loss runway, insurance check
3. **Lifestyle fund**: goals inflated to future cost, where to park the money by time horizon, a "what can it buy" table, and the 20/4/10 vehicle check
4. **Investments**: current vs suggested mix, post-tax and real returns, worst-year drawdown, moves in rupees, warning flags, 10/20-year projections

Also included: a 0–100 health score, a waterfall showing where the surplus should go, the high-interest debt rule, an FI number, 30/90/365-day action lists, statement import, monthly check-ins, and print to PDF.

**Design rule: the AI never invents numbers.** Every figure comes from pure TypeScript functions in `src/engine`. A Cline SDK agent only decides which of those functions to call and explains the results.

## Run it

Requires **Node.js 22+**.

```bash
npm install
cp .env.example .env        # optional: add an API key to enable the AI features
npm run dev                 # web on http://localhost:5173, API on :8787
npm test                    # engine unit tests (Vitest)
npm run build && npm start  # production: server also serves the built UI on :8787
npx tsx scripts/agent-smoke.ts   # checks the SDK tools (and a live call if a key is set)
```

Without an API key, every calculation, statement import (rule-based) and check-in still works. Only the "Ask Parivar" chat needs the key.

## Real-world ML engine (Live insights tab)

- **Live data:** Nifty 50, gold, USD/INR (Yahoo Finance) and India CPI (World Bank), with no API key, cached for 6 hours.
- **Signals:** EWMA volatility, drawdown, log-linear trend + R², 200-day z-score, and a market-regime label.
- **Personal insights:** the real return of *your* cash and FDs after *your* tax slab and live inflation, with ₹ impact, plus correction, stretched-market and gold-rebalance alerts.
- **Macro-Analyst agent (Cline SDK):** writes a briefing in your language from the market, plan and forecast tools.
- **Predictive spending:** learns your typical month (median + robust z-score) and warns mid-month before you overspend.

See `ML_IDEAS.md` for details.

## Project structure

```
src/engine/          Pure, tested finance engine (shared by browser and server)
  assumptions.ts     ALL rates, benchmarks, tax rules, with a review date
  budget.ts          Deliverable 1: today / optimised / bare minimum
  emergency.ts       Deliverable 2: months, target, runway, insurance
  lifestyle.ts       Deliverable 3: goals, vehicles, 20/4/10
  portfolio.ts       Deliverable 4: mix, returns, moves, flags, projections
  score.ts           Health score
  plan.ts            Builds the full plan: waterfall, FI number, actions
  statement.ts       Statement parser + rule-based categoriser
  checkin.ts         Monthly drift comparison
src/ui/              React UI (form, tabs, chat, statement, check-in)
server/              Node 22 + Express API
  tools.ts           8 Cline SDK tools wrapping the engine (createTool + zod)
  advisor.ts         "Ask Parivar" agent (system prompt forbids made-up numbers)
  statement-agent.ts Agent that categorises unknown transactions via a typed tool
  checkin.ts         Monthly check-in + in-process monthly scheduler
  index.ts           Routes: /api/health, /api/plan, /api/chat, /api/statement, /api/checkin(s)
tests/               Vitest tests for the engine and statement parser
```

## How the Cline SDK is used in the product

| Feature | SDK usage |
|---|---|
| Ask Parivar | `new Agent({ providerId, modelId, apiKey, systemPrompt, tools, maxIterations })` with 8 `createTool` tools: `get_plan`, `recompute_budget`, `emergency_fund_target`, `goal_planner`, `vehicle_affordability`, `portfolio_compare`, `prepay_vs_invest`, `get_assumptions`. Every tool call is logged and shown under the answer. |
| Statement categoriser | An agent with a single `set_categories` tool (`lifecycle.completesRun`). It can only change categories, never amounts. |
| Monthly check-in | Drift numbers are computed deterministically; an agent writes a friendly note using only those numbers. |
| Multilingual + voice | A language picker (Hindi, Bengali, Assamese, Tamil, Telugu, Marathi, Gujarati, Kannada, English) plus 🎤 voice input using the browser's speech recognition (Chrome/Edge). The numbers stay identical because they come from the tools. |
| MCP server | `npm run mcp` exposes the same 8 finance tools over MCP (stdio). Add it to Cline: `"parivar-plan": { "command": "npx", "args": ["tsx", "server/mcp.ts"], "cwd": "<path>/parivar-plan" }` |

Configure the provider with `CLINE_PROVIDER`, `CLINE_MODEL` and the matching key (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` or `CLINE_API_KEY`).

## Disclaimer

This is an educational tool, not financial advice. Returns are assumptions, not promises. Review `src/engine/assumptions.ts` before relying on the numbers.
