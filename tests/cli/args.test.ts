import { describe, expect, it } from "vitest";
import {
  CliArgsError,
  parseCliArgs,
} from "../../src/cli/args.js";

describe("parseCliArgs", () => {
  it("defaults to dry-run", () => {
    expect(parseCliArgs(["node", "cli.ts"])).toEqual({
      mode: "dry-run",
      notesPath: null,
      help: false,
    });
  });

  it("accepts --execute", () => {
    expect(parseCliArgs(["node", "cli.ts", "--execute"])).toMatchObject({
      mode: "execute",
    });
  });

  it("accepts --notes path", () => {
    expect(
      parseCliArgs(["node", "cli.ts", "--notes", "meeting-notes.txt"]),
    ).toMatchObject({
      mode: "dry-run",
      notesPath: "meeting-notes.txt",
    });
  });

  it("rejects --dry-run combined with --execute", () => {
    expect(() =>
      parseCliArgs(["node", "cli.ts", "--dry-run", "--execute"]),
    ).toThrow(CliArgsError);
  });
});
