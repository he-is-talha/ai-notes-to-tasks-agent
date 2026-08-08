import { afterEach, describe, expect, it } from "vitest";
import {
  createSqliteAdapter,
  type SqliteAdapter,
} from "../../src/adapters/sqlite.js";
import { IntendedCallCollector } from "../../src/dry-run/collector.js";
import { formatIntendedCall } from "../../src/dry-run/format.js";
import type { ToolContext } from "../../src/tools/context.js";
import { createTaskTool } from "../../src/tools/create-task.js";
import { findProjectTool } from "../../src/tools/find-project.js";

const CREATE_ARGS = {
  title: "Clean up CI Docker images",
  assignee: "Ethan",
  due_date: "2026-08-09",
  project: "DevOps & CI",
} as const;

const FIND_ARGS = { query: "DevOps" } as const;

function makeCtx(
  adapter: SqliteAdapter,
  mode: ToolContext["mode"],
  collector: IntendedCallCollector,
): ToolContext {
  return {
    adapter,
    mode,
    runId: "parity-run",
    onIntendedCall: (call) => collector.push(call),
  };
}

describe("dry-run vs execute intended-call parity", () => {
  let adapter: SqliteAdapter;

  afterEach(() => {
    adapter?.close();
  });

  it("emits byte-identical create_task intended bodies; only execute writes", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();

    const dryCollector = new IntendedCallCollector();
    const execCollector = new IntendedCallCollector();

    const dryResult = await createTaskTool(
      CREATE_ARGS,
      makeCtx(adapter, "dry-run", dryCollector),
    );
    expect(dryResult.ok).toBe(true);
    expect(adapter.countTasks()).toBe(0);

    const execResult = await createTaskTool(
      CREATE_ARGS,
      makeCtx(adapter, "execute", execCollector),
    );
    expect(execResult.ok).toBe(true);
    expect(adapter.countTasks()).toBe(1);

    const dryCalls = dryCollector.snapshot();
    const execCalls = execCollector.snapshot();
    expect(dryCalls).toHaveLength(1);
    expect(execCalls).toHaveLength(1);

    expect(formatIntendedCall(dryCalls[0]!)).toBe(
      formatIntendedCall(execCalls[0]!),
    );
    expect(dryCollector.toJSONL()).toBe(execCollector.toJSONL());

    expect(JSON.stringify(dryCalls[0]!.body)).toBe(
      JSON.stringify({
        title: CREATE_ARGS.title,
        assignee: CREATE_ARGS.assignee,
        due_date: CREATE_ARGS.due_date,
        project: CREATE_ARGS.project,
        dedupe_key: dryCalls[0]!.body.dedupe_key,
      }),
    );
  });

  it("emits byte-identical find_project intended bodies", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();

    const dryCollector = new IntendedCallCollector();
    const execCollector = new IntendedCallCollector();

    await findProjectTool(FIND_ARGS, makeCtx(adapter, "dry-run", dryCollector));
    await findProjectTool(FIND_ARGS, makeCtx(adapter, "execute", execCollector));

    expect(formatIntendedCall(dryCollector.snapshot()[0]!)).toBe(
      formatIntendedCall(execCollector.snapshot()[0]!),
    );
    expect(adapter.countTasks()).toBe(0);
  });
});
