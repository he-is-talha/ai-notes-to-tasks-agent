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

function scriptedLlm(responses: ChatResponse[]): LlmProvider {
  let index = 0;
  return {
    async chat(_messages: ChatMessage[]): Promise<ChatResponse> {
      const next = responses[index];
      index += 1;
      if (!next) {
        return { message: { role: "assistant", content: "done" }, toolCalls: [] };
      }
      return next;
    },
  };
}

describe("runAgent happy path", () => {
  let adapter: SqliteAdapter;

  afterEach(() => {
    adapter?.close();
  });

  it("runs find_project then create_task then completes", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();

    const ctx: ToolContext = {
      adapter,
      mode: "execute",
      runId: "loop-run-1",
      model: "qwen3.5:4b",
    };

    const llm = scriptedLlm([
      {
        message: {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: "1",
              name: "find_project",
              arguments: { query: "Payments" },
            },
          ],
        },
        toolCalls: [
          {
            id: "1",
            name: "find_project",
            arguments: { query: "Payments" },
          },
        ],
      },
      {
        message: {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: "2",
              name: "create_task",
              arguments: {
                title: "Fix payment webhook idempotency",
                assignee: "James",
                due_date: "2026-08-11",
                project: "Payments",
              },
            },
          ],
        },
        toolCalls: [
          {
            id: "2",
            name: "create_task",
            arguments: {
              title: "Fix payment webhook idempotency",
              assignee: "James",
              due_date: "2026-08-11",
              project: "Payments",
            },
          },
        ],
      },
      {
        message: {
          role: "assistant",
          content: "Created 1 task in Payments.",
        },
        toolCalls: [],
      },
    ]);

    const report = await runAgent({
      notes: "James will fix payment webhook idempotency by 2026-08-11.",
      ctx,
      llm,
      maxToolCalls: 6,
    });

    expect(report.toolCallCount).toBe(2);
    expect(report.stoppedReason).toBe("completed");
    expect(report.refusals).toBe(0);
    expect(report.finalText).toBe("Created 1 task in Payments.");
    expect(report.intendedCalls.length).toBeGreaterThanOrEqual(2);
    expect(adapter.countTasks()).toBe(1);
  });
});
