import type { AppEnv } from "../config/env.js";
import { createSqliteAdapter, type SqliteAdapter } from "./sqlite.js";
import type { TaskAdapter } from "./types.js";

/**
 * Build the configured task adapter.
 * SQLite is the default offline demo path. GitHub Issues is env-gated later.
 */
export function createAdapter(env: AppEnv): TaskAdapter {
  if (env.adapter === "github") {
    throw new Error(
      'ADAPTER=github is not wired yet. Set ADAPTER=sqlite for the local demo.',
    );
  }
  return createSqliteAdapter(env.sqlitePath);
}

export function createSqliteAdapterFromEnv(env: AppEnv): SqliteAdapter {
  if (env.adapter !== "sqlite") {
    throw new Error(`Expected ADAPTER=sqlite, got ${env.adapter}`);
  }
  return createSqliteAdapter(env.sqlitePath);
}
