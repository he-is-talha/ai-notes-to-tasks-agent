import { afterEach, describe, expect, it } from "vitest";
import {
  createSqliteAdapter,
  type SqliteAdapter,
} from "../../src/adapters/sqlite.js";
import type { IntendedApiCall } from "../../src/dry-run/types.js";
import type { ToolContext } from "../../src/tools/context.js";
import { createTaskTool } from "../../src/tools/create-task.js";
import { dispatchTool } from "../../src/tools/dispatch.js";
import { findProjectTool } from "../../src/tools/find-project.js";

function makeCtx(
  adapter: SqliteAdapter,
  mode: ToolContext["mode"],
  intended: IntendedApiCall[] = [],
): ToolContext {
  return {
    adapter,
    mode,
    runId: "test-run",
    onIntendedCall: (call) => {
      intended.push(call);
    },
  };
}

describe("tool boundary", () => {
  let adapter: SqliteAdapter;

  afterEach(() => {
    adapter?.close();
  });

  it("finds a project with valid args against seeded SQLite", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();
    const intended: IntendedApiCall[] = [];
    const result = await findProjectTool(
      { query: "Payments" },
      makeCtx(adapter, "execute", intended),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.projectName).toBe("Payments");
    }
    expect(intended).toHaveLength(1);
    expect(intended[0]?.pathOrOp).toBe("sqlite.projects.find");
  });

  it("refuses invalid create_task args without writing", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();
    const result = await createTaskTool(
      {
        title: "",
        assignee: "James",
        due_date: "tomorrow",
        project: "Payments",
      },
      makeCtx(adapter, "execute"),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toMatchObject({
        fieldErrors: expect.any(Object),
      });
    }
    expect(adapter.countTasks()).toBe(0);
  });

  it("execute create_task inserts one row", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();
    const result = await createTaskTool(
      {
        title: "Fix payment webhook idempotency",
        assignee: "James",
        due_date: "2026-08-11",
        project: "Payments",
      },
      makeCtx(adapter, "execute"),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.dryRun).toBe(false);
      expect("created" in result.data && result.data.created).toBe(true);
    }
    expect(adapter.countTasks()).toBe(1);
  });

  it("dry-run create_task records intended call and does not write", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();
    const intended: IntendedApiCall[] = [];
    const result = await createTaskTool(
      {
        title: "Fix payment webhook idempotency",
        assignee: "James",
        due_date: "2026-08-11",
        project: "Payments",
      },
      makeCtx(adapter, "dry-run", intended),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        dryRun: true,
        created: false,
        title: "Fix payment webhook idempotency",
        project: "Payments",
      });
    }
    expect(adapter.countTasks()).toBe(0);
    expect(intended).toHaveLength(1);
    expect(intended[0]).toMatchObject({
      tool: "create_task",
      method: "POST",
      pathOrOp: "sqlite.tasks.create",
    });
  });

  it("dispatchTool returns UNKNOWN_TOOL for other names", async () => {
    adapter = createSqliteAdapter(":memory:");
    const result = await dispatchTool("delete_all", {}, makeCtx(adapter, "dry-run"));
    expect(result).toEqual({
      ok: false,
      error: {
        code: "UNKNOWN_TOOL",
        message: "Unknown tool: delete_all",
        details: { name: "delete_all" },
      },
    });
  });
});
