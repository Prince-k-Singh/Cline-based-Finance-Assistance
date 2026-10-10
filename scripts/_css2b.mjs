import fs from "node:fs";
const f = "src/ui/styles.css";
let s = fs.readFileSync(f, "utf8");
const log = [];
const R = (from, to) => { const b = s; s = typeof from === "string" ? s.split(from).join(to) : s.replace(from, to); log.push(`${b === s ? "NO MATCH" : "ok"}  ${String(from).slice(0, 80)}`); };

R("background: var(--input-bg); color: var(--muted); padding: .5rem .9rem; border-radius: 99px; cursor: pointer; transition: all .2s var(--ease); min-height: 38px; }",
  "background: var(--card); color: var(--ink); font-weight: 600; padding: .5rem .9rem; border-radius: 99px; cursor: pointer; min-height: 38px; }");
R(".chip { font: inherit; border: 1px solid var(--line);", ".chip { font: inherit; border: 1px solid var(--line-strong);");
R(".chip:hover { border-color: var(--line-strong); color: var(--ink); }", ".chip:hover { background: var(--surface-hover); }");
R("border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--input-bg); }\r\n.counter .btn { padding: .2rem .65rem; }",
  "border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--card); }\r\n.counter .btn { padding: .2rem .65rem; min-height: 34px; min-width: 34px; }");
R("border: 0; background: none; color: var(--brand-2); cursor: pointer; font: inherit; text-decoration: underline; }", "border: 0; background: none; color: var(--brand); font-weight: 600; cursor: pointer; font: inherit; text-decoration: underline; }");
R(".linkbtn:hover { color: var(--brand); }", ".linkbtn:hover { color: var(--brand-hover); }");
R(".step.current .dot { background: var(--brand); color: #fff; }", ".step.current .dot { background: var(--brand); color: var(--on-brand); }");
R(".step.done .dot { background: var(--good); color: #fff; }", ".step.done .dot { background: var(--good); color: var(--on-brand); }");
R("label.f { font-size: .8rem; font-weight: 500; color: var(--muted); }", "label.f { font-size: .85rem; font-weight: 600; color: var(--ink); }");
R(`body { font-feature-settings: "cv11", "ss01"; text-rendering: optimizeLegibility; }`, "body { text-rendering: optimizeLegibility; }");
R(".acc-btn:hover { background: var(--input-bg); }", ".acc-btn:hover { background: var(--surface-hover); }");
R(".acc-btn:focus-visible { outline: 2px solid var(--brand-2);", ".acc-btn:focus-visible { outline: 2px solid var(--focus);");
R(".bt-saves li:hover { transform: translateY(-2px); border-color: var(--line-strong); border-top-color: var(--k); box-shadow: 0 8px 22px rgba(0, 0, 0, .12); }",
  ".bt-saves li:hover { border-color: var(--line-strong); border-top-color: var(--k); }");
R(/border-radius: 12px; background: var\(--input-bg\);\r?\n  transition: transform \.2s var\(--ease\), border-color \.2s var\(--ease\), box-shadow \.2s var\(--ease\);/, "border-radius: 12px; background: var(--card);\r\n  transition: border-color var(--transition-fast);");
R(".bt-range { position: relative; display: block; height: 8px; border-radius: 99px; background: var(--input-bg);", ".bt-range { position: relative; display: block; height: 8px; border-radius: 99px; background: var(--track);");
R(".seg button:focus-visible { outline: 2px solid var(--brand-2);", ".seg button:focus-visible { outline: 2px solid var(--focus);");
R("stroke-linecap: round; stroke-dasharray: 200; stroke-dashoffset: 200; }", "stroke-linecap: round; }");
R(/\r?\n  \.li-spark \.line \{ stroke-dashoffset: 0; \}/, "");
R(".li-img-ph.t-markets { background: linear-gradient(135deg, #0b7285, #1f3b73); }", ".li-img-ph.t-markets { background: #2F5D7C; }");
R(".li-img-ph.t-money { background: linear-gradient(135deg, #e87916, #b5446e); }", ".li-img-ph.t-money { background: #8A5A2B; }");
R(".li-img-ph.t-economy { background: linear-gradient(135deg, #2b8a3e, #0b7285); }", ".li-img-ph.t-economy { background: #0F5C46; }");
R(".li-card:hover { background: var(--input-bg); transform: translateY(-2px); }", ".li-card:hover { background: var(--surface-hover); }");
R(/\.li-card:hover img \{ transform: scale\(1\.04\); \}\r?\n/, "");
R(/\.li-lead-link:hover img \{ transform: scale\(1\.035\); \}\r?\n/, "");
R("opacity: 0; transition: opacity .3s var(--ease), transform .3s var(--ease); }", "opacity: 0; transition: opacity var(--transition-normal); }");
R(".li-related a:focus-visible { outline: 2px solid var(--brand-2);", ".li-related a:focus-visible { outline: 2px solid var(--focus);");
R("background: linear-gradient(180deg, var(--brand-2-soft), transparent 70%), var(--card); border: 1px solid var(--line);", "background: var(--card); border: 1px solid var(--line);");
R("nav.tabs, .no-print, header.top .row, .aurora {", "nav.tabs, .no-print, header.top .row, .page-bg {");
fs.writeFileSync(f, s);
fs.appendFileSync("scripts/_css2.log", "\n--- b ---\n" + log.join("\n"));
