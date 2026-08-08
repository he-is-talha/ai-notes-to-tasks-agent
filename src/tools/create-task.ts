import type { CreateTaskData } from "../adapters/types.js";
import { dedupeKey } from "../adapters/dedupe.js";
import { CreateTaskArgsSchema } from "../schema/tool-args.js";
import { err, ok, type ToolResult } from "../schema/tool-result.js";
import type { ToolContext } from "./context.js";

export type CreateTaskToolData =
  | (CreateTaskData & { dryRun?: false })
  | {
      dryRun: true;
      title: string;
      assignee: string;
      due_date: string;
      project: string;
      dedupeKey: string;
      created: false;
    };

function adapterErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function createTaskTool(
  rawArgs: unknown,
  ctx: ToolContext,
): Promise<ToolResult<CreateTaskToolData>> {
  const parsed = CreateTaskArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return err(
      "VALIDATION_ERROR",
      "Invalid create_task arguments",
      parsed.error.flatten(),
    );
  }

  const args = parsed.data;
  const key = dedupeKey(args.title, args.project, args.due_date);

  ctx.onIntendedCall?.({
    tool: "create_task",
    method: "POST",
    pathOrOp: "sqlite.tasks.create",
    body: {
      title: args.title,
      assignee: args.assignee,
      due_date: args.due_date,
      project: args.project,
      dedupe_key: key,
    },
  });

  if (ctx.mode === "dry-run") {
    return ok({
      dryRun: true,
      title: args.title,
      assignee: args.assignee,
      due_date: args.due_date,
      project: args.project,
      dedupeKey: key,
      created: false,
    });
  }

  try {
    const result = await ctx.adapter.createTask(args);
    if (!result.ok) return result;
    return ok({ ...result.data, dryRun: false });
  } catch (error) {
    return err("ADAPTER_ERROR", adapterErrorMessage(error));
  }
}
