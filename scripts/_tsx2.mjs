import fs from "node:fs";
const log = [];
const edit = (f, pairs) => {
  let s = fs.readFileSync(f, "utf8");
  for (const [from, to] of pairs) {
    const b = s;
    s = typeof from === "string" ? s.split(from).join(to) : s.replace(from, to);
    log.push(`${f}: ${b === s ? "NO MATCH" : "ok"} ${String(from).slice(0, 70)}`);
  }
  fs.writeFileSync(f, s);
};

// App: drop the animated canvas background; a solid page colour comes from CSS.
edit("src/ui/App.tsx", [
  [/import Ambient from "\.\/Ambient";\r?\n/, ""],
  [/[ \t]*<Ambient theme=\{theme\} \/>\r?\n/g, ""],
]);

// Welcome: remove the 3D dollar hero; the intro + form become the layout.
edit("src/ui/onboarding/Welcome.tsx", [
  [`import { useState, Suspense, lazy } from "react";`, `import { useState } from "react";`],
  [/\r?\nconst DollarHero = lazy\(\(\) => import\("\.\/DollarHero"\)\);\r?\n/, "\n"],
  [/[ \t]*<div className="onb-hero-scene">[\s\S]*?<\/Suspense>\r?\n[ \t]*<\/div>\r?\n\r?\n/, ""],
  [`<ul className="hero-points">
            <li>⏱ Takes about 5 minutes</li>
            <li>🔒 Calculations run on your device; nothing is sent unless you use the AI chat</li>
            <li>🗣 Explanations in Hindi and other Indian languages</li>
          </ul>`.replace(/\n/g, fs.readFileSync("src/ui/onboarding/Welcome.tsx", "utf8").includes("\r\n") ? "\r\n" : "\n"),
   `<ul className="hero-points">
            <li><span className="pt-ic" aria-hidden="true">✓</span>Takes about 5 minutes</li>
            <li><span className="pt-ic" aria-hidden="true">✓</span>Calculations run on your device; nothing is sent unless you use the AI chat</li>
            <li><span className="pt-ic" aria-hidden="true">✓</span>Explanations in Hindi and other Indian languages</li>
          </ul>`.replace(/\n/g, fs.readFileSync("src/ui/onboarding/Welcome.tsx", "utf8").includes("\r\n") ? "\r\n" : "\n")],
]);

// Landing: no gradient text, no pulse dot, no macOS dots, no floating stickers' emoji.
edit("src/ui/onboarding/Landing.tsx", [
  [`<i className="lp-pulse" />`, ""],
  [`<span className="lp-grad">Prepare</span>`, "Prepare"],
  [`<span className="lp-grad">Grow</span>`, "Grow"],
  [`<ul className="lp-trust"><li>⏱ 5 minutes</li><li>🔒 No bank login</li><li>🗣 9 languages</li></ul>`,
   `<ul className="lp-trust"><li>5 minutes</li><li>No bank login</li><li>9 languages</li></ul>`],
]);
edit("src/ui/onboarding/LandingParts.tsx", [
  [/[ \t]*<span className="lp-dots"><i \/><i \/><i \/><\/span>\r?\n/, ""],
  [`<div className="lp-float lp-float-1">🛡️ Health cover gap`, `<div className="lp-float lp-float-1">Health cover gap`],
  [`<div className="lp-float lp-float-2">✨ Save`, `<div className="lp-float lp-float-2">Save`],
]);
fs.writeFileSync("scripts/_tsx.log", log.join("\n"));
