import { CATEGORY_META, inr, type ExpenseCategory, type Household } from "../../engine";
import { NumField } from "../components";

export type StepProps = { h: Household; set: (h: Household) => void };
export const upd = (p: StepProps) => <K extends keyof Household>(k: K, v: Household[K]) => p.set({ ...p.h, [k]: v });
export { GoalsStep, SavingsStep } from "./steps2";

export function IncomeStep(p: StepProps) {
  const up = upd(p);
  const { h } = p;
  return (
    <>
      <div className="grid g2">
        <NumField label="Monthly take-home (after tax, whole family)" suffix="₹" value={h.netMonthlyIncome} step={1000} onChange={(n) => up("netMonthlyIncome", n)} />
        {h.earners === 2 && (
          <NumField label="Of which, main earner's take-home" suffix="₹" value={h.primaryEarnerIncome ?? 0} step={1000} onChange={(n) => up("primaryEarnerIncome", n)} />
        )}
        <NumField label="Yearly bonus / incentives" suffix="₹" value={h.annualBonus} step={5000} onChange={(n) => up("annualBonus", n)} />
        <NumField label="Already investing every month (SIP, RD, PPF…)" suffix="₹" value={h.monthlyInvesting} step={500} onChange={(n) => up("monthlyInvesting", n)} />
        <label className="f">Income-tax slab
          <select value={h.taxSlabPct} onChange={(e) => up("taxSlabPct", Number(e.target.value))}>
            {[0, 5, 10, 15, 20, 30].map((s) => <option key={s} value={s}>{s}%</option>)}
          </select>
        </label>
        <label className="f">How much risk are you comfortable with?
          <select value={h.riskAppetite} onChange={(e) => up("riskAppetite", e.target.value as Household["riskAppetite"])}>
            <option value="low">Low: I don't want to see big falls</option>
            <option value="medium">Medium: some ups and downs are OK</option>
            <option value="high">High: I'm investing for 10+ years</option>
          </select>
        </label>
      </div>
      {h.netMonthlyIncome === 0 && <p className="muted" style={{ fontSize: ".8rem" }}>Monthly take-home is required: it's the base of your whole plan.</p>}
    </>
  );
}

const GROUPS: { title: string; hint: string; cats: ExpenseCategory[] }[] = [
  { title: "Home & daily needs", hint: "Things you pay every month to run the house", cats: ["housing", "food", "utilities", "transport", "phoneInternet", "clothingHousehold", "domesticHelp"] },
  { title: "Fixed commitments", hint: "Hard to pause: fees, premiums, EMIs, medicines", cats: ["education", "healthcare", "insurance", "emis"] },
  { title: "Lifestyle & extras", hint: "Monthly average; for yearly costs divide by 12", cats: ["eatingOut", "entertainment", "shopping", "subscriptions", "travel", "festivals", "miscellaneous"] },
];

export function ExpensesStep(p: StepProps & { onImport: () => void }) {
  const { h } = p;
  const total = Object.values(h.expenses).reduce((a, b) => a + b, 0);
  const left = h.netMonthlyIncome - total;
  return (
    <>
      <div className="flag info row" style={{ justifyContent: "space-between" }}>
        <span>Don't know exact numbers? Paste a bank / UPI statement and we'll fill this in.</span>
        <button type="button" className="btn" onClick={p.onImport}>Import statement</button>
      </div>
      {GROUPS.map((g) => (
        <div key={g.title} style={{ marginTop: "1rem" }}>
          <h3 style={{ marginBottom: 0 }}>{g.title}</h3>
          <p className="muted" style={{ margin: "0 0 .5rem", fontSize: ".8rem" }}>{g.hint}</p>
          <div className="grid g3">
            {g.cats.map((c) => (
              <NumField key={c} label={CATEGORY_META[c].label} value={h.expenses[c]} onChange={(n) => p.set({ ...h, expenses: { ...h.expenses, [c]: n } })} />
            ))}
          </div>
        </div>
      ))}
      <div className="sticky-total">
        Total spending <strong>{inr(total)}</strong> / month
        {h.netMonthlyIncome > 0 && <span className={left < 0 ? "bad" : "good"}> · {left < 0 ? "overspending by" : "left over"} {inr(Math.abs(left))}</span>}
      </div>
    </>
  );
}
