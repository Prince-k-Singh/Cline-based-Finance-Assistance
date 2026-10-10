import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { analyseMarket, compareMonth, type Expenses, type Household } from "../src/engine";
import { makeAgent, type LlmConfig } from "./llm";
import { getMarketSnapshot } from "./market-data";

const DIR = join(process.cwd(), "data", "checkins");

/**
 * Monthly check-in: deterministic drift comparison + (optional) a short
 * friendly note written by a Cline SDK agent from those numbers only.
 */
export async function runCheckIn(cfg: LlmConfig | null, h: Household, actual: Expenses, month: string, emergencySaved = 0) {
  const result = compareMonth(h, actual, month, emergencySaved);
  // Real-world context: deterministic market insights for this household.
  let market: { title: string; severity: string }[] = [];
  try {
    market = analyseMarket(h, await getMarketSnapshot()).insights.slice(0, 3).map((i) => ({ title: i.title, severity: i.severity }));
  } catch {
    /* market data optional */
  }
  let note = [...result.notes, ...market.filter((m) => m.severity !== "info").map((m) => m.title + ".")].join(" ");
  if (cfg) {
    try {
      const agent = makeAgent(cfg, {
        systemPrompt:
          "Write a 3-4 sentence friendly monthly money check-in for an Indian family. Use ONLY the numbers in the JSON given. No new numbers, no fund names.",
        maxIterations: 1,
      });
      const r = await agent.run(JSON.stringify({ ...result, marketInsights: market }));
      if (r.outputText?.trim()) note = r.outputText.trim();
    } catch (e) {
      console.warn("[checkin] AI note failed:", (e as Error).message);
    }
  }
  const record = { ...result, note, market, createdAt: new Date().toISOString() };
  await mkdir(DIR, { recursive: true });
  await writeFile(join(DIR, `${month}.json`), JSON.stringify(record, null, 2));
  return record;
}

export async function listCheckIns() {
  try {
    const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort().reverse();
    return Promise.all(files.map(async (f) => JSON.parse(await readFile(join(DIR, f), "utf8"))));
  } catch {
    return [];
  }
}

/** Simple in-process monthly scheduler (1st of each month, 09:00) for the saved household. */
export function startMonthlyScheduler(getJob: () => { cfg: LlmConfig | null; h: Household; actual: Expenses } | null) {
  let lastRun = "";
  const tick = async () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (now.getDate() === 1 && now.getHours() >= 9 && lastRun !== month) {
      const job = getJob();
      if (!job) return;
      lastRun = month;
      await runCheckIn(job.cfg, job.h, job.actual, month).catch((e) => console.warn("[scheduler]", e));
      console.log(`[scheduler] monthly check-in written for ${month}`);
    }
  };
  return setInterval(tick, 60 * 60 * 1000);
}
