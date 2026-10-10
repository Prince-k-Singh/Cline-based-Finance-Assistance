# Real-World ML Engine: implementation status

Both ideas from the original handoff are **implemented, tested and live**.

## ✅ Idea 1: Macro-Analyst (real-world economic data)

| Piece | File | What it does |
|---|---|---|
| Live data | `server/market-data.ts` | 1 year of daily **Nifty 50, Gold (USD/oz), USD/INR** (Yahoo Finance) + **India CPI** (World Bank). No key. Cached 6 h in `data/market-cache.json`; falls back to cache, then to plan assumptions. |
| Analytics | `src/engine/market.ts` | Returns, **EWMA volatility** (λ=0.94), **max drawdown**, **log-linear trend regression** (slope, R²), **200-day z-score**, **regime classifier**. |
| Personalisation | `src/engine/market-insights.ts`, `insights-cash.ts` | Real return of cash/FD after the family's tax slab and live CPI, ₹ purchasing power lost, inflation drift, correction / stretched / gold-rebalance insights with ₹ impact. |
| AI subagent | `server/macro-agent.ts` | Cline SDK agent with `get_market_analysis`, `get_plan_summary`, `get_spending_forecast`; multilingual briefing using only tool numbers. |
| Chat | `server/tools.ts` | Ask Parivar gained `market_impact` and `spending_forecast` tools. |
| Check-in | `server/checkin.ts` | Monthly check-ins include top market insights. |
| UI / API | `src/ui/tabs/InsightsTab.tsx`, `POST /api/market`, `POST /api/market/briefing` | New **Live insights 🌍** tab. |

## ✅ Idea 2: Predictive spending anomaly detection

| Piece | File | What it does |
|---|---|---|
| History | `server/history.ts` | `data/spending-history.json`; each monthly check-in is saved automatically. `GET/POST/DELETE /api/history`. |
| Engine | `src/engine/anomaly.ts` | Median baseline per category, **robust z-score** (MAD), month-end projection blending pace with baseline (pace weight grows through the month); fixed items project to baseline. Alerts when ≥ ₹500 over plan or unusual. |
| UI / API | `src/ui/tabs/SpendingPredictor.tsx`, `POST /api/forecast` | Mid-month predictor with alerts and pace bars. |

## Safety rule added in review
`src/engine/portfolio.ts` now **never moves the emergency fund into equity or gold** (the AI was otherwise relaying "move all FDs to equity" while the family had an emergency-fund gap).

## Verify
```
npm.cmd test                  # 33 tests incl. tests/ml.test.ts
npx tsx scripts/e2e.ts        # live market + forecast (server running)
npx tsx scripts/e2e.ts --ai   # + AI briefing and chat via Cline API
```

## Later
RBI repo / bank FD rates (no clean free API), monthly MoSPI CPI, WhatsApp/email mid-month alerts.
