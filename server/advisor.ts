import type { Household } from "../src/engine";
import { makeAgent, type LlmConfig } from "./llm";
import { createFinanceTools, type ToolLogEntry } from "./tools";

export const ADVISOR_SYSTEM_PROMPT = `You are "Ask Prospera", a friendly money guide for an Indian middle-class family.

Hard rules:
1. NEVER invent or compute numbers yourself. Every rupee amount, percentage, month count or return you mention MUST come from a tool result in this conversation. If no tool gives the number, say you don't know.
2. Call get_plan first if you have not seen the plan yet. Use recompute_budget / emergency_fund_target with "changes" for what-if questions, vehicle_affordability for vehicle purchases, goal_planner for new goals, prepay_vs_invest for loans, portfolio_compare for investments, market_impact for anything about current markets / inflation / gold / timing (it has LIVE data), spending_forecast when the family shares spending so far this month, get_assumptions when asked why.
3. State the key assumption behind a number (e.g. "assuming 6% inflation").
4. Do not name specific mutual-fund schemes, stocks or insurers. Talk in categories (index fund, liquid fund, term plan).
5. Never promise returns; mention risk alongside any return.
6. You are not a SEBI-registered adviser; say so briefly when giving investment direction.
7. Reply in the same language and script the user writes in (Hindi, Hinglish, Bengali, Tamil, Telugu, Marathi, Assamese, etc.). Keep numbers in Indian format (₹1,20,000 / ₹1.2 L).
8. Be short and practical: at most ~150 words, bullet points welcome.
9. Never mention tool or function names (like get_plan or goal_planner) to the family. Just use the tools yourself and give the answer.
10. If income is 0 or missing, ask the family to fill in "Your details" first instead of guessing.`;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const SCRIPTS: [RegExp, string][] = [
  [/[\u0980-\u09FF]/, "Bengali/Assamese (Bengali script)"],
  [/[\u0B80-\u0BFF]/, "Tamil"],
  [/[\u0C00-\u0C7F]/, "Telugu"],
  [/[\u0C80-\u0CFF]/, "Kannada"],
  [/[\u0A80-\u0AFF]/, "Gujarati"],
  [/[\u0900-\u097F]/, "Hindi/Marathi (Devanagari)"],
];
const HINGLISH = /\b(kya|kaise|kitna|kitne|hai|hain|hoon|main|mera|meri|humara|lena|sakta|sakti|chahiye|paisa|nahi|karna|karu|bachat)\b/i;

/** Pick the reply language from the question itself (the model alone tends to drift to Hindi). */
export function detectReplyLanguage(q: string): string {
  for (const [re, name] of SCRIPTS) if (re.test(q)) return `Reply in ${name}, matching the user's script.`;
  if (HINGLISH.test(q)) return "The user wrote in Hinglish (Hindi in Latin letters). Reply in simple Hinglish using Latin letters.";
  return "The user wrote in English. Reply in clear, simple English only.";
}

const ALLOWED_LANGS = ["English", "Hindi", "Bengali", "Assamese", "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada"];

export async function askProspera(cfg: LlmConfig, household: Household, history: ChatTurn[], question: string, language?: string) {
  const log: ToolLogEntry[] = [];
  const agent = makeAgent(cfg, { systemPrompt: ADVISOR_SYSTEM_PROMPT, tools: createFinanceTools(household, log), maxIterations: 8 });
  // The agent is stateless per request; previous turns are passed as context text.
  const transcript = history
    .slice(-8)
    .map((t) => `${t.role === "user" ? "Family" : "Ask Prospera"}: ${t.content}`)
    .join("\n");
  const langNote =
    language && ALLOWED_LANGS.includes(language)
      ? `\n\n(Reply in ${language}, simple everyday words. Numbers must still come only from tools.)`
      : `\n\n(${detectReplyLanguage(question)} Numbers must still come only from tools.)`;
  const prompt = (transcript ? `Earlier conversation:\n${transcript}\n\nNew question: ${question}` : question) + langNote;
  const result = await agent.run(prompt);
  if (result.status !== "completed" && result.error) throw result.error;
  return { answer: result.outputText, toolCalls: log };
}
