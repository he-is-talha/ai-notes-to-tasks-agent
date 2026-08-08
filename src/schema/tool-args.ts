import { z } from "zod";

export const FindProjectArgsSchema = z.object({
  query: z.string().trim().min(1).max(120),
});

export const CreateTaskArgsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  assignee: z.string().trim().min(1).max(80),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  project: z.string().trim().min(1).max(120),
});

export type FindProjectArgs = z.infer<typeof FindProjectArgsSchema>;
export type CreateTaskArgs = z.infer<typeof CreateTaskArgsSchema>;
