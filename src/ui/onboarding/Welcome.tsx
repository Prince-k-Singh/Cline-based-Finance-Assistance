import { useState, type ReactNode } from "react";
import type { Household } from "../../engine";


type Props = {
  h: Household;
  set: (h: Household) => void;
  onNext: () => void;
  onBack: () => void;
  themeBtn: ReactNode;
};

export default function Welcome({ h, set, onNext, onBack, themeBtn }: Props) {
  const [touched, setTouched] = useState(false);
  const up = <K extends keyof Household>(k: K, v: Household[K]) => set({ ...h, [k]: v });
  const nameOk = (h.name ?? "").trim().length >= 2;
  const ageOk = h.age >= 18 && h.age <= 80;

  const next = () => {
    setTouched(true);
    if (nameOk && ageOk) onNext();
  };

  return (
    <div className="welcome-page">
      {/* Fixed header */}
      <header className="welcome-header">
        <button type="button" className="welcome-back-btn" onClick={onBack}>
          ← Back
        </button>
        <div className="welcome-brand">
          <span className="welcome-logo">₹</span>
          <b>Prospera</b>
        </div>
        <div className="welcome-header-right">
          {themeBtn}
        </div>
      </header>

      <div className="welcome-split">
        {/* Left side: Hero with background */}
        <div className="welcome-hero">
          <div className="welcome-hero-overlay">
            <span className="welcome-eyebrow">FOR INDIAN HOUSEHOLDS</span>
            <h1 className="welcome-title">
              Plan today for a<br />
              <span className="welcome-title-highlight">more secure tomorrow.</span>
            </h1>
            <p className="welcome-subtitle">
              A simple and private way to plan your family's budget, emergency fund, lifestyle goals and investments.
            </p>
            <div className="welcome-features">
              <div className="welcome-feature">
                <span className="welcome-feature-icon">📊</span>
                <div>
                  <strong>Takes about</strong>
                  <div>5 minutes</div>
                </div>
              </div>
              <div className="welcome-feature">
                <span className="welcome-feature-icon">🛡️</span>
                <div>
                  <strong>Calculations run</strong>
                  <div>on your device</div>
                </div>
              </div>
              <div className="welcome-feature">
                <span className="welcome-feature-icon">🗣️</span>
                <div>
                  <strong>Explanations in</strong>
                  <div>Hindi and other<br />Indian languages</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Form card */}
        <div className="welcome-form-container">
          <form className="welcome-form-card" onSubmit={(e) => { e.preventDefault(); next(); }}>
            <h2 className="welcome-form-title">Let's start with you</h2>
            <p className="welcome-form-subtitle">A few basics so the plan fits your family.</p>

            <label className="welcome-field">
              <span className="welcome-label">Your name</span>
              <input 
                autoFocus 
                placeholder="e.g. Rohit Sharma" 
                value={h.name ?? ""} 
                onChange={(e) => up("name", e.target.value)} 
                className="welcome-input"
              />
              {touched && !nameOk && <span className="bad">Please enter your name</span>}
            </label>

            <label className="welcome-field">
              <span className="welcome-label">Your age</span>
              <input 
                type="number" 
                min={18} 
                max={80} 
                placeholder="34"
                value={h.age || ""} 
                onChange={(e) => up("age", Number(e.target.value) || 0)} 
                className="welcome-input"
              />
              {touched && !ageOk && <span className="bad">Age must be 18–80</span>}
            </label>

            <label className="welcome-field">
              <span className="welcome-label">Main earner's job</span>
              <select 
                value={h.jobType} 
                onChange={(e) => up("jobType", e.target.value as Household["jobType"])}
                className="welcome-select"
              >
                <option value="government">Government / PSU</option>
                <option value="private">Salaried (private sector)</option>
                <option value="self_employed">Self-employed / business</option>
              </select>
            </label>

            <label className="welcome-field">
              <span className="welcome-label">Monthly take-home income (₹)</span>
              <input 
                type="text"
                placeholder="e.g. 1,20,000" 
                value={h.netMonthlyIncome ? h.netMonthlyIncome.toLocaleString("en-IN") : ""}
                onChange={(e) => {
                  const val = e.target.value.replace(/,/g, "");
                  up("netMonthlyIncome", Number(val) || 0);
                }}
                className="welcome-input"
              />
            </label>

            <label className="welcome-field">
              <span className="welcome-label">Number of earners in family</span>
              <select 
                value={h.earners} 
                onChange={(e) => up("earners", Number(e.target.value) as 1 | 2)}
                className="welcome-select"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </label>

            <label className="welcome-field">
              <span className="welcome-label">Number of dependents</span>
              <select 
                value={h.dependentParents + h.children} 
                onChange={(e) => {
                  const total = Number(e.target.value);
                  up("dependentParents", total);
                  up("children", 0);
                }}
                className="welcome-select"
              >
                {[0, 1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>

            <button className="welcome-continue-btn" type="submit">
              Continue
              <span className="welcome-arrow">→</span>
            </button>

            <p className="welcome-privacy">No account needed. Your data stays on your device.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
