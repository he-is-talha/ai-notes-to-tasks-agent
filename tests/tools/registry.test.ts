import { describe, expect, it } from "vitest";
import { ollamaTools, TOOL_NAMES } from "../../src/tools/registry.js";

describe("tool registry", () => {
  it("exposes exactly two tool names", () => {
    expect(TOOL_NAMES).toEqual(["find_project", "create_task"]);
    expect(TOOL_NAMES).toHaveLength(2);
  });

  it("builds Ollama tool defs from Zod schemas", () => {
    const tools = ollamaTools();
    expect(tools).toHaveLength(2);

    const names = tools.map((t) => t.function.name);
    expect(names).toEqual(["find_project", "create_task"]);

    for (const tool of tools) {
      expect(tool.type).toBe("function");
      expect(tool.function.description.length).toBeGreaterThan(0);
      expect(tool.function.parameters.type).toBe("object");
      expect(tool.function.parameters).not.toHaveProperty("$schema");
    }
  });

  it("requires create_task fields from the Zod schema", () => {
    const create = ollamaTools().find((t) => t.function.name === "create_task");
    expect(create).toBeDefined();
    const required = create!.function.parameters.required ?? [];
    expect(required).toEqual(
      expect.arrayContaining(["title", "assignee", "due_date", "project"]),
    );
    expect(required).toHaveLength(4);
  });

  it("requires find_project query", () => {
    const find = ollamaTools().find((t) => t.function.name === "find_project");
    expect(find).toBeDefined();
    expect(find!.function.parameters.required).toEqual(["query"]);
    expect(find!.function.parameters.properties).toHaveProperty("query");
  });
});
