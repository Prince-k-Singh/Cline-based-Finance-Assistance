import { lakh, type Plan } from "../../engine";
import { Card, Progress, Stat } from "../components";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";

export default function EmergencyTab({ plan }: { plan: Plan }) {
  const e = plan.emergency;
  const pct = Math.min(100, Math.round((e.existing / Math.max(1, e.target)) * 100));

  // Generate projection data points
  const projData = [];
  let currentAmount = e.existing;
  let months = 0;
  
  if (e.target > 0) {
    projData.push({ month: 0, Amount: currentAmount, Target: e.target });
    if (e.monthlyContribution > 0) {
      while (currentAmount < e.target && months < 36) { // cap at 3 years for display
        months++;
        currentAmount += e.monthlyContribution;
        projData.push({ 
          month: months, 
          Amount: Math.min(currentAmount, e.target), // don't overshoot target line in chart
          Target: e.target 
        });
      }
    }
  }

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="metrics">
        <Stat label="Months of cover needed" value={e.months} sub={e.reasons.join(" · ")} />
        <Stat label="Target" value={lakh(e.target)} sub={`${e.months} × bare-minimum ${lakh(e.monthlyBase)}`} />
        <Stat label="You have" value={lakh(e.existing)} sub="Cash + FDs + debt funds" />
        <Stat label="Gap" value={lakh(e.gap)} tone={e.gap ? "warn" : "good"}
          sub={e.gap === 0 ? "Fully funded" : e.monthsToFill === null ? "No surplus to fill it yet" : `${e.monthsToFill} months at ${lakh(e.monthlyContribution)}/mo (incl. half the bonus)`} />
      </div>

      <div className="grid g2">
        <Card title={`Funded: ${pct}%`}>
          <Progress pct={pct} color={pct >= 100 ? "var(--good)" : "var(--warn)"} />
          
          {e.gap > 0 && e.monthlyContribution > 0 && projData.length > 1 && (
            <div style={{ height: 180, marginTop: '1.5rem', marginBottom: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--good)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--good)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="month" tickFormatter={(m) => `M${m}`} stroke="var(--muted)" fontSize={12} tickLine={false} />
                  <YAxis hide domain={[0, e.target * 1.1]} />
                  <Tooltip 
                    labelFormatter={(label) => `Month ${label}`}
                    formatter={(value: any) => [lakh(Number(value)), 'Amount']}
                    contentStyle={{ backgroundColor: 'var(--card-solid)', borderColor: 'var(--line)', borderRadius: '8px' }}
                  />
                  <ReferenceLine y={e.target} stroke="var(--muted)" strokeDasharray="3 3" label={{ position: 'top', value: 'Target', fill: 'var(--muted)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="Amount" stroke="var(--good)" strokeWidth={2} fillOpacity={1} fill="url(#colorAmt)" animationDuration={200} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <h3 style={{ marginTop: "1rem" }}>How to hold it</h3>
          <ul className="clean">
            <li><strong>{lakh(e.holding.savingsAccount)}</strong> (one month) in a savings account for instant access.</li>
            <li><strong>{lakh(e.holding.liquidOrFd)}</strong> in a liquid fund or laddered FDs.</li>
          </ul>
        </Card>

        <Card title="Insurance check">
          <table>
            <thead><tr><th>Cover</th><th className="num">Have</th><th className="num">Recommended</th><th className="num">Gap</th></tr></thead>
            <tbody>
              <tr><td>Term life (~12× annual income)</td><td className="num">{lakh(e.insurance.termHave)}</td><td className="num">{lakh(e.insurance.termRecommended)}</td><td className={`num ${e.insurance.termGap ? "bad" : "good"}`}>{e.insurance.termGap ? lakh(e.insurance.termGap) : "OK"}</td></tr>
              <tr><td>Family health</td><td className="num">{lakh(e.insurance.healthHave)}</td><td className="num">{lakh(e.insurance.healthRecommended)}</td><td className={`num ${e.insurance.healthGap ? "bad" : "good"}`}>{e.insurance.healthGap ? lakh(e.insurance.healthGap) : "OK"}</td></tr>
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: ".8rem" }}>Insurance protects the emergency fund: one hospital bill can wipe it out.</p>
        </Card>
      </div>

      <Card title="Job-loss runway">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>If income stops…</th><th className="num">Monthly spend</th><th className="num">Savings last</th></tr></thead>
            <tbody>
              {e.runway.map((r) => (
                <tr key={r.scenario}>
                  <td>{r.scenario}</td>
                  <td className="num">{lakh(r.monthlySpend)}</td>
                  <td className="num">{r.months === null ? "Indefinitely" : `${r.months} months`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

