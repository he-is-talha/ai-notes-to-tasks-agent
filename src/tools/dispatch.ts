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
  if (!isToolName(name)) {
    return err("UNKNOWN_TOOL", `Unknown tool: ${name}`, { name });
  }

  if (name === "find_project") {
    return findProjectTool(rawArgs, ctx);
  }

  return createTaskTool(rawArgs, ctx);
}
