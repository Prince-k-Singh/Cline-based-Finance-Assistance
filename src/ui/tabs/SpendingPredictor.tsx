import { useEffect, useState } from "react";
import { CATEGORY_META, EXPENSE_CATEGORIES, inr, type Household, type SpendingForecast } from "../../engine";
import { api } from "../api";
import { Card, NumField, Progress, Stat } from "../components";

const zero = () => Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, 0])) as Household["expenses"];

/** `embedded`: render without its own card/title (when placed inside a collapsible Section). */
export default function SpendingPredictor({ h, embedded }: { h: Household; embedded?: boolean }) {
  const today = new Date();
  const [month, setMonth] = useState(today.toISOString().slice(0, 7));
  const [day, setDay] = useState(today.getDate());
  const [spent, setSpent] = useState(zero);
  const [f, setF] = useState<SpendingForecast | null>(null);
  const [hist, setHist] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.history().then((r) => setHist(r.length)).catch(() => setHist(0)); }, []);

  const run = async () => {
    setBusy(true);
    try { setF(await api.forecast(h, spent, month, day)); } finally { setBusy(false); }
  };
  /** Demo helper: create 3 plausible past months around the family's typical spend. */
  const seedHistory = async () => {
    setBusy(true);
    try {
      const [y, m] = month.split("-").map(Number);
      for (let k = 3; k >= 1; k--) {
        const d = new Date(y, m - 1 - k, 1);
        const mm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const exp = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, Math.round(h.expenses[c] * (0.9 + ((k * 7 + c.length) % 5) * 0.05))])) as Household["expenses"];
        await api.saveHistory(mm, exp);
      }
      setHist((await api.history()).length);
    } finally { setBusy(false); }
  };

  const historyPill = <span className="pill">{hist} month(s) of history learned</span>;
  const body = (
    <>
      {embedded && <div style={{ marginBottom: ".6rem" }}>{historyPill}</div>}
      <p className="muted" style={{ marginTop: 0, fontSize: ".85rem" }}>
        Enter what you've spent so far this month. The engine learns your typical month (median + robust z-score) and projects month-end spending from your pace, so you're warned <em>before</em> you overspend. Completed check-ins are added to history automatically.
      </p>
      <div className="row" style={{ marginBottom: ".5rem" }}>
        <label className="f" style={{ width: 160 }}>Month<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
        <div style={{ width: 140 }}><NumField label="Today is day" value={day} step={1} onChange={(n) => setDay(Math.min(31, Math.max(1, n)))} /></div>
        {hist === 0 && <button className="btn" disabled={busy} onClick={seedHistory}>Add 3 demo months of history</button>}
      </div>
      <div className="grid g3">
        {EXPENSE_CATEGORIES.map((c) => <NumField key={c} label={CATEGORY_META[c].label} value={spent[c]} onChange={(n) => setSpent({ ...spent, [c]: n })} />)}
      </div>
      <button className="btn primary" style={{ marginTop: ".75rem" }} disabled={busy} onClick={run}>{busy ? "Predicting…" : "Predict month-end"}</button>

      {f && (
        <div style={{ marginTop: "1rem" }}>
          <div className="grid g3">
            <Stat label={`Spent by day ${f.dayOfMonth}`} value={inr(f.totalSpent)} sub={`${Math.round(f.elapsedShare * 100)}% of month gone`} />
            <Stat label="Projected month-end" value={inr(f.totalProjected)} tone={f.projectedSavingsShortfall > 0 ? "bad" : "good"} />
            <Stat label="Optimised plan" value={inr(f.totalBudget)} sub={f.projectedSavingsShortfall > 0 ? `${inr(f.projectedSavingsShortfall)} over` : "On track"} />
          </div>
          {f.alerts.map((a) => <div key={a} className="flag">{a}</div>)}
          {f.alerts.length === 0 && <div className="flag info">All categories on track. 🎉</div>}
          <table style={{ marginTop: ".5rem" }}>
            <thead><tr><th>Category</th><th className="num">Spent</th><th className="num">Typical</th><th className="num">Projected</th><th className="num">Budget</th><th>Pace</th></tr></thead>
            <tbody>
              {f.categories.filter((c) => c.spentSoFar > 0 || c.status !== "ok").map((c) => (
                <tr key={c.category}>
                  <td>{c.label}</td>
                  <td className="num">{inr(c.spentSoFar)}</td>
                  <td className="num">{c.baseline === null ? "–" : inr(c.baseline)}</td>
                  <td className={`num ${c.status === "over" ? "bad" : c.status === "watch" ? "warn" : ""}`}>{inr(c.projected)}</td>
                  <td className="num">{inr(c.budget)}</td>
                  <td style={{ width: 120 }}><Progress pct={c.budget ? (c.projected / c.budget) * 100 : 100} color={c.status === "over" ? "var(--bad)" : c.status === "watch" ? "var(--warn)" : "var(--good)"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
  return embedded ? body : <Card title="📈 Mid-month spending predictor" extra={historyPill}>{body}</Card>;
}
