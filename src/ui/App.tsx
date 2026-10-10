import { useEffect, useMemo, useState } from "react";
import { buildPlan, EMPTY_HOUSEHOLD, SAMPLE_HOUSEHOLD, type Household } from "../engine";
import { api, loadHousehold, loadStage, resetAll, saveHousehold, saveStage, type Stage } from "./api";
import InputForm from "./InputForm";
import Landing from "./onboarding/Landing";
import Setup from "./onboarding/Setup";
import Welcome from "./onboarding/Welcome";
import { applyTheme, loadTheme, saveTheme, type Theme } from "./theme";
import AskTab from "./tabs/AskTab";
import BudgetTab from "./tabs/BudgetTab";
import CheckInTab from "./tabs/CheckInTab";
import EmergencyTab from "./tabs/EmergencyTab";
import InsightsTab from "./tabs/InsightsTab";
import InvestTab from "./tabs/InvestTab";
import LifestyleTab from "./tabs/LifestyleTab";
import Overview from "./tabs/Overview";
import StatementTab from "./tabs/StatementTab";

const TABS = [
  ["form", "Your details"],
  ["statement", "Import statement"],
  ["overview", "Overview"],
  ["budget", "Budget"],
  ["emergency", "Emergency fund"],
  ["lifestyle", "Lifestyle fund"],
  ["invest", "Investments"],
  ["insights", "Live insights 🌍"],
  ["ask", "Ask Prospera 💬"],
  ["checkin", "Monthly check-in"],
] as const;
type Tab = (typeof TABS)[number][0];
/** These two live as quick-action buttons in the header instead of the tab strip. */
const HEADER_TABS = new Set<Tab>(["statement", "ask"]);
const NAV_TABS = TABS.filter(([id]) => !HEADER_TABS.has(id));

/** Document with an upward arrow: "import a bank statement". */
const ImportIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M12 18v-6" />
    <path d="M9.5 14.5 12 12l2.5 2.5" />
  </svg>
);
/** Speech bubble for the AI chat. */
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" strokeWidth="2.6" />
  </svg>
);

export default function App() {
  const [stage, setStage] = useState<Stage>(loadStage);
  const [h, setH] = useState<Household>(() => (loadStage() === "welcome" || loadStage() === "landing" ? structuredClone(EMPTY_HOUSEHOLD) : loadHousehold()));
  const [tab, setTab] = useState<Tab>("overview");
  const [aiOn, setAiOn] = useState(false);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  // All numbers are computed in the browser by the deterministic engine.
  const plan = useMemo(() => buildPlan(h), [h]);

  useEffect(() => { applyTheme(theme); saveTheme(theme); }, [theme]);

  useEffect(() => {
    saveHousehold(h);
  }, [h]);
  useEffect(() => {
    saveStage(stage);
  }, [stage]);
  // The API can take ~20s to boot in dev (tsx + SDK load), so keep checking until it answers.
  useEffect(() => {
    let stop = false, tries = 0, timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      const s = await api.health();
      if (stop) return;
      setAiOn(s.ai);
      if (!s.ok && ++tries < 40) timer = setTimeout(check, 3000);
    };
    void check();
    return () => { stop = true; clearTimeout(timer); };
  }, []);

  const startOver = () => {
    if (!confirm("Start over? This clears the details saved in this browser.")) return;
    resetAll();
    setH(structuredClone(EMPTY_HOUSEHOLD));
    setTab("overview");
    setStage("landing");
  };

  const openSample = () => { setH(structuredClone(SAMPLE_HOUSEHOLD)); setTab("overview"); setStage("app"); };
  // Every stage change starts at the top of the page.
  useEffect(() => { window.scrollTo(0, 0); }, [stage]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const themeBtn = (
    <button type="button" className="theme-toggle no-print" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title="Toggle dark / light mode">
      {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
    </button>
  );

  if (stage === "landing")
    return (
      <>
        <Landing themeBtn={themeBtn} onStart={() => setStage("welcome")} onSample={openSample} />
      </>
    );

  if (stage === "welcome")
    return (
      <>
        <div className="app">
          <div className="row no-print" style={{ justifyContent: "space-between", marginBottom: ".5rem" }}>
            <button type="button" className="btn" onClick={() => setStage("landing")}>← Back</button>
            {themeBtn}
          </div>
          <Welcome h={h} set={setH} onNext={() => setStage("setup")} onSample={openSample} />
        </div>
      </>
    );

  if (stage === "setup")
    return (
      <>
        <div className="app">
          <div className="row no-print" style={{ justifyContent: "flex-end", marginBottom: ".5rem" }}>{themeBtn}</div>
          <Setup h={h} set={setH} aiOn={aiOn} onBack={() => setStage("welcome")} onFinish={() => { setTab("overview"); setStage("app"); }} />
        </div>
      </>
    );

  return (
    <>
      <div className="app">
        <header className="top">
          <div className="brand">
            <div className="logo">₹</div>
            <div>
              <h1 style={{ fontSize: "1.3rem", margin: 0 }}>Prospera</h1>
              <small>{h.name ? `Namaste, ${h.name.split(" ")[0]}! Here's your family's money plan` : "One clear money plan for your family"}</small>
            </div>
          </div>
          <div className="row no-print">
            {themeBtn}
            <button className="btn" onClick={() => setStage("setup")}>Edit my details</button>
            <button className="btn" onClick={startOver}>Start over</button>
            <button type="button" className={`btn icon-btn${tab === "statement" ? " on" : ""}`} onClick={() => setTab("statement")}
              aria-label="Import statement" title="Import statement" aria-current={tab === "statement" ? "page" : undefined}>
              <ImportIcon />
            </button>
            <button type="button" className={`btn ask-btn${tab === "ask" ? " on" : ""}`} onClick={() => setTab("ask")}
              aria-current={tab === "ask" ? "page" : undefined}>
              <ChatIcon /><span>Ask Prospera</span>
            </button>
            <button className="btn primary" onClick={() => window.print()}>Print / PDF</button>
          </div>
        </header>

      <nav className="tabs" aria-label="Plan sections">
        {NAV_TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      <main>
        {tab === "form" && <InputForm h={h} set={setH} />}
        {tab === "statement" && <StatementTab h={h} set={setH} aiOn={aiOn} goToForm={() => setTab("form")} />}
        {tab === "overview" && <Overview plan={plan} income={h.netMonthlyIncome} />}
        {tab === "budget" && <BudgetTab plan={plan} />}
        {tab === "emergency" && <EmergencyTab plan={plan} />}
        {tab === "lifestyle" && <LifestyleTab plan={plan} h={h} />}
        {tab === "invest" && <InvestTab plan={plan} h={h} />}
        {tab === "insights" && <InsightsTab h={h} aiOn={aiOn} />}
        {tab === "ask" && <AskTab h={h} aiOn={aiOn} />}
        {tab === "checkin" && <CheckInTab h={h} />}
      </main>

      <p className="disclaimer">
        Prospera is an educational tool, not financial advice. All figures are estimates from transparent assumptions (last reviewed {plan.assumptionsReviewed});
        returns are not guaranteed. Calculations run in your browser and your data stays on this device unless you use the AI features.
      </p>
    </div>
    </>
  );
}
