import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { AuditEntry } from "./types.js";

/** Shared append-only audit log; correlate rows with `run_id`. */
export const DEFAULT_AUDIT_PATH = path.join("audit", "runs.jsonl");

/**
 * Resolve the shared audit JSONL path.
 * `runId` is recorded on each entry; the file itself is shared.
 */
export function createAuditPath(_runId?: string): string {
  return DEFAULT_AUDIT_PATH;
}

/** Append one audit entry as a single JSONL line. Never truncates. */
export function appendAudit(filePath: string, entry: AuditEntry): void {
  const dir = path.dirname(filePath);
  mkdirSync(dir, { recursive: true });
  appendFileSync(filePath, `${JSON.stringify(entry)}\n`, "utf8");
}
