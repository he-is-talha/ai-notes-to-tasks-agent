import { randomUUID } from "node:crypto";
import type { ToolCall } from "./types.js";

type OllamaFunctionCall = {
  name?: unknown;
  arguments?: unknown;
};

type OllamaToolCall = {
  id?: unknown;
  function?: OllamaFunctionCall;
  name?: unknown;
  arguments?: unknown;
};

function parseArguments(raw: unknown): unknown {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return { _unparsed: raw };
    }
  }
  if (raw === undefined || raw === null) return {};
  return raw;
}

function normalizeOne(raw: OllamaToolCall, index: number): ToolCall | null {
  const fn = raw.function;
  const name =
    (typeof fn?.name === "string" && fn.name) ||
    (typeof raw.name === "string" && raw.name) ||
    "";
  if (!name) return null;

  const id =
    typeof raw.id === "string" && raw.id.length > 0
      ? raw.id
      : `call_${index}_${randomUUID().slice(0, 8)}`;

  return {
    id,
    name,
    arguments: parseArguments(fn?.arguments ?? raw.arguments),
  };
}

/**
 * Normalize Ollama `/api/chat` tool_calls into a stable ToolCall list.
 * Accepts `arguments` as a JSON string or already-parsed object.
 */
export function parseToolCalls(ollamaMessage: unknown): ToolCall[] {
  if (!ollamaMessage || typeof ollamaMessage !== "object") return [];
  const message = ollamaMessage as { tool_calls?: unknown };
  if (!Array.isArray(message.tool_calls)) return [];

  const out: ToolCall[] = [];
  message.tool_calls.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const normalized = normalizeOne(item as OllamaToolCall, index);
    if (normalized) out.push(normalized);
  });
  return out;
}
