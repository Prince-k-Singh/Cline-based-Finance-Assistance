import fs from "node:fs";
const chart = n => Array.from({ length: n }, (_, i) => `"var(--chart-${i + 1})"`).join(", ");
const edits = {
  "src/ui/components.tsx": [
    [/export const PALETTE = \[[^\]]*\];/, `export const PALETTE = [${chart(9)}];`],
  ],
  "src/ui/tabs/BudgetTab.tsx": [
    [/const CAT_COLORS = \[[^\]]*\];/, `const CAT_COLORS = [${chart(12)}];`],
    [/const BUFFER_COLOR = "[^"]*";/, `const BUFFER_COLOR = "var(--chart-other)";`],
    [`hint: "Dining out, shopping, travel, OTT", color: "var(--brand)"`, `hint: "Dining out, shopping, travel, OTT", color: "var(--chart-3)"`],
  ],
  "src/ui/tabs/InvestTab.tsx": [
    [/const CAT_COLORS = \[[^\]]*\];/, `const CAT_COLORS = [${chart(10)}];`],
  ],
  "src/ui/tabs/Overview.tsx": [
    [/const ALLOC_COLORS = \[[^\]]*\];/, `const ALLOC_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];`],
    [`background: ALLOC_COLORS[i % ALLOC_COLORS.length], color: "#fff"`, `background: ALLOC_COLORS[i % ALLOC_COLORS.length], color: "var(--on-brand)"`],
  ],
  "src/ui/Breakdown.tsx": [
    [/const OTHER_COLOR = "[^"]*";/, `const OTHER_COLOR = "var(--chart-other)";`],
  ],
  "src/ui/tabs/AskTab.tsx": [
    [`{ background: "var(--bad)", color: "#fff" }`, `{ background: "var(--bad)", color: "var(--on-brand)", borderColor: "var(--bad)" }`],
  ],
  // Chart entry animations: 1000ms -> 200ms (subtle, per brief)
  "src/ui/tabs/CheckInTab.tsx": [[/animationDuration=\{1000\}/g, "animationDuration={200}"], [`fill="var(--warn)"`, `fill="var(--chart-3)"`]],
  "src/ui/tabs/EmergencyTab.tsx": [[/animationDuration=\{1000\}/g, "animationDuration={200}"]],
  "src/ui/tabs/InvestTab.tsx#2": [[/animationDuration=\{1000\}/g, "animationDuration={200}"]],
};
const log = [];
for (const [key, list] of Object.entries(edits)) {
  const f = key.split("#")[0];
  let s = fs.readFileSync(f, "utf8");
  for (const [from, to] of list) {
    const before = s;
    s = typeof from === "string" ? s.split(from).join(to) : s.replace(from, to);
    log.push(`${f}: ${before === s ? "NO MATCH" : "ok"} ${String(from).slice(0, 60)}`);
  }
  fs.writeFileSync(f, s);
}
fs.writeFileSync("scripts/_tsx.log", log.join("\n"));
