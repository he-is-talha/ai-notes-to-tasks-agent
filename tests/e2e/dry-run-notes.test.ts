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

const NOTES_PATH = path.resolve("samples/messy-notes.md");

function scriptedDemoLlm(): LlmProvider {
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
        content: "Dry-run planned 2 tasks from the meeting notes.",
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

describe("e2e dry-run from samples/messy-notes.md", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("plans >=2 creates, writes audit, and does not insert tasks", async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "notes-dry-"));
    const sqlitePath = path.join(tempDir, "tasks.db");
    const auditPath = path.join(tempDir, "runs.jsonl");
    const runId = "e2e-dry-run-1";

    const result = await runNotesToTasks({
      notesPath: NOTES_PATH,
      mode: "dry-run",
      env: loadEnv({
        ADAPTER: "sqlite",
        SQLITE_PATH: sqlitePath,
        OLLAMA_MODEL: "qwen3.5:4b",
        MAX_TOOL_CALLS: "6",
      }),
      llm: scriptedDemoLlm(),
      runId,
      auditPath,
      sqlitePath,
    });

    try {
      expect(result.notes.length).toBeGreaterThan(100);
      expect(result.report.stoppedReason).toBe("completed");
      expect(result.report.toolCallCount).toBe(4);

      const createIntents = result.report.intendedCalls.filter(
        (c) => c.tool === "create_task",
      );
      expect(createIntents.length).toBeGreaterThanOrEqual(2);
      expect(result.taskCountAfter).toBe(result.taskCountBefore);
      expect(result.taskCountAfter).toBe(0);

      const audit = readFileSync(auditPath, "utf8").trim().split("\n");
      expect(audit.length).toBe(4);
      expect(
        audit.every((line) => JSON.parse(line).run_id === runId),
      ).toBe(true);
    } finally {
      result.adapter.close();
    }
  });
});

describe("live dry-run demo", () => {
  const runLive = process.env.RUN_LIVE_OLLAMA === "1";

  it.skipIf(!runLive)(
    "runs notes-to-tasks dry-run against real Ollama",
    async () => {
      const tempDir = mkdtempSync(path.join(tmpdir(), "notes-live-"));
      const sqlitePath = path.join(tempDir, "tasks.db");
      const auditPath = path.join(tempDir, "runs.jsonl");
      try {
        const result = await runNotesToTasks({
          notesPath: NOTES_PATH,
          mode: "dry-run",
          env: loadEnv(process.env),
          sqlitePath,
          auditPath,
        });
        expect(result.taskCountAfter).toBe(0);
        expect(result.report.runId.length).toBeGreaterThan(0);
        result.adapter.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    },
    180_000,
  );
});
