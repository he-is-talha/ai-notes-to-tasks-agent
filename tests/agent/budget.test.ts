import { afterEach, describe, expect, it } from "vitest";
import { runAgent } from "../../src/agent/loop.js";
import {
  createSqliteAdapter,
  type SqliteAdapter,
} from "../../src/adapters/sqlite.js";
import type {
  ChatMessage,
  ChatResponse,
  LlmProvider,
} from "../../src/llm/types.js";
import type { ToolContext } from "../../src/tools/context.js";

function alwaysToolCallLlm(): LlmProvider {
  let n = 0;
  return {
    async chat(_messages: ChatMessage[]): Promise<ChatResponse> {
      n += 1;
      const call = {
        id: `call-${n}`,
        name: "find_project",
        arguments: { query: "Payments" },
      };
      return {
        message: {
          role: "assistant",
          content: "",
          tool_calls: [call],
        },
        toolCalls: [call],
      };
    },
  };
}

describe("runAgent tool-call budget", () => {
  let adapter: SqliteAdapter;

  afterEach(() => {
    adapter?.close();
  });

  it("stops at max 6 tool calls", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();

    const ctx: ToolContext = {
      adapter,
      mode: "dry-run",
      runId: "budget-run",
      model: "qwen3.5:4b",
    };

    const report = await runAgent({
      notes: "keep calling tools forever",
      ctx,
      llm: alwaysToolCallLlm(),
      maxToolCalls: 6,
    });

    expect(report.toolCallCount).toBe(6);
    expect(report.stoppedReason).toBe("max_tool_calls");
    expect(adapter.countTasks()).toBe(0);
  });

  it("records model_error when the LLM throws", async () => {
    adapter = createSqliteAdapter(":memory:");
    const ctx: ToolContext = {
      adapter,
      mode: "dry-run",
      runId: "error-run",
    };
    const llm: LlmProvider = {
      async chat() {
        throw new Error("boom");
      },
    };

    const report = await runAgent({
      notes: "notes",
      ctx,
      llm,
      maxToolCalls: 6,
    });

    expect(report.stoppedReason).toBe("model_error");
    expect(report.toolCallCount).toBe(0);
    expect(report.errorMessage).toBe("boom");
  });
});
