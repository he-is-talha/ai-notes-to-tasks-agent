import type { ZodType } from "zod";
import { zodToParameters } from "../schema/json-schema.js";
import {
  CreateTaskArgsSchema,
  FindProjectArgsSchema,
} from "../schema/tool-args.js";
import type { OllamaToolDef } from "./types.js";

export const TOOL_NAMES = ["find_project", "create_task"] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

const TOOL_META: Record<
  ToolName,
  { description: string; schema: ZodType }
> = {
  find_project: {
    description:
      "Find a project/board by short name or keyword. Returns matching project id and name.",
    schema: FindProjectArgsSchema,
  },
  create_task: {
    description:
      "Create one task with title, assignee, ISO due_date (YYYY-MM-DD), and project name or id.",
    schema: CreateTaskArgsSchema,
  },
};

export function getToolSchema(name: ToolName): ZodType {
  return TOOL_META[name].schema;
}

export function ollamaTools(): OllamaToolDef[] {
  return TOOL_NAMES.map((name) => {
    const meta = TOOL_META[name];
    return {
      type: "function" as const,
      function: {
        name,
        description: meta.description,
        parameters: zodToParameters(meta.schema),
      },
    };
  });
}
