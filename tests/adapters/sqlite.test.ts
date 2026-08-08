import { describe, expect, it, afterEach } from "vitest";
import { createSqliteAdapter, type SqliteAdapter } from "../../src/adapters/sqlite.js";
import { loadProjectNames } from "../../src/adapters/seed.js";

describe("sqlite adapter", () => {
  let adapter: SqliteAdapter;

  afterEach(() => {
    adapter?.close();
  });

  it("seeds demo projects and finds by partial query", async () => {
    adapter = createSqliteAdapter(":memory:");
    const seeded = adapter.seedIfEmpty();
    expect(seeded).toBe(loadProjectNames().length);
    expect(adapter.seedIfEmpty()).toBe(0);

    const found = await adapter.findProject("auth");
    expect(found.ok).toBe(true);
    if (found.ok) {
      expect(found.data.projectName).toBe("Authentication");
    }

    const payments = await adapter.findProject("Payment");
    expect(payments.ok).toBe(true);
    if (payments.ok) {
      expect(payments.data.projectName).toBe("Payments");
    }
  });

  it("returns NOT_FOUND when no project matches", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();
    const result = await adapter.findProject("zzznomatch");
    expect(result).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "No project matched query: zzznomatch",
        details: { query: "zzznomatch" },
      },
    });
  });

  it("creates a task and skips duplicates via dedupe key", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();

    const args = {
      title: "Investigate duplicate payment webhooks",
      assignee: "James",
      due_date: "2026-08-11",
      project: "Payments",
    };

    const first = await adapter.createTask(args);
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.data.created).toBe(true);
      expect(first.data.projectName).toBe("Payments");
      expect(first.data.dedupeKey).toContain("investigate duplicate payment webhooks");
    }
    expect(adapter.countTasks()).toBe(1);

    const second = await adapter.createTask({
      ...args,
      title: "  Investigate   Duplicate Payment Webhooks ",
      project: "payments",
    });
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.data.created).toBe(false);
      expect(second.data.reason).toBe("DUPLICATE_SKIPPED");
      expect(second.data.taskId).toBe(first.data.taskId);
    }
    expect(adapter.countTasks()).toBe(1);
  });

  it("returns NOT_FOUND when create_task project is unknown", async () => {
    adapter = createSqliteAdapter(":memory:");
    adapter.seedIfEmpty();
    const result = await adapter.createTask({
      title: "Orphan task",
      assignee: "Alex",
      due_date: "2026-08-20",
      project: "Does Not Exist",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
    expect(adapter.countTasks()).toBe(0);
  });
});
