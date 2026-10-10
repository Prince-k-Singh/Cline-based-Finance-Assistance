// Headless UI check: opens every tab, reports console errors / blank screens.
// Usage: node scripts/ui-check.mjs [--ask "question"]
import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const URL = process.env.URL ?? "http://localhost:5173";
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

await page.goto(URL);
// Go through the welcome page using the sample family
await page.evaluate(() => localStorage.clear());
await page.goto(URL);
await page.click("text=See a sample plan");
await page.waitForSelector("nav.tabs");
const tabs = await page.$$eval("nav.tabs button", (bs) => bs.map((b) => b.textContent));
for (const t of tabs) {
  errors.length = 0;
  await page.click(`nav.tabs button:has-text("${t.replace(/"/g, '\\"')}")`);
  await page.waitForTimeout(800);
  const len = await page.evaluate(() => document.querySelector("main")?.innerText.length ?? 0);
  console.log(`${len > 50 && errors.length === 0 ? "OK  " : "FAIL"} ${t} (text ${len})${errors.length ? "\n     " + errors.join("\n     ") : ""}`);
}

const qi = process.argv.indexOf("--ask");
if (qi > 0) {
  await page.click('button:has-text("Ask Prospera")');
  await page.fill('input[placeholder^="e.g."]', process.argv[qi + 1]);
  await page.click("form button.btn.primary");
  await page.waitForSelector(".msg.assistant:not(.muted)", { timeout: 120000 });
  const ans = await page.$$eval(".msg.assistant", (m) => m.map((x) => x.textContent).pop());
  console.log("ANSWER:\n" + ans);
  await page.screenshot({ path: "ask-parivar.png", fullPage: true });
}
await browser.close();
