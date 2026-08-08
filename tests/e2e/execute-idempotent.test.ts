import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runNotesToTasks } from "../../src/cli/run.js";
import { loadEnv } from "../../src/config/env.js";
import type {
  ChatMessage,
  ChatResponse,
  LlmProvider,
} from "../../src/llm/types.js";

const NOTES_PATH = path.resolve("samples/demo-notes.md");

function scriptedExecuteLlm(): LlmProvider {
  const responses: ChatResponse[] = [
    {
      message: {
        role: "assistant",
        content: "",
        tool_calls: [
          { id: "1", name: "find_project", arguments: { query: "Payments" } },
        ],
      },
      toolCalls: [
        { id: "1", name: "find_project", arguments: { query: "Payments" } },
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
              title: "Investigate duplicate payment webhook handling",
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
            title: "Investigate duplicate payment webhook handling",
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
        content: "",
        tool_calls: [
          {
            id: "3",
            name: "find_project",
            arguments: { query: "Infrastructure" },
          },
        ],
      },
      toolCalls: [
        {
          id: "3",
          name: "find_project",
          arguments: { query: "Infrastructure" },
        },
      ],
    },
    {
      message: {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "4",
            name: "create_task",
            arguments: {
              title: "Investigate and fix Redis timeout under load",
              assignee: "Sarah",
              due_date: "2026-08-12",
              project: "Infrastructure",
            },
          },
        ],
      },
      toolCalls: [
        {
          id: "4",
          name: "create_task",
          arguments: {
            title: "Investigate and fix Redis timeout under load",
            assignee: "Sarah",
            due_date: "2026-08-12",
            project: "Infrastructure",
          },
        },
      ],
    },
    {
      message: {
        role: "assistant",
        content: "Created 2 tasks.",
      },
      toolCalls: [],
    },
  ];

  let index = 0;
  return {
    async chat(_messages: ChatMessage[]): Promise<ChatResponse> {
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

describe("e2e execute + idempotent re-run", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("writes tasks once, then skips duplicates on re-run", async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "notes-exec-"));
    const sqlitePath = path.join(tempDir, "tasks.db");
    const auditPath = path.join(tempDir, "runs.jsonl");

    const base = {
      notesPath: NOTES_PATH,
      mode: "execute" as const,
      env: loadEnv({
        ADAPTER: "sqlite",
        SQLITE_PATH: sqlitePath,
        OLLAMA_MODEL: "qwen3.5:4b",
        MAX_TOOL_CALLS: "6",
      }),
      sqlitePath,
      auditPath,
    };

    const first = await runNotesToTasks({
      ...base,
      llm: scriptedExecuteLlm(),
      runId: "exec-run-a",
    });

    try {
      expect(first.report.stoppedReason).toBe("completed");
      expect(first.report.toolCallCount).toBe(4);
      expect(first.taskCountAfter).toBe(2);
      expect(first.report.duplicateSkips).toBe(0);

      const second = await runNotesToTasks({
        ...base,
        llm: scriptedExecuteLlm(),
        runId: "exec-run-b",
      });

      try {
        expect(second.taskCountAfter).toBe(2);
        expect(second.report.duplicateSkips).toBe(2);

        const auditLines = readFileSync(auditPath, "utf8")
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line) as { run_id: string });
        const runIds = new Set(auditLines.map((e) => e.run_id));
        expect(runIds.has("exec-run-a")).toBe(true);
        expect(runIds.has("exec-run-b")).toBe(true);
      } finally {
        second.adapter.close?.();
      }
    } finally {
      first.adapter.close?.();
    }
  });
});
