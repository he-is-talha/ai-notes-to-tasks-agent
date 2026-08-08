import type { FindProjectData } from "../adapters/types.js";
import { FindProjectArgsSchema } from "../schema/tool-args.js";
import { err, type ToolResult } from "../schema/tool-result.js";
import type { ToolContext } from "./context.js";

function adapterErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function findProjectTool(
  rawArgs: unknown,
  ctx: ToolContext,
): Promise<ToolResult<FindProjectData>> {
  const parsed = FindProjectArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return err(
      "VALIDATION_ERROR",
      "Invalid find_project arguments",
      parsed.error.flatten(),
    );
  }

  ctx.onIntendedCall?.({
    tool: "find_project",
    method: "GET",
    pathOrOp: "sqlite.projects.find",
    body: { query: parsed.data.query },
  });

  try {
    return await ctx.adapter.findProject(parsed.data.query);
  } catch (error) {
    return err("ADAPTER_ERROR", adapterErrorMessage(error));
  }
}
