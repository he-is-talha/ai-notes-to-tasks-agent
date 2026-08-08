import type { TaskAdapter } from "../adapters/types.js";
import type { IntendedApiCall } from "../dry-run/types.js";

export type ToolMode = "dry-run" | "execute";

export type ToolContext = {
  adapter: TaskAdapter;
  mode: ToolMode;
  runId: string;
  onIntendedCall?: (call: IntendedApiCall) => void;
};
