import { afterEach, describe, expect, it } from "vitest";
import {
  createSqliteAdapter,
  type SqliteAdapter,
} from "../../src/adapters/sqlite.js";
import type { ToolContext } from "../../src/tools/context.js";
import { createTaskTool } from "../../src/tools/create-task.js";
import { dispatchTool } from "../../src/tools/dispatch.js";
import { findProjectTool } from "../../src/tools/find-project.js";

type RefusalCase = {
  name: string;
  tool: "find_project" | "create_task";
  args: unknown;
};

const REFUSAL_CASES: RefusalCase[] = [
  {
    name: "missing title",
    tool: "create_task",
    args: {
      assignee: "James",
      due_date: "2026-08-11",
      project: "Payments",
    },
  },
  {
    name: "empty query",
    tool: "find_project",
    args: { query: "" },
  },
  {
    name: "due_date 04/01/2026",
    tool: "create_task",
    args: {
      title: "Fix webhooks",
      assignee: "James",
      due_date: "04/01/2026",
      project: "Payments",
    },
  },
  {
    name: "assignee number",
    tool: "create_task",
    args: {
      title: "Fix webhooks",
      assignee: 42,
      due_date: "2026-08-11",
      project: "Payments",
    },
  },
  {
    name: "project null",
    tool: "create_task",
    args: {
      title: "Fix webhooks",
      assignee: "James",
      due_date: "2026-08-11",
      project: null,
    },
  },
  {
    name: "find garbage object without query",
    tool: "find_project",
    args: { foo: "bar", unrelated: true },
  },
];

function makeCtx(adapter: SqliteAdapter): ToolContext {
  return {
    adapter,
    mode: "execute",
    runId: "validation-refusals",
  };
}

describe(`validation refusals (${REFUSAL_CASES.length} cases)`, () => {
  let adapter: SqliteAdapter;

  afterEach(() => {
    adapter?.close();
  });

  it("covers at least 6 malformed payloads", () => {
    expect(REFUSAL_CASES.length).toBeGreaterThanOrEqual(6);
  });

  it.each(REFUSAL_CASES)(
    "refuses $name with VALIDATION_ERROR and writes nothing",
    async ({ tool, args }) => {
      adapter = createSqliteAdapter(":memory:");
      adapter.seedIfEmpty();
      const before = adapter.countTasks();
      const ctx = makeCtx(adapter);

      const result =
        tool === "find_project"
          ? await findProjectTool(args, ctx)
          : await createTaskTool(args, ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
      expect(adapter.countTasks()).toBe(before);

      // Same refusal through the dispatcher entry point.
      const dispatched = await dispatchTool(tool, args, ctx);
      expect(dispatched.ok).toBe(false);
      if (!dispatched.ok) {
        expect(dispatched.error.code).toBe("VALIDATION_ERROR");
      }
      expect(adapter.countTasks()).toBe(before);
    },
  );
});
