import { appendAudit } from "../audit/writer.js";
import type { IntendedApiCall } from "../dry-run/types.js";
import { err, type ToolResult } from "../schema/tool-result.js";
import type { ToolContext } from "./context.js";
import { createTaskTool } from "./create-task.js";
import { findProjectTool } from "./find-project.js";
import { TOOL_NAMES, type ToolName } from "./registry.js";

function isToolName(name: string): name is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(name);
}

export async function dispatchTool(
  name: string,
  rawArgs: unknown,
  ctx: ToolContext,
): Promise<ToolResult<unknown>> {
  let lastIntended: IntendedApiCall | undefined;
  const ctxWithCapture: ToolContext = {
    ...ctx,
    onIntendedCall: (call) => {
      lastIntended = call;
      ctx.onIntendedCall?.(call);
    },
  };

  let result: ToolResult<unknown>;
  if (!isToolName(name)) {
    result = err("UNKNOWN_TOOL", `Unknown tool: ${name}`, { name });
  } else if (name === "find_project") {
    result = await findProjectTool(rawArgs, ctxWithCapture);
  } else {
    result = await createTaskTool(rawArgs, ctxWithCapture);
  }

  if (ctx.auditPath) {
    appendAudit(ctx.auditPath, {
      ts: new Date().toISOString(),
      run_id: ctx.runId,
      model: ctx.model ?? "qwen2.5:7b",
      tool: name,
      args: rawArgs,
      result,
      mode: ctx.mode,
      ...(lastIntended ? { intended_call: lastIntended } : {}),
    });
  }

  return result;
}
