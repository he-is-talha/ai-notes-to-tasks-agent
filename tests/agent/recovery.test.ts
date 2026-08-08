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

function recoveryLlm(): LlmProvider {
  const responses: ChatResponse[] = [
    {
      message: {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "1",
            name: "create_task",
            arguments: {
              title: "Fix payment webhook idempotency",
              assignee: "James",
              due_date: "next Friday",
              project: "Payments",
            },
          },
        ],
      },
      toolCalls: [
        {
          id: "1",
          name: "create_task",
          arguments: {
            title: "Fix payment webhook idempotency",
            assignee: "James",
            due_date: "next Friday",
            project: "Payments",
          },
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
        content: "Corrected the due date and created the task.",
      },
      toolCalls: [],
    },
  ];

  let index = 0;
  return {
    async chat(messages: ChatMessage[]): Promise<ChatResponse> {
      if (index === 1) {
        const last = messages[messages.length - 1];
        expect(last?.role).toBe("tool");
        expect(last?.content).toContain("VALIDATION_ERROR");
      }
      const next = responses[index];
      index += 1;
      if (!next) {
        return {
          message: { role: "assistant", content: "done" },
          toolCalls: [],
        };
      }
      return next;
    },
  };
}

describe("malformed-arg recovery", () => {
  let adapter: SqliteAdapter;

  afterEach(() => {
    adapter?.close();
  });

  it("refuses bad due_date then succeeds on corrected retry within budget", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();

    const ctx: ToolContext = {
      adapter,
      mode: "execute",
      runId: "recovery-run",
      model: "qwen3.5:4b",
    };

    const report = await runAgent({
      notes: "James will fix payment webhook idempotency next Friday.",
      ctx,
      llm: recoveryLlm(),
      maxToolCalls: 6,
    });

    expect(report.toolCallCount).toBe(2);
    expect(report.refusals).toBe(1);
    expect(report.stoppedReason).toBe("completed");
    expect(adapter.countTasks()).toBe(1);
  });
});
