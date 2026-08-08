import { afterEach, describe, expect, it } from "vitest";
import {
  createSqliteAdapter,
  type SqliteAdapter,
} from "../../src/adapters/sqlite.js";
import type { ToolContext } from "../../src/tools/context.js";
import { createTaskTool } from "../../src/tools/create-task.js";
import { findProjectTool } from "../../src/tools/find-project.js";

function makeCtx(adapter: SqliteAdapter): ToolContext {
  return {
    adapter,
    mode: "execute",
    runId: "valid-args",
  };
}

describe("valid args (execute path)", () => {
  let adapter: SqliteAdapter;

  afterEach(() => {
    adapter?.close();
  });

  it("accepts a valid find_project query", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();

    const result = await findProjectTool(
      { query: "Auth" },
      makeCtx(adapter),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.projectName).toBe("Authentication");
      expect(result.data.projectId.length).toBeGreaterThan(0);
    }
  });

  it("accepts a valid create_task and inserts one row", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();

    const result = await createTaskTool(
      {
        title: "Investigate Redis timeout under load",
        assignee: "Sarah",
        due_date: "2026-08-12",
        project: "Infrastructure",
      },
      makeCtx(adapter),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.dryRun).toBe(false);
      expect("created" in result.data && result.data.created).toBe(true);
      expect("projectName" in result.data && result.data.projectName).toBe(
        "Infrastructure",
      );
    }
    expect(adapter.countTasks()).toBe(1);
  });

  it("trims create_task string fields before accept", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();

    const result = await createTaskTool(
      {
        title: "  Update OpenAPI schema  ",
        assignee: "  Emma  ",
        due_date: "2026-08-16",
        project: "  API & Documentation  ",
      },
      makeCtx(adapter),
    );

    expect(result.ok).toBe(true);
    if (result.ok && result.data.dryRun === false) {
      expect(result.data.title).toBe("Update OpenAPI schema");
      expect(result.data.assignee).toBe("Emma");
      expect(result.data.projectName).toBe("API & Documentation");
    }
  });
});
