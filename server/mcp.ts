/**
 * Parivar Plan finance engine as an MCP server (stdio, JSON-RPC 2.0).
 * Lets Cline (or any MCP client) call the same deterministic tools the
 * in-app advisor uses. No extra dependencies.
 *
 * Add to Cline's MCP settings:
 *   "parivar-plan": { "command": "npx", "args": ["tsx", "server/mcp.ts"], "cwd": "<path-to>/parivar-plan" }
 *
 * Every tool accepts an optional "household" object; if omitted the sample family is used.
 */
import { createInterface } from "node:readline";
import { z } from "zod";
import { SAMPLE_HOUSEHOLD, type Household } from "../src/engine";
import { createFinanceTools, type ToolLogEntry } from "./tools";

type AnyTool = { name: string; description: string; inputSchema: unknown; execute: (input: unknown, ctx: unknown) => Promise<unknown> };

function toolsFor(h: Household): AnyTool[] {
  const log: ToolLogEntry[] = [];
  return createFinanceTools(h, log) as unknown as AnyTool[];
}

function jsonSchemaOf(schema: unknown): Record<string, unknown> {
  // zod v4 ships toJSONSchema; fall back to a permissive object schema.
  const zz = z as unknown as { toJSONSchema?: (s: unknown) => Record<string, unknown> };
  let base: Record<string, unknown> = { type: "object", properties: {} };
  try {
    if (zz.toJSONSchema && schema && typeof schema === "object" && "_def" in (schema as object)) base = zz.toJSONSchema(schema);
    else if (schema && typeof schema === "object") base = schema as Record<string, unknown>;
  } catch {
    /* keep permissive */
  }
  const props = { ...((base.properties as Record<string, unknown>) ?? {}) };
  props.household = { type: "object", description: "Optional full Household object (see src/engine/types.ts). Defaults to the sample family." };
  delete base.$schema;
  return { ...base, type: "object", properties: props };
}

const send = (msg: unknown) => process.stdout.write(JSON.stringify(msg) + "\n");

async function handle(req: { id?: number | string; method: string; params?: Record<string, unknown> }) {
  const { id, method, params } = req;
  if (method === "initialize")
    return send({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "parivar-plan", version: "1.0.0" } } });
  if (method === "notifications/initialized" || id === undefined) return;
  if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} });
  if (method === "tools/list")
    return send({
      jsonrpc: "2.0",
      id,
      result: { tools: toolsFor(SAMPLE_HOUSEHOLD).map((t) => ({ name: t.name, description: t.description, inputSchema: jsonSchemaOf(t.inputSchema) })) },
    });
  if (method === "tools/call") {
    const name = String(params?.name ?? "");
    const args = { ...((params?.arguments as Record<string, unknown>) ?? {}) };
    const h = (args.household as Household) ?? SAMPLE_HOUSEHOLD;
    delete args.household;
    const tool = toolsFor({ ...structuredClone(SAMPLE_HOUSEHOLD), ...h }).find((t) => t.name === name);
    if (!tool) return send({ jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool ${name}` } });
    try {
      const out = await tool.execute(args, { agentId: "mcp", iteration: 0 });
      return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] } });
    } catch (e) {
      return send({ jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text: (e as Error).message }] } });
    }
  }
  send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
}

createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  try {
    void handle(JSON.parse(line));
  } catch {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
  }
});
