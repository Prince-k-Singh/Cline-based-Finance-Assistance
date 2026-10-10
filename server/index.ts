import express from "express";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { analyseMarket, buildPlan, forecastMonth, type Expenses, type Household } from "../src/engine";
import { askProspera } from "./advisor";
import { listCheckIns, runCheckIn, startMonthlyScheduler } from "./checkin";
import { clearHistory, loadHistory, saveMonth } from "./history";
import { getLlmConfig } from "./llm";
import { runMacroAnalyst } from "./macro-agent";
import { getMarketSnapshot } from "./market-data";
import { getNewsFeed } from "./news";
import { categoriseStatement } from "./statement-agent";

// Minimal .env loader (no extra dependency)
const envFile = join(process.cwd(), ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const app = express();
app.use(express.json({ limit: "2mb" }));

// Loose validation: the engine sanitises numbers itself; we only check the shape.
const householdSchema = z.object({ netMonthlyIncome: z.number(), expenses: z.record(z.string(), z.number()), holdings: z.record(z.string(), z.number()) }).passthrough();

let lastJob: { h: Household; actual: Expenses } | null = null;

app.get("/api/health", (_req, res) => {
  const cfg = getLlmConfig();
  res.json({ ok: true, ai: !!cfg, provider: cfg?.providerId ?? null, model: cfg?.modelId ?? null });
});

app.post("/api/plan", (req, res) => {
  const parsed = householdSchema.safeParse(req.body?.household);
  if (!parsed.success) return res.status(400).json({ error: "Invalid household" });
  res.json(buildPlan(parsed.data as unknown as Household));
});

app.post("/api/chat", async (req, res) => {
  const cfg = getLlmConfig();
  if (!cfg) return res.status(503).json({ error: "AI is not configured. Add an API key to .env (see .env.example). All calculations still work." });
  const parsed = householdSchema.safeParse(req.body?.household);
  const question = String(req.body?.question ?? "").slice(0, 2000);
  if (!parsed.success || !question) return res.status(400).json({ error: "household and question are required" });
  try {
    const out = await askProspera(cfg, parsed.data as unknown as Household, Array.isArray(req.body.history) ? req.body.history : [], question, typeof req.body.language === "string" ? req.body.language : undefined);
    console.log(`[chat] tools used: ${out.toolCalls.map((t) => t.tool).join(", ") || "none"}`);
    res.json(out);
  } catch (e) {
    console.error("[chat]", e);
    res.status(500).json({ error: (e as Error).message || "Agent failed" });
  }
});

app.post("/api/statement", async (req, res) => {
  const text = String(req.body?.text ?? "");
  if (!text.trim()) return res.status(400).json({ error: "Paste statement text" });
  const months = Number(req.body?.months) || 1;
  try {
    res.json(await categoriseStatement(getLlmConfig(), text.slice(0, 200_000), months));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/checkin", async (req, res) => {
  const parsed = householdSchema.safeParse(req.body?.household);
  if (!parsed.success || !req.body?.actual) return res.status(400).json({ error: "household and actual expenses required" });
  const h = parsed.data as unknown as Household;
  const month = String(req.body.month || new Date().toISOString().slice(0, 7));
  lastJob = { h, actual: req.body.actual };
  // A completed month also becomes training history for the anomaly engine.
  await saveMonth(month, req.body.actual).catch(() => undefined);
  res.json(await runCheckIn(getLlmConfig(), h, req.body.actual, month, Number(req.body.emergencySaved) || 0));
});

app.get("/api/checkins", async (_req, res) => res.json(await listCheckIns()));

// ---- Real-world ML engine ----
const LANGS = ["English", "Hindi", "Bengali", "Assamese", "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada"];

/** Live market signals + deterministic personalised insights (no AI needed). */
app.post("/api/market", async (req, res) => {
  const parsed = householdSchema.safeParse(req.body?.household);
  if (!parsed.success) return res.status(400).json({ error: "Invalid household" });
  try {
    const snap = await getMarketSnapshot(Boolean(req.body?.force));
    res.json(analyseMarket(parsed.data as unknown as Household, snap));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** Money news (Mint, ET, Business Standard RSS) + market ticker for the Live insights page. */
app.get("/api/news", async (req, res) => {
  try {
    res.json(await getNewsFeed(req.query.force === "1"));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** Macro-Analyst subagent: AI briefing grounded in market + plan + spending tools. */
app.post("/api/market/briefing", async (req, res) => {
  const parsed = householdSchema.safeParse(req.body?.household);
  if (!parsed.success) return res.status(400).json({ error: "Invalid household" });
  const lang = LANGS.includes(req.body?.language) ? req.body.language : undefined;
  try {
    const history = await loadHistory();
    const out = await runMacroAnalyst(getLlmConfig(), parsed.data as unknown as Household, {
      language: lang, partial: req.body?.partial, month: req.body?.month, day: Number(req.body?.day) || undefined, history, force: Boolean(req.body?.force),
    });
    console.log(`[macro] tools used: ${out.toolCalls.join(", ") || "none"}${out.error ? ` (error: ${out.error})` : ""}`);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/** Spending history for the anomaly engine. */
app.get("/api/history", async (_req, res) => res.json(await loadHistory()));
app.post("/api/history", async (req, res) => {
  try {
    res.json(await saveMonth(String(req.body?.month), req.body?.expenses));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});
app.delete("/api/history", async (_req, res) => { await clearHistory(); res.json([]); });

/** Mid-month predictive forecast (deterministic). */
app.post("/api/forecast", async (req, res) => {
  const parsed = householdSchema.safeParse(req.body?.household);
  if (!parsed.success || !req.body?.partial) return res.status(400).json({ error: "household and partial expenses required" });
  const month = String(req.body.month || new Date().toISOString().slice(0, 7));
  const day = Number(req.body.day) || new Date().getDate();
  res.json(forecastMonth(parsed.data as unknown as Household, req.body.partial, month, day, await loadHistory()));
});

// Serve the built front-end in production (npm run build && npm start)
const dist = join(process.cwd(), "dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(dist, "index.html")));
}

startMonthlyScheduler(() => (lastJob ? { cfg: getLlmConfig(), ...lastJob } : null));

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  const cfg = getLlmConfig();
  console.log(`Prospera API on http://localhost:${port}  (AI: ${cfg ? `${cfg.providerId}/${cfg.modelId}` : "off – add a key in .env"})`);
});
