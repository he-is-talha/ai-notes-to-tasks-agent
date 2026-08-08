import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  buildUserNotesMessage,
} from "../../src/agent/prompt.js";

describe("agent prompts", () => {
  it("system prompt constrains tools and ISO dates", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("find_project");
    expect(prompt).toContain("create_task");
    expect(prompt).toContain("YYYY-MM-DD");
    expect(prompt).toContain("Do not invent");
  });

  it("user message wraps notes", () => {
    const message = buildUserNotesMessage("  hello notes  ");
    expect(message).toContain("NOTES:");
    expect(message).toContain("hello notes");
  });
});
