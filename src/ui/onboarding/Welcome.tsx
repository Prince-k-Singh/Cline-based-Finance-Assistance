import { useState } from "react";
import type { Household } from "../../engine";


type Props = {
  h: Household;
  set: (h: Household) => void;
  onNext: () => void;
  onSample: () => void;
};

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" className={`chip ${active ? "active" : ""}`} onClick={onClick}>{children}</button>
);

const Counter = ({ label, value, min = 0, max = 6, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (n: number) => void }) => (
  <div className="counter">
    <span>{label}</span>
    <div className="row" style={{ gap: ".35rem" }}>
      <button type="button" className="btn" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`fewer ${label}`}>−</button>
      <strong style={{ minWidth: 20, textAlign: "center" }}>{value}</strong>
      <button type="button" className="btn" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`more ${label}`}>+</button>
    </div>
  </div>
);

export default function Welcome({ h, set, onNext, onSample }: Props) {
  const [touched, setTouched] = useState(false);
  const up = <K extends keyof Household>(k: K, v: Household[K]) => set({ ...h, [k]: v });
  const nameOk = (h.name ?? "").trim().length >= 2;
  const ageOk = h.age >= 18 && h.age <= 80;

  const next = () => {
    setTouched(true);
    if (nameOk && ageOk) onNext();
  };

  return (
    <div className="onb-wrap">
      <div className="onb-content">
        <div className="onb-intro">
          <div className="logo brand-rupee">₹</div>
          <h1>Prospera</h1>
          <p>One clear money plan for your family: budget, emergency fund, lifestyle goals and smarter investments, built for Indian households.</p>
          <ul className="hero-points">
            <li><span className="pt-ic" aria-hidden="true">✓</span>Takes about 5 minutes</li>
            <li><span className="pt-ic" aria-hidden="true">✓</span>Calculations run on your device; nothing is sent unless you use the AI chat</li>
            <li><span className="pt-ic" aria-hidden="true">✓</span>Explanations in Hindi and other Indian languages</li>
          </ul>
        </div>

        <form className="card onb-card" onSubmit={(e) => { e.preventDefault(); next(); }}>
          <h2>Let's start with you</h2>
          <p className="muted" style={{ marginTop: 0 }}>A few basics so the plan fits your family.</p>

          <label className="f">Your name
            <input autoFocus placeholder="e.g. Rohit Sharma" value={h.name ?? ""} onChange={(e) => up("name", e.target.value)} />
            {touched && !nameOk && <span className="bad">Please enter your name</span>}
          </label>

          <div className="grid g2" style={{ gap: ".75rem", marginTop: ".75rem" }}>
            <label className="f">Your age
              <input type="number" min={18} max={80} value={h.age || ""} onChange={(e) => up("age", Number(e.target.value) || 0)} />
              {touched && !ageOk && <span className="bad">Age must be 18–80</span>}
            </label>
            <label className="f">Main earner's job
              <select value={h.jobType} onChange={(e) => up("jobType", e.target.value as Household["jobType"])}>
                <option value="government">Government / PSU</option>
                <option value="private">Private sector</option>
                <option value="self_employed">Self-employed / business</option>
              </select>
            </label>
          </div>

          <div className="f" style={{ marginTop: ".9rem" }}>Where do you live?</div>
          <div className="row" style={{ marginTop: ".3rem" }}>
            <Chip active={h.cityTier === "metro"} onClick={() => up("cityTier", "metro")}>🏙 Metro</Chip>
            <Chip active={h.cityTier === "large"} onClick={() => up("cityTier", "large")}>🏢 Large city</Chip>
            <Chip active={h.cityTier === "small"} onClick={() => up("cityTier", "small")}>🏡 Smaller city / town</Chip>
          </div>

          <div className="f" style={{ marginTop: ".9rem" }}>How many people earn in your home?</div>
          <div className="row" style={{ marginTop: ".3rem" }}>
            <Chip active={h.earners === 1} onClick={() => up("earners", 1)}>👤 Just one</Chip>
            <Chip active={h.earners === 2} onClick={() => up("earners", 2)}>👥 Two</Chip>
          </div>

          <div className="f" style={{ marginTop: ".9rem" }}>Your family</div>
          <div className="counters">
            <Counter label="Adults" value={h.adults} min={1} max={4} onChange={(n) => up("adults", n)} />
            <Counter label="Children" value={h.children} onChange={(n) => up("children", n)} />
            <Counter label="Dependent parents" value={h.dependentParents} max={4} onChange={(n) => up("dependentParents", n)} />
          </div>

          <button className="btn primary big" type="submit" style={{ marginTop: "1.25rem", width: "100%" }}>Start my plan →</button>
          <button type="button" className="linkbtn" onClick={onSample}>or explore with a sample family</button>
        </form>
      </div>
    </div>
  );
}
