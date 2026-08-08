import type { IntendedApiCall } from "../dry-run/types.js";
import type { LlmProvider } from "../llm/types.js";
import type { ToolContext } from "../tools/context.js";

export type StoppedReason = "completed" | "max_tool_calls" | "model_error";

export type AgentInput = {
  notes: string;
  ctx: ToolContext;
  llm: LlmProvider;
  maxToolCalls: number;
};

export type AgentReport = {
  runId: string;
  toolCallCount: number;
  refusals: number;
  duplicateSkips: number;
  intendedCalls: IntendedApiCall[];
  finalText: string;
  stoppedReason: StoppedReason;
  errorMessage?: string;
};
