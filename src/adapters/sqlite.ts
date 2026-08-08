import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { dedupeKey } from "./dedupe.js";
import { seedDemoProjects } from "./seed.js";
import type {
  CreateTaskResult,
  FindProjectResult,
  TaskAdapter,
} from "./types.js";
import type { CreateTaskArgs } from "../schema/tool-args.js";
import { err, ok } from "../schema/tool-result.js";
import { normalizeProject } from "../schema/normalize.js";

export type SqliteAdapterOptions = {
  /** Override path to the projects catalog (default: samples/projects). */
  projectsFilePath?: string;
};

type ProjectRow = {
  id: string;
  name: string;
};

type TaskRow = {
  id: string;
  title: string;
  assignee: string;
  due_date: string;
  project_id: string;
  dedupe_key: string;
};

export type SqliteAdapter = TaskAdapter & {
  db: Database.Database;
  seedIfEmpty(): number;
  countTasks(): number;
  close(): void;
};

export function createSqliteAdapter(
  dbPath: string,
  options: SqliteAdapterOptions = {},
): SqliteAdapter {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      assignee TEXT NOT NULL,
      due_date TEXT NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id),
      dedupe_key TEXT NOT NULL UNIQUE
    );
  `);

  const insertProjectStmt = db.prepare(
    `INSERT INTO projects (id, name) VALUES (@id, @name)`,
  );
  const countProjectsStmt = db.prepare(`SELECT COUNT(*) AS count FROM projects`);
  const findByLikeStmt = db.prepare(
    `SELECT id, name FROM projects
     WHERE lower(name) LIKE '%' || lower(@query) || '%'
     ORDER BY name ASC
     LIMIT 1`,
  );
  const findByIdStmt = db.prepare(`SELECT id, name FROM projects WHERE id = @id`);
  const findByNameStmt = db.prepare(
    `SELECT id, name FROM projects WHERE lower(name) = lower(@name)`,
  );
  const findTaskByDedupeStmt = db.prepare(
    `SELECT id, title, assignee, due_date, project_id, dedupe_key
     FROM tasks WHERE dedupe_key = @dedupe_key`,
  );
  const insertTaskStmt = db.prepare(
    `INSERT INTO tasks (id, title, assignee, due_date, project_id, dedupe_key)
     VALUES (@id, @title, @assignee, @due_date, @project_id, @dedupe_key)`,
  );
  const countTasksStmt = db.prepare(`SELECT COUNT(*) AS count FROM tasks`);

  function resolveProject(project: string): ProjectRow | undefined {
    const byId = findByIdStmt.get({ id: project }) as ProjectRow | undefined;
    if (byId) return byId;

    const byName = findByNameStmt.get({ name: project }) as ProjectRow | undefined;
    if (byName) return byName;

    // Allow normalized equality when casing/whitespace differs.
    const normalized = normalizeProject(project);
    const all = db.prepare(`SELECT id, name FROM projects`).all() as ProjectRow[];
    return all.find((row) => normalizeProject(row.name) === normalized);
  }

  const adapter: SqliteAdapter = {
    db,

    seedIfEmpty(): number {
      const { count } = countProjectsStmt.get() as { count: number };
      if (count > 0) return 0;
      const inserted = seedDemoProjects((name) => {
        const row = { id: randomUUID(), name };
        insertProjectStmt.run(row);
        return row;
      }, options.projectsFilePath);
      return inserted.length;
    },

    countTasks(): number {
      const { count } = countTasksStmt.get() as { count: number };
      return count;
    },

    close(): void {
      db.close();
    },

    async findProject(query: string): Promise<FindProjectResult> {
      const trimmed = query.trim();
      if (!trimmed) {
        return err("NOT_FOUND", "No project matched the query", { query });
      }
      const row = findByLikeStmt.get({ query: trimmed }) as ProjectRow | undefined;
      if (!row) {
        return err("NOT_FOUND", `No project matched query: ${trimmed}`, { query: trimmed });
      }
      return ok({ projectId: row.id, projectName: row.name });
    },

    async createTask(args: CreateTaskArgs): Promise<CreateTaskResult> {
      const project = resolveProject(args.project);
      if (!project) {
        return err("NOT_FOUND", `Project not found: ${args.project}`, {
          project: args.project,
        });
      }

      const key = dedupeKey(args.title, project.name, args.due_date);
      const existing = findTaskByDedupeStmt.get({ dedupe_key: key }) as
        | TaskRow
        | undefined;

      if (existing) {
        return ok({
          taskId: existing.id,
          title: existing.title,
          assignee: existing.assignee,
          due_date: existing.due_date,
          projectId: project.id,
          projectName: project.name,
          dedupeKey: key,
          created: false,
          reason: "DUPLICATE_SKIPPED",
        });
      }

      const taskId = randomUUID();
      insertTaskStmt.run({
        id: taskId,
        title: args.title,
        assignee: args.assignee,
        due_date: args.due_date,
        project_id: project.id,
        dedupe_key: key,
      });

      return ok({
        taskId,
        title: args.title,
        assignee: args.assignee,
        due_date: args.due_date,
        projectId: project.id,
        projectName: project.name,
        dedupeKey: key,
        created: true,
      });
    },
  };

  return adapter;
}
