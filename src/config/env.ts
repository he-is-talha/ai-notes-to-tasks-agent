/** String env map — avoids depending on the NodeJS namespace in callers/tests. */
export type EnvMap = Record<string, string | undefined>;

export type AppEnv = {
  llmProvider: string;
  ollamaHost: string;
  ollamaModel: string;
  adapter: "sqlite" | "github";
  sqlitePath: string;
  maxToolCalls: number;
};

function readEnv(env: EnvMap, name: string, fallback: string): string {
  const value = env[name];
  if (value === undefined || value === "") {
    return fallback;
  }
  return value;
}

function readPositiveInt(env: EnvMap, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return n;
}

export function loadEnv(env: EnvMap = process.env): AppEnv {
  const adapterRaw = readEnv(env, "ADAPTER", "sqlite").toLowerCase();
  if (adapterRaw !== "sqlite" && adapterRaw !== "github") {
    throw new Error(`ADAPTER must be "sqlite" or "github", got "${adapterRaw}"`);
  }

  return {
    llmProvider: readEnv(env, "LLM_PROVIDER", "ollama").toLowerCase(),
    ollamaHost: readEnv(env, "OLLAMA_HOST", "http://127.0.0.1:11434").replace(
      /\/$/,
      "",
    ),
    ollamaModel: readEnv(env, "OLLAMA_MODEL", "qwen3.5:4b"),
    adapter: adapterRaw,
    sqlitePath: readEnv(env, "SQLITE_PATH", "data/tasks.db"),
    maxToolCalls: readPositiveInt(env, "MAX_TOOL_CALLS", 6),
  };
}
