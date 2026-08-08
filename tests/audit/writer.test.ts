import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AuditEntry } from "../../src/audit/types.js";
import {
  appendAudit,
  createAuditPath,
  DEFAULT_AUDIT_PATH,
} from "../../src/audit/writer.js";
import {
  createSqliteAdapter,
  type SqliteAdapter,
} from "../../src/adapters/sqlite.js";
import { dispatchTool } from "../../src/tools/dispatch.js";
import type { ToolContext } from "../../src/tools/context.js";

function readJsonl(filePath: string): AuditEntry[] {
  const text = readFileSync(filePath, "utf8").trim();
  if (!text) return [];
  return text.split("\n").map((line) => JSON.parse(line) as AuditEntry);
}

describe("audit writer", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("uses a shared runs.jsonl path correlated by run_id", () => {
    expect(createAuditPath("any-run")).toBe(DEFAULT_AUDIT_PATH);
    expect(DEFAULT_AUDIT_PATH.replace(/\\/g, "/")).toBe("audit/runs.jsonl");
  });

  it("appends two JSONL entries without truncating", () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "audit-"));
    const filePath = path.join(tempDir, "runs.jsonl");
    const runId = "run-abc";

    appendAudit(filePath, {
      ts: "2026-08-09T00:00:00.000Z",
      run_id: runId,
      model: "qwen2.5:7b",
      tool: "find_project",
      args: { query: "Payments" },
      result: {
        ok: true,
        data: { projectId: "p1", projectName: "Payments" },
      },
      mode: "dry-run",
    });

    appendAudit(filePath, {
      ts: "2026-08-09T00:00:01.000Z",
      run_id: runId,
      model: "qwen2.5:7b",
      tool: "create_task",
      args: {
        title: "Fix webhooks",
        assignee: "James",
        due_date: "2026-08-11",
        project: "Payments",
      },
      result: {
        ok: true,
        data: { dryRun: true, created: false },
      },
      mode: "dry-run",
      intended_call: {
        tool: "create_task",
        method: "POST",
        pathOrOp: "sqlite.tasks.create",
        body: { title: "Fix webhooks" },
      },
    });

    const lines = readJsonl(filePath);
    expect(lines).toHaveLength(2);
    expect(lines.every((e) => e.run_id === runId)).toBe(true);
    expect(lines.map((e) => e.tool)).toEqual(["find_project", "create_task"]);
    expect(lines[0]?.result.ok).toBe(true);
    expect(lines[1]?.intended_call?.tool).toBe("create_task");
    expect(lines[0]).not.toHaveProperty("body");
  });
});

describe("dispatchTool audit wiring", () => {
  let adapter: SqliteAdapter;
  let tempDir: string;

  afterEach(() => {
    adapter?.close();
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("writes an audit row for each dispatched tool call", async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "audit-dispatch-"));
    const auditPath = path.join(tempDir, "runs.jsonl");
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();

    const ctx: ToolContext = {
      adapter,
      mode: "dry-run",
      runId: "dispatch-run-1",
      auditPath,
      model: "qwen2.5:7b",
    };

    await dispatchTool("find_project", { query: "Payments" }, ctx);
    await dispatchTool(
      "create_task",
      {
        title: "Fix payment webhook idempotency",
        assignee: "James",
        due_date: "2026-08-11",
        project: "Payments",
      },
      ctx,
    );

    const lines = readJsonl(auditPath);
    expect(lines).toHaveLength(2);
    expect(lines.every((e) => e.run_id === "dispatch-run-1")).toBe(true);
    expect(lines.every((e) => e.model === "qwen2.5:7b")).toBe(true);
    expect(lines.every((e) => e.mode === "dry-run")).toBe(true);
    expect(lines.map((e) => e.tool)).toEqual(["find_project", "create_task"]);
    expect(lines[0]?.intended_call?.pathOrOp).toBe("sqlite.projects.find");
    expect(lines[1]?.intended_call?.pathOrOp).toBe("sqlite.tasks.create");
    expect(adapter.countTasks()).toBe(0);
  });
});
