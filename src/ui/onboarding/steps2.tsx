import { ASSETS, HOLDING_TYPES, inr, type Household } from "../../engine";
import { NumField } from "../components";
import ListEditor from "../ListEditor";

type StepProps = { h: Household; set: (h: Household) => void };

export function SavingsStep({ h, set }: StepProps) {
  const up = <K extends keyof Household>(k: K, v: Household[K]) => set({ ...h, [k]: v });
  const total = HOLDING_TYPES.reduce((a, t) => a + h.holdings[t], 0);
  return (
    <>
      <h3>What you already have</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: ".8rem" }}>Today's approximate value. Leave 0 if you don't have it.</p>
      <div className="grid g3">
        {HOLDING_TYPES.map((t) => (
          <NumField key={t} label={ASSETS[t].label} value={h.holdings[t]} step={10000} onChange={(n) => up("holdings", { ...h.holdings, [t]: n })} />
        ))}
      </div>
      <p className="muted" style={{ fontSize: ".85rem" }}>Total: <strong>{inr(total)}</strong></p>
      <h3 style={{ marginTop: "1rem" }}>Insurance</h3>
      <div className="grid g3">
        <label className="f">Family health insurance?
          <select value={h.hasHealthInsurance ? "y" : "n"} onChange={(e) => up("hasHealthInsurance", e.target.value === "y")}>
            <option value="y">Yes</option><option value="n">No</option>
          </select>
        </label>
        {h.hasHealthInsurance && <NumField label="Health cover amount" suffix="₹" value={h.healthCover} step={100000} onChange={(n) => up("healthCover", n)} />}
        <NumField label="Term life cover (0 if none)" suffix="₹" value={h.termCover} step={500000} onChange={(n) => up("termCover", n)} />
      </div>
    </>
  );
}

export function GoalsStep({ h, set }: StepProps) {
  const up = <K extends keyof Household>(k: K, v: Household[K]) => set({ ...h, [k]: v });
  return (
    <>
      <h3>Loans you are paying</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: ".8rem" }}>Home, car, personal or education loans. Helps us spot costly debt.</p>
      <ListEditor
        rows={h.loans}
        empty={{ name: "Car loan", outstanding: 0, ratePct: 10, emi: 0 }}
        onChange={(loans) => up("loans", loans)}
        cols={[{ key: "name", label: "Loan", type: "text" }, { key: "outstanding", label: "Outstanding ₹" }, { key: "ratePct", label: "Interest %" }, { key: "emi", label: "EMI ₹" }]}
      />
      <h3 style={{ marginTop: "1.25rem" }}>Things you want to buy in the next few years</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: ".8rem" }}>A car, sofa, laptop, family trip… so you pay from savings instead of a loan.</p>
      <ListEditor
        rows={h.goals}
        empty={{ id: "", name: "Family holiday", costToday: 80000, years: 1 }}
        onChange={(goals) => up("goals", goals.map((g, i) => ({ ...g, id: g.id || `g${Date.now()}${i}` })))}
        cols={[{ key: "name", label: "Goal", type: "text" }, { key: "costToday", label: "Price today ₹" }, { key: "years", label: "In how many years" }]}
      />
    </>
  );
}
