import { describe, expect, it } from "vitest";
import { parseToolCalls } from "../../src/llm/parse-tool-calls.js";

describe("parseToolCalls", () => {
  it("parses create_task arguments from a JSON string", () => {
    const calls = parseToolCalls({
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: "call-1",
          function: {
            name: "create_task",
            arguments: JSON.stringify({
              title: "Fix payment webhook idempotency",
              assignee: "James",
              due_date: "2026-08-11",
              project: "Payments",
            }),
          },
        },
      ],
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      id: "call-1",
      name: "create_task",
      arguments: {
        title: "Fix payment webhook idempotency",
        assignee: "James",
        due_date: "2026-08-11",
        project: "Payments",
      },
    });
  });

  it("accepts arguments already parsed as an object", () => {
    const calls = parseToolCalls({
      tool_calls: [
        {
          function: {
            name: "find_project",
            arguments: { query: "Auth" },
          },
        },
      ],
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.name).toBe("find_project");
    expect(calls[0]?.arguments).toEqual({ query: "Auth" });
    expect(calls[0]?.id.length).toBeGreaterThan(0);
  });

  it("returns [] when tool_calls is missing", () => {
    expect(parseToolCalls({ role: "assistant", content: "done" })).toEqual([]);
    expect(parseToolCalls(null)).toEqual([]);
  });
});
