import type { AppEnv } from "../config/env.js";
import { parseToolCalls } from "./parse-tool-calls.js";
import type {
  ChatMessage,
  ChatResponse,
  LlmProvider,
} from "./types.js";

type OllamaChatPayload = {
  message?: {
    role?: string;
    content?: string;
    tool_calls?: unknown;
  };
};

export function createLlmProvider(env: AppEnv): LlmProvider {
  if (env.llmProvider !== "ollama") {
    throw new Error(
      `LLM_PROVIDER="${env.llmProvider}" is not implemented in Project 4 (only ollama). Set LLM_PROVIDER=ollama.`,
    );
  }

  return {
    async chat(messages: ChatMessage[], tools: unknown[]): Promise<ChatResponse> {
      const response = await fetch(`${env.ollamaHost}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.ollamaModel,
          messages,
          tools,
          stream: false,
          options: { temperature: 0.1 },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Ollama /api/chat failed (${response.status}): ${body.slice(0, 500)}`,
        );
      }

      const payload = (await response.json()) as OllamaChatPayload;
      const rawMessage = payload.message;
      if (!rawMessage) {
        throw new Error("Ollama response missing message");
      }

      const toolCalls = parseToolCalls(rawMessage);
      const message: ChatMessage = {
        role: "assistant",
        content:
          typeof rawMessage.content === "string" ? rawMessage.content : "",
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      };

      return { message, toolCalls };
    },
  };
}
