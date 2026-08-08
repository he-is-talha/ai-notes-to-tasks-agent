export type IntendedApiCall = {
  tool: "find_project" | "create_task";
  method: "GET" | "POST";
  pathOrOp: string;
  body: Record<string, unknown>;
};
