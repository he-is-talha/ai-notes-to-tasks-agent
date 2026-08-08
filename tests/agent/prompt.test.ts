import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  buildUserNotesMessage,
  prepareNotesForModel,
} from "../../src/agent/prompt.js";

describe("agent prompts", () => {
  it("system prompt constrains tools and ISO dates", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("find_project");
    expect(prompt).toContain("create_task");
    expect(prompt).toContain("YYYY-MM-DD");
    expect(prompt).toContain("Do not invent");
    expect(prompt).toContain("MUST call tools");
  });

  it("user message wraps notes", () => {
    const message = buildUserNotesMessage("  hello notes  ");
    expect(message).toContain("NOTES:");
    expect(message).toContain("hello notes");
  });

  it("prefers final confirmed commitments section for long notes", () => {
    const notes = [
      "long preamble ".repeat(50),
      "The final confirmed commitments were that James will handle webhooks by August 11, 2026.",
    ].join("\n");
    const prepared = prepareNotesForModel(notes);
    expect(prepared.startsWith("The final confirmed commitments")).toBe(true);
    expect(prepared).toContain("James");
    expect(prepared).not.toContain("long preamble");
  });
});
