import { useState } from "react";
import type { Household } from "../../engine";
import StatementTab from "../tabs/StatementTab";
import { ExpensesStep, GoalsStep, IncomeStep, SavingsStep } from "./steps";

const STEPS = [
  { id: "income", title: "Income", subtitle: "What comes in every month" },
  { id: "expenses", title: "Spending", subtitle: "Where the money goes" },
  { id: "savings", title: "Savings & insurance", subtitle: "What you already have" },
  { id: "goals", title: "Loans & goals", subtitle: "What you owe and what you want" },
] as const;

type Props = { h: Household; set: (h: Household) => void; aiOn: boolean; onBack: () => void; onFinish: () => void };

export default function Setup({ h, set, aiOn, onBack, onFinish }: Props) {
  const [i, setI] = useState(0);
  const [importing, setImporting] = useState(false);
  const step = STEPS[i];
  const first = (h.name ?? "").trim().split(/\s+/)[0] || "there";
  const canNext = step.id !== "income" || h.netMonthlyIncome > 0;

  const go = (d: number) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (i + d < 0) return onBack();
    if (i + d >= STEPS.length) return onFinish();
    setI(i + d);
  };

  return (
    <div className="setup">
      <div className="stepper">
        {STEPS.map((s, k) => (
          <button key={s.id} type="button" className={`step ${k === i ? "current" : ""} ${k < i ? "done" : ""}`} onClick={() => k <= i && setI(k)}>
            <span className="dot">{k < i ? "✓" : k + 1}</span>
            <span className="txt">{s.title}</span>
          </button>
        ))}
      </div>

      <div className="card onb-card wide">
        <p className="muted" style={{ margin: 0 }}>Hi {first} 👋 · Step {i + 1} of {STEPS.length}</p>
        <h2 style={{ marginTop: ".2rem" }}>{step.title}</h2>
        <p className="muted" style={{ marginTop: 0 }}>{step.subtitle}</p>

        {importing ? (
          <>
            <StatementTab h={h} set={set} aiOn={aiOn} goToForm={() => setImporting(false)} />
            <button type="button" className="btn" style={{ marginTop: ".75rem" }} onClick={() => setImporting(false)}>← Back to manual entry</button>
          </>
        ) : (
          <>
            {step.id === "income" && <IncomeStep h={h} set={set} />}
            {step.id === "expenses" && <ExpensesStep h={h} set={set} onImport={() => setImporting(true)} />}
            {step.id === "savings" && <SavingsStep h={h} set={set} />}
            {step.id === "goals" && <GoalsStep h={h} set={set} />}
          </>
        )}

        {!importing && (
          <div className="row" style={{ justifyContent: "space-between", marginTop: "1.5rem" }}>
            <button type="button" className="btn" onClick={() => go(-1)}>← Back</button>
            <div className="row">
              {i < STEPS.length - 1 && step.id !== "income" && <button type="button" className="linkbtn" onClick={() => go(1)}>Skip for now</button>}
              <button type="button" className="btn primary big" disabled={!canNext} onClick={() => go(1)}>
                {i === STEPS.length - 1 ? "See my plan →" : "Next →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
