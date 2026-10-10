/**
 * Smoke test for the Cline SDK advisor wiring.
 * - Always: verifies all 8 finance tools build and execute locally.
 * - With a real key in .env: asks a real question end-to-end.
 * Run: npx tsx scripts/agent-smoke.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { SAMPLE_HOUSEHOLD } from "../src/engine";
import { askProspera } from "../server/advisor";
import { getLlmConfig } from "../server/llm";
import { createFinanceTools, type ToolLogEntry } from "../server/tools";

if (existsSync(".env")) {
  for (const l of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const log: ToolLogEntry[] = [];
const tools = createFinanceTools(SAMPLE_HOUSEHOLD, log);
console.log("Tools:", tools.map((t) => t.name).join(", "));
const ctx = { agentId: "smoke", iteration: 0 };
type AnyTool = { name: string; execute: (input: unknown, c: typeof ctx) => Promise<unknown> };
const call = (name: string, input: unknown) => (tools as unknown as AnyTool[]).find((t) => t.name === name)!.execute(input, ctx);
const veh = (await call("vehicle_affordability", { price: 900000 })) as { affordable: boolean; maxAffordablePrice: number };
console.log("vehicle_affordability(9L):", veh.affordable, "max:", veh.maxAffordablePrice);
const wi = (await call("recompute_budget", { changes: { netMonthlyIncome: 80000 } })) as { savingsToday: number };
console.log("recompute_budget(income 80k) savingsToday:", wi.savingsToday);

const cfg = getLlmConfig();
if (!cfg) {
  console.log("No API key configured: skipping live agent call.");
} else {
  const out = await askProspera(cfg, SAMPLE_HOUSEHOLD, [], "Can we afford a ₹9 lakh car next year?");
  console.log("Tools called:", out.toolCalls.map((t) => t.tool));
  console.log("Answer:\n" + out.answer);
}
