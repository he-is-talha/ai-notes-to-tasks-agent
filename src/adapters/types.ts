import type { CreateTaskArgs } from "../schema/tool-args.js";
import type { ToolResult } from "../schema/tool-result.js";

export type FindProjectData = {
  projectId: string;
  projectName: string;
};

export type CreateTaskData = {
  taskId: string;
  title: string;
  assignee: string;
  due_date: string;
  projectId: string;
  projectName: string;
  dedupeKey: string;
  created: boolean;
  reason?: "DUPLICATE_SKIPPED";
};

export type FindProjectResult = ToolResult<FindProjectData>;
export type CreateTaskResult = ToolResult<CreateTaskData>;

export type TaskAdapter = {
  findProject(query: string): Promise<FindProjectResult>;
  createTask(args: CreateTaskArgs): Promise<CreateTaskResult>;
};
