import { dedupeKey } from "./dedupe.js";
import type { CreateTaskArgs } from "../schema/tool-args.js";
import { err, ok } from "../schema/tool-result.js";
import type {
  CreateTaskResult,
  FindProjectResult,
  TaskAdapter,
} from "./types.js";

export type GithubIssuesAdapterOptions = {
  token: string;
  owner: string;
  repo: string;
  /** Injected for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  apiBase?: string;
};

type GithubLabel = {
  id: number;
  name: string;
};

type GithubIssue = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
};

function encodeDedupeMarker(key: string): string {
  return `<!-- dedupe:${key} -->`;
}

export function createGithubIssuesAdapter(
  opts: GithubIssuesAdapterOptions,
): TaskAdapter {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const apiBase = (opts.apiBase ?? "https://api.github.com").replace(/\/$/, "");
  const repoPath = `/repos/${opts.owner}/${opts.repo}`;

  async function gh<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ ok: true; data: T } | { ok: false; status: number; text: string }> {
    const response = await fetchImpl(`${apiBase}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${opts.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        text: await response.text(),
      };
    }
    if (response.status === 204) {
      return { ok: true, data: undefined as T };
    }
    return { ok: true, data: (await response.json()) as T };
  }

  return {
    async findProject(query: string): Promise<FindProjectResult> {
      const trimmed = query.trim();
      if (!trimmed) {
        return err("NOT_FOUND", "No project matched the query", { query });
      }

      const result = await gh<GithubLabel[]>("GET", `${repoPath}/labels?per_page=100`);
      if (!result.ok) {
        return err(
          "ADAPTER_ERROR",
          `GitHub labels failed (${result.status}): ${result.text.slice(0, 300)}`,
        );
      }

      const needle = trimmed.toLowerCase();
      const match = result.data.find((label) =>
        label.name.toLowerCase().includes(needle),
      );
      if (!match) {
        return err("NOT_FOUND", `No label matched query: ${trimmed}`, {
          query: trimmed,
        });
      }

      return ok({
        projectId: String(match.id),
        projectName: match.name,
      });
    },

    async createTask(args: CreateTaskArgs): Promise<CreateTaskResult> {
      const key = dedupeKey(args.title, args.project, args.due_date);
      const marker = encodeDedupeMarker(key);

      const search = await gh<{ items: GithubIssue[] }>(
        "GET",
        `/search/issues?q=${encodeURIComponent(
          `repo:${opts.owner}/${opts.repo} is:issue is:open ${marker}`,
        )}&per_page=5`,
      );

      if (!search.ok) {
        return err(
          "ADAPTER_ERROR",
          `GitHub issue search failed (${search.status}): ${search.text.slice(0, 300)}`,
        );
      }

      const existing = search.data.items.find((issue) =>
        (issue.body ?? "").includes(marker),
      );
      if (existing) {
        return ok({
          taskId: String(existing.number),
          title: existing.title,
          assignee: args.assignee,
          due_date: args.due_date,
          projectId: args.project,
          projectName: args.project,
          dedupeKey: key,
          created: false,
          reason: "DUPLICATE_SKIPPED",
        });
      }

      const body = [
        marker,
        "",
        `Assignee: ${args.assignee}`,
        `Due date: ${args.due_date}`,
        `Project: ${args.project}`,
      ].join("\n");

      const created = await gh<GithubIssue>("POST", `${repoPath}/issues`, {
        title: args.title,
        body,
        labels: [args.project],
        assignees: [args.assignee],
      });

      if (!created.ok) {
        // Retry without assignees if GitHub rejects the login.
        if (created.status === 422) {
          const retry = await gh<GithubIssue>("POST", `${repoPath}/issues`, {
            title: args.title,
            body,
            labels: [args.project],
          });
          if (!retry.ok) {
            return err(
              "ADAPTER_ERROR",
              `GitHub create issue failed (${retry.status}): ${retry.text.slice(0, 300)}`,
            );
          }
          return ok({
            taskId: String(retry.data.number),
            title: retry.data.title,
            assignee: args.assignee,
            due_date: args.due_date,
            projectId: args.project,
            projectName: args.project,
            dedupeKey: key,
            created: true,
          });
        }

        return err(
          "ADAPTER_ERROR",
          `GitHub create issue failed (${created.status}): ${created.text.slice(0, 300)}`,
        );
      }

      return ok({
        taskId: String(created.data.number),
        title: created.data.title,
        assignee: args.assignee,
        due_date: args.due_date,
        projectId: args.project,
        projectName: args.project,
        dedupeKey: key,
        created: true,
      });
    },
  };
}
