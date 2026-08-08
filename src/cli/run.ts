import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createSqliteAdapterFromEnv } from "../adapters/factory.js";
import type { SqliteAdapter } from "../adapters/sqlite.js";
import { runAgent } from "../agent/loop.js";
import type { AgentReport } from "../agent/types.js";
import { createAuditPath } from "../audit/writer.js";
import type { AppEnv } from "../config/env.js";
import { formatIntendedCalls } from "../dry-run/format.js";
import { createLlmProvider } from "../llm/provider.js";
import type { LlmProvider } from "../llm/types.js";
import type { ToolMode } from "../tools/context.js";

export type NotesRunInput = {
  notesPath: string;
  mode: ToolMode;
  env: AppEnv;
  llm?: LlmProvider;
  runId?: string;
  auditPath?: string;
  /** Override SQLite path (tests use temp files). */
  sqlitePath?: string;
};

export type NotesRunResult = {
  report: AgentReport;
  notes: string;
  taskCountBefore: number;
  taskCountAfter: number;
  auditPath: string;
  adapter: SqliteAdapter;
};

export async function runNotesToTasks(
  input: NotesRunInput,
): Promise<NotesRunResult> {
  const env: AppEnv = {
    ...input.env,
    sqlitePath: input.sqlitePath ?? input.env.sqlitePath,
  };
  const notes = readFileSync(input.notesPath, "utf8");
  const adapter = createSqliteAdapterFromEnv(env);
  adapter.seedIfEmpty();

  const runId = input.runId ?? randomUUID();
  const auditPath = input.auditPath ?? createAuditPath(runId);
  const llm = input.llm ?? createLlmProvider(env);
  const taskCountBefore = adapter.countTasks();

  const report = await runAgent({
    notes,
    llm,
    maxToolCalls: env.maxToolCalls,
    ctx: {
      adapter,
      mode: input.mode,
      runId,
      auditPath,
      model: env.ollamaModel,
    },
  });

  return {
    report,
    notes,
    taskCountBefore,
    taskCountAfter: adapter.countTasks(),
    auditPath,
    adapter,
  };
}

export function printRunOutput(result: NotesRunResult, mode: ToolMode): void {
  const { report } = result;
  console.log(
    [
      `run_id=${report.runId}`,
      `mode=${mode}`,
      `stopped=${report.stoppedReason}`,
      `tool_calls=${report.toolCallCount}`,
      `refusals=${report.refusals}`,
      `duplicate_skips=${report.duplicateSkips}`,
      `tasks_before=${result.taskCountBefore}`,
      `tasks_after=${result.taskCountAfter}`,
      `audit=${result.auditPath}`,
    ].join("\n"),
  );

  if (report.intendedCalls.length > 0) {
    console.log("\n--- intended API calls ---");
    console.log(formatIntendedCalls(report.intendedCalls));
  }

  if (report.finalText.trim()) {
    console.log("\n--- model summary ---");
    console.log(report.finalText.trim());
  }

  if (report.errorMessage) {
    console.log(`\nerror=${report.errorMessage}`);
  }
}
