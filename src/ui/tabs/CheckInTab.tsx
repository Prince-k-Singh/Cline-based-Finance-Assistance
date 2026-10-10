import { useEffect, useState } from "react";
import { CATEGORY_META, compareMonth, EXPENSE_CATEGORIES, inr, lakh, type Household } from "../../engine";
import { api } from "../api";
import { Card, NumField } from "../components";
import type { CheckInRecord } from "../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function CheckInTab({ h }: { h: Household }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [actual, setActual] = useState({ ...h.expenses });
  const [saved, setSaved] = useState(0);
  const [result, setResult] = useState<CheckInRecord | null>(null);
  const [history, setHistory] = useState<CheckInRecord[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.checkins().then(setHistory).catch(() => setHistory([])); }, []);

  const run = async () => {
    setBusy(true);
    try {
      const r = await api.checkin(h, actual, month, saved);
      setResult(r);
      setHistory((x) => [r, ...x.filter((y) => y.month !== r.month)]);
    } catch {
      const c = compareMonth(h, actual, month, saved);
      setResult({ ...c, note: c.notes.join(" "), createdAt: new Date().toISOString() });
    } finally {
      setBusy(false);
    }
  };

  const chartData = history.slice(0, 12).reverse().map(c => ({
    month: c.month,
    Actual: c.totalActual,
    Planned: c.totalPlanned
  }));

  return (
    <div className="grid g2">
      <Card title="Monthly check-in: this month's actual spending">
        <div className="row" style={{ marginBottom: ".5rem" }}>
          <label className="f" style={{ width: 170 }}>Month<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
          <div style={{ width: 200 }}><NumField label="Added to emergency fund" suffix="₹" value={saved} onChange={setSaved} /></div>
        </div>
        <div className="grid g3">
          {EXPENSE_CATEGORIES.map((c) => (
            <NumField key={c} label={CATEGORY_META[c].label} value={actual[c]} onChange={(n) => setActual({ ...actual, [c]: n })} />
          ))}
        </div>
        <button className="btn primary" style={{ marginTop: ".75rem" }} disabled={busy} onClick={run}>{busy ? "Checking…" : "Run check-in"}</button>
        <p className="muted" style={{ fontSize: ".75rem" }}>The server also runs this automatically on the 1st of each month for the last family checked in.</p>
      </Card>
      
      <div className="grid" style={{ gap: "1rem", alignContent: "start" }}>
        {result && (
          <Card title={`Check-in ${result.month}`}>
            <p>{result.note}</p>
            <p className="muted">Spent {inr(result.totalActual)} vs optimised plan {inr(result.totalPlanned)}</p>
            {result.overspends.map((o) => <div className="flag" key={o.category}>{o.category}: {inr(o.actual)} vs {inr(o.planned)} (+{o.pctOver}%)</div>)}
          </Card>
        )}
        
        <Card title="Spending History">
          {chartData.length === 0 ? <p className="muted">No history yet.</p> : (
            <div style={{ height: 300, marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} tickLine={false} />
                  <YAxis tickFormatter={(v) => lakh(v)} stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    formatter={(value: any) => [lakh(Number(value) || 0), '']}
                    contentStyle={{ backgroundColor: 'var(--card-solid)', borderColor: 'var(--line)', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="Actual" fill="var(--chart-3)" radius={[4, 4, 0, 0]} animationDuration={200} />
                  <Bar dataKey="Planned" fill="var(--brand-2)" radius={[4, 4, 0, 0]} animationDuration={200} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

