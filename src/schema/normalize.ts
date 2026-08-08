function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeTitle(value: string): string {
  return collapseWhitespace(value);
}

export function normalizeProject(value: string): string {
  return collapseWhitespace(value);
}

/** Due dates are already ISO `YYYY-MM-DD`; trim only. */
export function normalizeDueDate(value: string): string {
  return value.trim();
}

export function dedupeKey(
  title: string,
  project: string,
  dueDate: string,
): string {
  return [
    normalizeTitle(title),
    normalizeProject(project),
    normalizeDueDate(dueDate),
  ].join("\0");
}
