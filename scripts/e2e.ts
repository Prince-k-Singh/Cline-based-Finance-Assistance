/** End-to-end check of the live API (server must be running): npx tsx scripts/e2e.ts */
import { SAMPLE_HOUSEHOLD } from "../src/engine";

const BASE = process.env.BASE ?? "http://localhost:8787";
const post = async (path: string, body: unknown) => {
  const r = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status}: ${JSON.stringify(j)}`);
  return j;
};
const h = SAMPLE_HOUSEHOLD;

const m = await post("/api/market", { household: h, force: true });
console.log("MARKET source:", m.source, "| CPI:", m.latestCpiPct, m.cpiYear, "| gold INR 1y:", m.goldInrRet1yPct, "| real cash:", m.realCashReturnPct);
for (const s of m.signals) console.log(`  ${s.label}: last ${s.last} 1y ${s.ret1yPct}% vol ${s.volAnnPct}% dd ${s.drawdownFromHighPct}% trend ${s.trendSlopeAnnPct}% r2 ${s.trendR2} z ${s.zScore200} → ${s.regime}`);
for (const i of m.insights) console.log(`  [${i.severity}] ${i.title}`);

const partial = Object.fromEntries(Object.keys(h.expenses).map((k) => [k, 0]));
Object.assign(partial, { eatingOut: 4500, food: 6000, shopping: 4000, housing: 26000, emis: 14000 });
const f = await post("/api/forecast", { household: h, partial, month: "2026-10", day: 12 });
console.log(`FORECAST spent ${f.totalSpent} → projected ${f.totalProjected} vs plan ${f.totalBudget} (history ${f.historyMonths} months)`);
for (const a of f.alerts) console.log("  ALERT:", a);

if (process.argv.includes("--ai")) {
  const b = await post("/api/market/briefing", { household: h, language: process.argv.includes("--hi") ? "Hindi" : "English" });
  console.log("BRIEFING tools:", b.toolCalls, b.error ?? "");
  console.log(b.briefing);
  const c = await post("/api/chat", { household: h, question: "Is now a good time to invest my idle cash, given current markets and inflation?", history: [] });
  console.log("CHAT tools:", c.toolCalls.map((t: { tool: string }) => t.tool));
  console.log(c.answer);
}
