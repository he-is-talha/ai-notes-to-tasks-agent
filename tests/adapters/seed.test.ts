import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  defaultProjectsFilePath,
  loadProjectNames,
  seedDemoProjects,
} from "../../src/adapters/seed.js";

describe("seed projects file", () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  });

  it("loads the default samples/projects catalog", () => {
    const names = loadProjectNames(defaultProjectsFilePath());
    expect(names).toContain("Payments");
    expect(names).toContain("Infrastructure");
    expect(names.length).toBe(8);
  });

  it("parses comments, blanks, and dedupes case-insensitively", () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "projects-"));
    const file = path.join(tempDir, "projects");
    writeFileSync(
      file,
      ["# comment", "", "Alpha", "alpha", "  Beta  ", "# ignored", "Gamma"].join(
        "\n",
      ),
      "utf8",
    );
    expect(loadProjectNames(file)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("seedDemoProjects inserts each loaded name", () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "projects-"));
    const file = path.join(tempDir, "projects");
    writeFileSync(file, "One\nTwo\n", "utf8");
    const rows = seedDemoProjects(
      (name) => ({ id: `id-${name}`, name }),
      file,
    );
    expect(rows).toEqual([
      { id: "id-One", name: "One" },
      { id: "id-Two", name: "Two" },
    ]);
  });
});
