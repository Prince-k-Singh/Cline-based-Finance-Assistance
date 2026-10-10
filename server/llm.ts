import { Agent } from "@cline/sdk";

export interface LlmConfig {
  providerId: string;
  modelId: string;
  apiKey: string;
}

const PROVIDER_KEY_ENV: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  cline: "CLINE_API_KEY",
};

export function getLlmConfig(): LlmConfig | null {
  const providerId = process.env.CLINE_PROVIDER || "anthropic";
  const modelId = process.env.CLINE_MODEL || "claude-sonnet-4-6";
  const apiKey = process.env[PROVIDER_KEY_ENV[providerId] ?? ""] || process.env.CLINE_API_KEY || "";
  return apiKey ? { providerId, modelId, apiKey } : null;
}

export type AgentOptions = ConstructorParameters<typeof Agent>[0];

/** Small helper so every agent in the app is created the same way. */
export function makeAgent(cfg: LlmConfig, opts: { systemPrompt: string; tools?: AgentOptions["tools"]; maxIterations?: number }) {
  return new Agent({
    providerId: cfg.providerId,
    modelId: cfg.modelId,
    apiKey: cfg.apiKey,
    systemPrompt: opts.systemPrompt,
    tools: opts.tools ?? [],
    maxIterations: opts.maxIterations ?? 8,
  } as AgentOptions);
}
