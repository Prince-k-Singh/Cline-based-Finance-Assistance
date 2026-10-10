import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Expenses, MonthRecord } from "../src/engine";

/** Monthly spending history used by the anomaly/forecast engine. Local JSON file. */
const FILE = join(process.cwd(), "data", "spending-history.json");

export async function loadHistory(): Promise<MonthRecord[]> {
  try {
    const rows = JSON.parse(await readFile(FILE, "utf8")) as MonthRecord[];
    return rows.sort((a, b) => a.month.localeCompare(b.month));
  } catch {
    return [];
  }
}

export async function saveMonth(month: string, expenses: Expenses): Promise<MonthRecord[]> {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("month must be YYYY-MM");
  const rows = (await loadHistory()).filter((r) => r.month !== month);
  rows.push({ month, expenses });
  rows.sort((a, b) => a.month.localeCompare(b.month));
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(FILE, JSON.stringify(rows.slice(-36), null, 2));
  return rows;
}

export async function clearHistory() {
  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(FILE, "[]");
}
