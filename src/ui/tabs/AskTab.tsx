import { useEffect, useRef, useState } from "react";
import type { Household } from "../../engine";
import { api } from "../api";
import { Card } from "../components";
import Markdown from "../Markdown";

type Msg = { role: "user" | "assistant"; content: string; tools?: string[]; error?: boolean };

const SUGGESTIONS = [
  "Can we afford a ₹9 lakh car next year?",
  "Should I prepay my 10.5% personal loan or start a SIP?",
  "What if my wife quits her job and income drops to ₹80,000?",
  "Is my LIC endowment policy worth continuing?",
  "Kya main 9 lakh ki car le sakta hoon?",
];

const LANGS = [
  ["auto", "Same as my question", "en-IN"],
  ["English", "English", "en-IN"],
  ["Hindi", "हिन्दी", "hi-IN"],
  ["Bengali", "বাংলা", "bn-IN"],
  ["Assamese", "অসমীয়া", "as-IN"],
  ["Tamil", "தமிழ்", "ta-IN"],
  ["Telugu", "తెలుగు", "te-IN"],
  ["Marathi", "मराठी", "mr-IN"],
  ["Gujarati", "ગુજરાતી", "gu-IN"],
  ["Kannada", "ಕನ್ನಡ", "kn-IN"],
] as const;

type SpeechRec = { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void };
const getSpeech = (): (new () => SpeechRec) | null => {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => SpeechRec) | null;
};

export default function AskTab({ h, aiOn }: { h: Household; aiOn: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<string>("auto");
  const [listening, setListening] = useState(false);
  const rec = useRef<SpeechRec | null>(null);
  const Speech = getSpeech();

  const toggleMic = () => {
    if (!Speech) return;
    if (listening) { rec.current?.stop(); return; }
    const r = new Speech();
    r.lang = LANGS.find((l) => l[0] === lang)?.[2] ?? "en-IN";
    r.interimResults = false;
    r.onresult = (e) => setQ((prev) => `${prev} ${e.results[0][0].transcript}`.trim());
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    const history = msgs.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setQ("");
    setBusy(true);
    try {
      const r = await api.chat(h, question, history, lang === "auto" ? undefined : lang);
      setMsgs((m) => [...m, { role: "assistant", content: r.answer, tools: r.toolCalls.map((t) => t.tool) }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Ask Prospera: your money advisor" extra={<span className={`pill ${aiOn ? "on" : "off"}`}>{aiOn ? "AI on (Cline SDK)" : "AI off"}</span>}>
      {!aiOn && (
        <div className="flag">
          The AI server is not configured. Copy <code>.env.example</code> to <code>.env</code>, add an API key, and restart <code>npm run dev</code>. All other tabs work without it.
        </div>
      )}
      <p className="muted" style={{ marginTop: 0, fontSize: ".85rem" }}>
        Ask in English, Hindi or any Indian language. Every number in the answer comes from the same calculation tools as this page. The AI never makes up figures. Only your plan numbers are sent, never your name.
      </p>
      <div className="chat">
        <div className="msgs">
          {msgs.length === 0 && (
            <div className="row">
              {SUGGESTIONS.map((s) => <button key={s} className="btn" onClick={() => ask(s)} disabled={busy}>{s}</button>)}
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`msg ${m.role}`} style={m.error ? { borderColor: "var(--bad)", color: "var(--bad)" } : undefined}>
              {m.role === "assistant" && !m.error ? <Markdown text={m.content} /> : m.content}
              {m.tools && m.tools.length > 0 && <div className="tools">🔧 tools used: {m.tools.join(", ")}</div>}
            </div>
          ))}
          {busy && <div className="msg assistant muted">Thinking… (calling finance tools)</div>}
          <div ref={end} />
        </div>
        <form className="row" style={{ marginTop: ".5rem" }} onSubmit={(e) => { e.preventDefault(); ask(q); }}>
          <select style={{ width: 170 }} value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Reply language">
            {LANGS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <input style={{ flex: 1, minWidth: 200 }} placeholder="e.g. Can we afford a ₹9 lakh car next year?" value={q} onChange={(e) => setQ(e.target.value)} />
          {Speech && (
            <button type="button" className="btn" onClick={toggleMic} title="Speak your question" style={listening ? { background: "var(--bad)", color: "var(--on-brand)", borderColor: "var(--bad)" } : undefined}>
              {listening ? "■ Stop" : "🎤"}
            </button>
          )}
          <button className="btn primary" disabled={busy || !q.trim()}>Ask</button>
        </form>
      </div>
      <p className="muted" style={{ fontSize: ".72rem" }}>Educational guidance only, not advice from a SEBI-registered investment adviser.</p>
    </Card>
  );
}
