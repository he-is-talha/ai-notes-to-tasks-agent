import type { TaskAdapter } from "../adapters/types.js";
import type { IntendedApiCall } from "../dry-run/types.js";

export type ToolMode = "dry-run" | "execute";

export type ToolContext = {
  adapter: TaskAdapter;
  mode: ToolMode;
  runId: string;
  /** When set, every dispatched tool call is appended to this JSONL file. */
  auditPath?: string;
  /** Model name recorded in audit entries (default applied at write time). */
  model?: string;
  onIntendedCall?: (call: IntendedApiCall) => void;
};
