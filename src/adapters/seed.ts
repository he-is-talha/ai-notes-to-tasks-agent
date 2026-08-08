import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Default catalog: samples/projects (one name per line; # comments allowed). */
export function defaultProjectsFilePath(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../samples/projects",
  );
}

/**
 * Parse a projects file into unique non-empty names (order preserved).
 */
export function loadProjectNames(filePath: string = defaultProjectsFilePath()): string[] {
  const text = readFileSync(filePath, "utf8");
  const seen = new Set<string>();
  const names: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(trimmed);
  }
  if (names.length === 0) {
    throw new Error(`No project names found in ${filePath}`);
  }
  return names;
}

export type ProjectRow = {
  id: string;
  name: string;
};

/**
 * Insert projects from samples/projects (or override path) if the caller table is empty.
 */
export function seedDemoProjects(
  insertProject: (name: string) => ProjectRow,
  projectsFilePath: string = defaultProjectsFilePath(),
): ProjectRow[] {
  return loadProjectNames(projectsFilePath).map((name) => insertProject(name));
}
