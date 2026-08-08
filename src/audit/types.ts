import type { IntendedApiCall } from "../dry-run/types.js";
import type { ToolMode } from "../tools/context.js";
import type { ToolResult } from "../schema/tool-result.js";

export type AuditEntry = {
  ts: string;
  run_id: string;
  model: string;
  tool: string;
  args: unknown;
  result: ToolResult<unknown>;
  mode: ToolMode;
  intended_call?: IntendedApiCall;
};
