import { useState } from "react";
import { lakh, vehicleAffordability, type Household, type Plan } from "../../engine";
import { Card, NumField, Progress } from "../components";

export default function LifestyleTab({ plan, h }: { plan: Plan; h: Household }) {
  const l = plan.lifestyle;
  const [price, setPrice] = useState(900000);
  const v = vehicleAffordability(h, price, Math.max(0, l.affordable));
  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <Card title="Lifestyle (sinking) fund" extra={<span className="pill">{lakh(l.affordable)}/mo affordable</span>}>
        {l.suggestion && <div className="flag info">{l.suggestion}</div>}
        {l.goals.length > 0 && (
          <>
            <table>
              <thead><tr><th>Goal</th><th className="num">Price today</th><th className="num">Years</th><th className="num">Future cost</th><th>Where to park</th><th className="num">Monthly</th></tr></thead>
              <tbody>
                {l.goals.map((g) => (
                  <tr key={g.id}>
                    <td>{g.name}</td><td className="num">{lakh(g.costToday)}</td><td className="num">{g.years}</td>
                    <td className="num">{lakh(g.futureCost)}</td><td>{g.vehicle} <span className="muted">(~{g.expectedReturnPct}%)</span></td>
                    <td className="num">{lakh(g.monthlyNeeded)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={5}>Total needed</td><td className="num">{lakh(l.totalNeeded)}</td></tr></tfoot>
            </table>
            <div style={{ marginTop: ".75rem" }}><Progress pct={l.fundedPct} color={l.fundedPct >= 100 ? "var(--good)" : "var(--warn)"} /></div>
            <div className="muted" style={{ fontSize: ".8rem" }}>{l.fundedPct}% funded at the affordable amount. Prices inflated at 6% a year.</div>
          </>
        )}
      </Card>

      <div className="grid g2">
        <Card title="What the lifestyle fund can buy">
          <table>
            <thead><tr><th>Item</th><th className="num">Cost</th><th className="num">Time to save</th></tr></thead>
            <tbody>
              {l.canBuy.map((c) => (
                <tr key={c.item}><td>{c.item}</td><td className="num">{lakh(c.cost)}</td><td className="num">{c.months === null ? "–" : c.months <= 12 ? `${c.months} mo` : `${(c.months / 12).toFixed(1)} yrs`}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Vehicle affordability (20/4/10 rule)">
          <NumField label="On-road price" suffix="₹" value={price} step={50000} onChange={setPrice} />
          <div className={`flag ${v.affordable ? "info" : ""}`} style={{ marginTop: ".75rem" }}>
            <strong>{v.affordable ? "✔ Affordable" : "✖ Over budget"}</strong>: monthly cost {lakh(v.totalMonthly)} vs limit {lakh(v.limit)}
          </div>
          <ul className="clean">{v.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          <p className="muted" style={{ fontSize: ".8rem" }}>
            Saving the down payment at {lakh(l.affordable)}/mo takes {v.monthsToSaveDown === null ? "– (no surplus)" : `${v.monthsToSaveDown} months`}.
          </p>
        </Card>
      </div>
    </div>
  );
}

