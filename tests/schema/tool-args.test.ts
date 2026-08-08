import { describe, expect, it } from "vitest";
import { dedupeKey, normalizeProject, normalizeTitle } from "../../src/schema/normalize.js";
import {
  CreateTaskArgsSchema,
  FindProjectArgsSchema,
} from "../../src/schema/tool-args.js";
import { err, ok } from "../../src/schema/tool-result.js";

describe("FindProjectArgsSchema", () => {
  it("accepts a valid query", () => {
    const result = FindProjectArgsSchema.safeParse({ query: "Platform" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("Platform");
    }
  });

  it("trims query whitespace", () => {
    const result = FindProjectArgsSchema.safeParse({ query: "  Mobile  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("Mobile");
    }
  });

  it("rejects empty query", () => {
    const result = FindProjectArgsSchema.safeParse({ query: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing query", () => {
    const result = FindProjectArgsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("CreateTaskArgsSchema", () => {
  const valid = {
    title: "Finish rate-limit PR",
    assignee: "Alex",
    due_date: "2026-04-03",
    project: "Platform",
  };

  it("accepts valid args", () => {
    const result = CreateTaskArgsSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(valid);
    }
  });

  it("rejects empty title", () => {
    const result = CreateTaskArgsSchema.safeParse({ ...valid, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects non-ISO due_date", () => {
    const result = CreateTaskArgsSchema.safeParse({
      ...valid,
      due_date: "tomorrow",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = CreateTaskArgsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("normalize + dedupeKey", () => {
  it("normalizes title and project case/whitespace", () => {
    expect(normalizeTitle("  Finish   PR  ")).toBe("finish pr");
    expect(normalizeProject(" Platform ")).toBe("platform");
  });

  it("builds a stable dedupe key", () => {
    const a = dedupeKey("Finish PR", "Platform", "2026-04-03");
    const b = dedupeKey("  finish   pr ", " platform ", "2026-04-03");
    expect(a).toBe(b);
    expect(a.split("\0")).toEqual(["finish pr", "platform", "2026-04-03"]);
  });
});

describe("ToolResult helpers", () => {
  it("ok wraps data", () => {
    expect(ok({ id: "1" })).toEqual({ ok: true, data: { id: "1" } });
  });

  it("err builds a structured refusal", () => {
    expect(err("VALIDATION_ERROR", "bad args", { field: "due_date" })).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "bad args",
        details: { field: "due_date" },
      },
    });
  });
});
