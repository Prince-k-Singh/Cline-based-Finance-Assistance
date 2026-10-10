import { compareMonth, parseStatement, SAMPLE_HOUSEHOLD, summariseStatement } from "../src/engine";

const CSV = `Date,Description,Debit,Credit
01/09/2026,SALARY CREDIT ACME LTD,,120000
02/09/2026,UPI-NOBROKER RENT,26000,
03/09/2026,UPI-SWIGGY,450,
05/09/2026,UPI-BIGBASKET,3200,
10/09/2026,UPI-SWIGGY,620,
12/09/2026,NETFLIX.COM,649,
15/09/2026,UPI-RAMESH KUMAR,3000,
20/09/2026,SIP GROWW,8000,`;

describe("statement parsing", () => {
  it("parses and categorises transactions", () => {
    const t = parseStatement(CSV);
    expect(t.length).toBe(8);
    const s = summariseStatement(t, 1);
    expect(s.monthlyIncome).toBe(120000);
    expect(s.expenses.housing).toBe(26000);
    expect(s.expenses.eatingOut).toBe(1070);
    expect(s.expenses.food).toBe(3200);
    expect(s.expenses.subscriptions).toBe(649);
    expect(s.monthlyInvesting).toBe(8000);
    expect(s.unaccounted).toBe(3000);
    expect(s.recurring.some((d) => /SWIGGY/.test(d))).toBe(true);
  });
});

describe("reply language detection", () => {
  it("detects English, Hinglish and Indian scripts", async () => {
    const { detectReplyLanguage } = await import("../server/advisor");
    expect(detectReplyLanguage("Can we afford a 9 lakh car next year?")).toMatch(/English/);
    expect(detectReplyLanguage("Kya main 9 lakh ki car le sakta hoon?")).toMatch(/Hinglish/);
    expect(detectReplyLanguage("क्या मैं कार ले सकता हूँ?")).toMatch(/Devanagari/);
    expect(detectReplyLanguage("আমি কি গাড়ি কিনতে পারি?")).toMatch(/Bengali/);
  });
});

describe("monthly check-in", () => {
  it("flags overspends vs the optimised plan", () => {
    const actual = { ...SAMPLE_HOUSEHOLD.expenses, eatingOut: 12000 };
    const c = compareMonth(SAMPLE_HOUSEHOLD, actual, "2026-10");
    expect(c.overspends[0].category).toMatch(/Eating out/);
    expect(c.notes[0]).toMatch(/up/);
  });
});
