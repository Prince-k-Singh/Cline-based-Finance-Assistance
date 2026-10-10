import { useMemo, type ReactNode } from "react";
import { buildPlan, SAMPLE_HOUSEHOLD } from "../../engine";
import { FEATURES, LANGS, STEPS, TRUST } from "./landingContent";
import { CountUp, HeroPreview, Reveal } from "./LandingParts";

type Props = { onStart: () => void; onSample: () => void; themeBtn: ReactNode };

export default function Landing({ onStart, onSample, themeBtn }: Props) {
  // Real engine output for the sample family powers the hero preview.
  const plan = useMemo(() => buildPlan(SAMPLE_HOUSEHOLD), []);
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-brand"><span className="logo">₹</span><b>Prospera</b></div>
        <nav className="lp-links" aria-label="Landing sections">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#trust">Why trust it</a>
        </nav>
        <div className="row lp-nav-actions">
          {themeBtn}
          <button type="button" className="btn primary" onClick={onStart}>Get started</button>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <Reveal><span className="lp-eyebrow">Built for Indian middle-class families</span></Reveal>
          <Reveal delay={80}>
            <h1 className="lp-title">Know what you can spend. Prepare for what's coming. Grow what matters.</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="lp-sub">Prospera turns your family's income, spending, savings and loans into one clear money plan, with an AI guide that explains it in your language.</p>
          </Reveal>
          <Reveal delay={240} className="lp-ctas">
            <button type="button" className="btn primary big lp-cta" onClick={onStart}>Start my free plan →</button>
            <button type="button" className="btn big" onClick={onSample}>See a sample plan</button>
          </Reveal>
          <Reveal delay={320}>
            <ul className="lp-trust"><li>5 minutes</li><li>No bank login</li><li>9 languages</li></ul>
          </Reveal>
        </div>
        <Reveal delay={200} className="lp-hero-visual"><HeroPreview plan={plan} /></Reveal>
      </section>

      <Reveal as="section" className="lp-stats">
        <div><strong><CountUp to={18} /></strong><span>spending categories</span></div>
        <div><strong><CountUp to={9} /></strong><span>Indian languages</span></div>
        <div><strong><CountUp to={10} /></strong><span>AI finance tools</span></div>
        <div><strong>0</strong><span>bank logins or OTPs</span></div>
      </Reveal>

      <section id="features" className="lp-section">
        <Reveal><p className="lp-kicker">Everything in one plan</p><h2 className="lp-h2">The money adviser most families never had</h2></Reveal>
        <div className="lp-features">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70} className="lp-feature">
              <span className="lp-ficon" aria-hidden="true">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="how" className="lp-section">
        <Reveal><p className="lp-kicker">How it works</p><h2 className="lp-h2">From scattered UPI spends to a clear plan</h2></Reveal>
        <div className="lp-steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 100} className="lp-step">
              <span className="lp-step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="lp-marquee" aria-label={`Available in ${LANGS.join(", ")}`}>
        <div className="lp-marquee-track" aria-hidden="true">
          {[...LANGS, ...LANGS].map((l, i) => <span key={i}>{l}</span>)}
        </div>
      </section>

      <section id="trust" className="lp-section lp-trust-grid">
        <Reveal className="lp-trust-copy">
          <p className="lp-kicker">Why trust it</p>
          <h2 className="lp-h2">The AI never invents a number</h2>
          <p className="lp-sub">Every rupee comes from tested calculations. Cline SDK agents only choose which calculation to run and explain the result, and you can see every tool they used.</p>
        </Reveal>
        <div className="lp-checks">
          {TRUST.map((t, i) => (
            <Reveal key={t} delay={i * 80} className="lp-check"><span aria-hidden="true">✓</span>{t}</Reveal>
          ))}
        </div>
      </section>

      <Reveal as="section" className="lp-final">
        <h2 className="lp-h2">Your family's money plan is 5 minutes away</h2>
        <p className="lp-sub">Start with a few basics about your family. You can change anything later.</p>
        <button type="button" className="btn primary big lp-cta" onClick={onStart}>Start my free plan →</button>
      </Reveal>

      <footer className="lp-foot">
        <span>© Prospera</span>
        <span>An educational planning tool, not financial advice. Returns are assumptions, not promises.</span>
      </footer>
    </div>
  );
}
