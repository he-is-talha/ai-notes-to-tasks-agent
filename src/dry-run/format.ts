import type { IntendedApiCall } from "./types.js";

/** Stable single-line representation of an intended API call (no timestamps). */
export function formatIntendedCall(call: IntendedApiCall): string {
  return JSON.stringify({
    tool: call.tool,
    method: call.method,
    pathOrOp: call.pathOrOp,
    body: call.body,
  });
}

export function formatIntendedCalls(calls: IntendedApiCall[]): string {
  return calls.map(formatIntendedCall).join("\n");
}
