import { useState } from "react";
import { CATEGORY_META, EXPENSE_CATEGORIES, inr, parseStatement, summariseStatement, type Household } from "../../engine";
import { api } from "../api";
import { Card, NumField } from "../components";
import type { StatementResponse } from "../types";

const EXAMPLE = `Date,Description,Debit,Credit
01/09/2026,SALARY CREDIT ACME LTD,,120000
02/09/2026,UPI-NOBROKER RENT,26000,
03/09/2026,UPI-SWIGGY,450,
05/09/2026,UPI-BIGBASKET,3200,
08/09/2026,BESCOM ELECTRICITY,1800,
10/09/2026,UPI-SWIGGY,620,
11/09/2026,AIRTEL POSTPAID,799,
12/09/2026,NETFLIX.COM,649,
14/09/2026,UBER INDIA,340,
15/09/2026,UPI-RAMESH KUMAR,3000,
18/09/2026,AMAZON PAY,2450,
20/09/2026,SIP GROWW,8000,
25/09/2026,CAR LOAN EMI HDFC,14000,`;

export default function StatementTab({ h, set, aiOn, goToForm }: { h: Household; set: (h: Household) => void; aiOn: boolean; goToForm: () => void }) {
  const [text, setText] = useState("");
  const [months, setMonths] = useState(1);
  const [res, setRes] = useState<StatementResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    setBusy(true); setErr("");
    try {
      setRes(await api.statement(text, months));
    } catch (e) {
      // Offline fallback: rule-based parsing runs fully in the browser.
      const transactions = parseStatement(text);
      setRes({ transactions, summary: summariseStatement(transactions, months), aiUsed: false });
      setErr(`Server unavailable (${(e as Error).message}); used in-browser rules.`);
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!res) return;
    const s = res.summary;
    const expenses = { ...h.expenses };
    EXPENSE_CATEGORIES.forEach((c) => { if (s.expenses[c] > 0) expenses[c] = s.expenses[c]; });
    set({ ...h, expenses, netMonthlyIncome: s.monthlyIncome || h.netMonthlyIncome, monthlyInvesting: s.monthlyInvesting || h.monthlyInvesting });
    goToForm();
  };

  return (
    <div className="grid g2">
      <Card title="Paste a bank / UPI / card statement" extra={<span className={`pill ${aiOn ? "on" : "off"}`}>{aiOn ? "AI categoriser on" : "Rules only"}</span>}>
        <p className="muted" style={{ marginTop: 0, fontSize: ".85rem" }}>CSV or copied text with date, description and amount columns. Nothing is stored. You review the numbers before anything is used.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Date,Description,Debit,Credit…" />
        <div className="row" style={{ marginTop: ".5rem" }}>
          <div style={{ width: 160 }}><NumField label="Months covered" value={months} step={1} onChange={(n) => setMonths(Math.max(1, n))} /></div>
          <button className="btn" onClick={() => setText(EXAMPLE)}>Load example</button>
          <button className="btn primary" disabled={!text.trim() || busy} onClick={run}>{busy ? "Categorising…" : "Categorise"}</button>
        </div>
        {err && <div className="flag">{err}</div>}
      </Card>

      {res && (
        <Card title="Monthly average found" extra={<button className="btn primary" onClick={apply}>Use these numbers →</button>}>
          <div className="row muted" style={{ fontSize: ".85rem", marginBottom: ".5rem" }}>
            Income {inr(res.summary.monthlyIncome)} · Investing {inr(res.summary.monthlyInvesting)} · {res.aiUsed ? "AI-assisted" : "rule-based"}
          </div>
          <table>
            <tbody>
              {EXPENSE_CATEGORIES.filter((c) => res.summary.expenses[c] > 0).map((c) => (
                <tr key={c}><td>{CATEGORY_META[c].label}</td><td className="num">{inr(res.summary.expenses[c])}</td></tr>
              ))}
            </tbody>
          </table>
          {res.summary.unaccounted > 0 && (
            <div className="flag">
              Unaccounted: {inr(res.summary.unaccounted)}/month, e.g. {res.summary.unknownExamples.map((t) => `${t.description} (${inr(t.amount)})`).join(", ")}
            </div>
          )}
          {res.summary.recurring.length > 0 && <div className="flag info">Recurring: {res.summary.recurring.join(", ")}</div>}
        </Card>
      )}
    </div>
  );
}
