import { IntendedCallCollector } from "../dry-run/collector.js";
import type { IntendedApiCall } from "../dry-run/types.js";
import type { ChatMessage, ToolCall } from "../llm/types.js";
import type { ToolResult } from "../schema/tool-result.js";
import { dispatchTool } from "../tools/dispatch.js";
import { ollamaTools } from "../tools/registry.js";
import { buildSystemPrompt, buildUserNotesMessage } from "./prompt.js";
import type { AgentInput, AgentReport, StoppedReason } from "./types.js";

function isValidationRefusal(result: ToolResult<unknown>): boolean {
  return !result.ok && result.error.code === "VALIDATION_ERROR";
}

function isDuplicateSkip(result: ToolResult<unknown>): boolean {
  if (!result.ok) return false;
  const data = result.data as { reason?: string };
  return data.reason === "DUPLICATE_SKIPPED";
}

function assistantMessageFromToolCalls(
  content: string,
  toolCalls: ToolCall[],
): ChatMessage {
  return {
    role: "assistant",
    content,
    ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
  };
}

function toolResultMessage(call: ToolCall, result: ToolResult<unknown>): ChatMessage {
  return {
    role: "tool",
    tool_name: call.name,
    content: JSON.stringify(result),
  };
}

export async function runAgent(input: AgentInput): Promise<AgentReport> {
  const { notes, llm, maxToolCalls } = input;
  const collector = new IntendedCallCollector();
  const ctx = {
    ...input.ctx,
    onIntendedCall: (call: IntendedApiCall) => {
      collector.push(call);
      input.ctx.onIntendedCall?.(call);
    },
  };

  const tools = ollamaTools();
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildUserNotesMessage(notes) },
  ];

  let toolCallCount = 0;
  let refusals = 0;
  let duplicateSkips = 0;
  let finalText = "";
  let stoppedReason: StoppedReason = "completed";
  let errorMessage: string | undefined;

  while (true) {
    let response;
    try {
      response = await llm.chat(messages, tools);
    } catch (error) {
      stoppedReason = "model_error";
      errorMessage = error instanceof Error ? error.message : String(error);
      break;
    }

    const { message, toolCalls } = response;
    finalText = message.content;

    if (toolCalls.length === 0) {
      stoppedReason = "completed";
      messages.push({ role: "assistant", content: message.content });
      break;
    }

    messages.push(assistantMessageFromToolCalls(message.content, toolCalls));

    for (const call of toolCalls) {
      if (toolCallCount >= maxToolCalls) {
        stoppedReason = "max_tool_calls";
        break;
      }

      const result = await dispatchTool(call.name, call.arguments, ctx);
      toolCallCount += 1;
      if (isValidationRefusal(result)) refusals += 1;
      if (isDuplicateSkip(result)) duplicateSkips += 1;
      messages.push(toolResultMessage(call, result));
    }

    if (stoppedReason === "max_tool_calls") {
      break;
    }
  }

  return {
    runId: ctx.runId,
    toolCallCount,
    refusals,
    duplicateSkips,
    intendedCalls: collector.snapshot(),
    finalText,
    stoppedReason,
    ...(errorMessage ? { errorMessage } : {}),
  };
}
