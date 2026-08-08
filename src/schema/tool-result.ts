export const TOOL_ERROR_CODES = [
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "DUPLICATE_SKIPPED",
  "ADAPTER_ERROR",
] as const;

export type ToolErrorCode = (typeof TOOL_ERROR_CODES)[number];

export type ToolOk<T> = {
  ok: true;
  data: T;
};

export type ToolErr = {
  ok: false;
  error: {
    code: ToolErrorCode;
    message: string;
    details?: unknown;
  };
};

export type ToolResult<T> = ToolOk<T> | ToolErr;

export function ok<T>(data: T): ToolOk<T> {
  return { ok: true, data };
}

export function err(
  code: ToolErrorCode,
  message: string,
  details?: unknown,
): ToolErr {
  const error: ToolErr["error"] = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  return { ok: false, error };
}
