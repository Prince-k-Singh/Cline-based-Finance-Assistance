import { createTool } from "@cline/sdk";
import { z } from "zod";
import { EXPENSE_CATEGORIES, parseStatement, summariseStatement, type StatementTxn } from "../src/engine";
import { makeAgent, type LlmConfig } from "./llm";

const CATS = [...EXPENSE_CATEGORIES, "income", "investment", "transfer", "unknown"] as const;

/**
 * Statement-to-expenses. Rule-based parsing always runs (works offline).
 * If an LLM is configured, a Cline SDK agent re-categorises the "unknown"
 * transactions through a typed tool; it never edits amounts.
 */
export async function categoriseStatement(cfg: LlmConfig | null, text: string, months: number) {
  const txns = parseStatement(text);
  let aiUsed = false;
  const unknown = txns.map((t, i) => ({ i, t })).filter((x) => x.t.category === "unknown");
  if (cfg && unknown.length) {
    const setCategories = createTool({
      name: "set_categories",
      description: "Assign a category to each transaction by index. Call exactly once with all assignments.",
      inputSchema: z.object({
        assignments: z.array(z.object({ index: z.number().int(), category: z.enum(CATS) })),
      }),
      lifecycle: { completesRun: true },
      async execute({ assignments }) {
        for (const a of assignments) {
          const hit = unknown.find((u) => u.i === a.index);
          if (hit) txns[a.index].category = a.category as StatementTxn["category"];
        }
        aiUsed = true;
        return { updated: assignments.length };
      },
    });
    const agent = makeAgent(cfg, {
      systemPrompt: `You categorise Indian bank/UPI/card transactions into: ${CATS.join(", ")}. Use "unknown" only if truly unclear. Call set_categories once.`,
      tools: [setCategories],
      maxIterations: 3,
    });
    const list = unknown.map((u) => `${u.i}: ${u.t.description} (₹${u.t.amount})`).join("\n");
    try {
      await agent.run(`Categorise these transactions:\n${list}`);
    } catch (e) {
      console.warn("[statement] AI categorisation failed, using rules only:", (e as Error).message);
    }
  }
  return { transactions: txns, summary: summariseStatement(txns, months), aiUsed };
}
