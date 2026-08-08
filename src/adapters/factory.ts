import type { AppEnv } from "../config/env.js";
import { createGithubIssuesAdapter } from "./github-issues.js";
import { createSqliteAdapter, type SqliteAdapter } from "./sqlite.js";
import type { TaskAdapter } from "./types.js";

export type ClosableTaskAdapter = TaskAdapter & {
  seedIfEmpty?: () => number;
  countTasks?: () => number;
  close?: () => void;
};

/**
 * Build the configured task adapter.
 * SQLite is the default offline demo path. GitHub Issues is env-gated.
 */
export function createAdapter(env: AppEnv): ClosableTaskAdapter {
  if (env.adapter === "github") {
    if (!env.githubToken || !env.githubOwner || !env.githubRepo) {
      throw new Error(
        "ADAPTER=github requires GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO",
      );
    }
    return createGithubIssuesAdapter({
      token: env.githubToken,
      owner: env.githubOwner,
      repo: env.githubRepo,
    });
  }

  return createSqliteAdapter(env.sqlitePath);
}

export function createSqliteAdapterFromEnv(env: AppEnv): SqliteAdapter {
  if (env.adapter !== "sqlite") {
    throw new Error(`Expected ADAPTER=sqlite, got ${env.adapter}`);
  }
  return createSqliteAdapter(env.sqlitePath);
}
