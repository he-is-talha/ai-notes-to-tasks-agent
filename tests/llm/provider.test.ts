import { afterEach, describe, expect, it, vi } from "vitest";
import { loadEnv } from "../../src/config/env.js";
import { createLlmProvider } from "../../src/llm/provider.js";
import { ollamaTools } from "../../src/tools/registry.js";

describe("loadEnv", () => {
  it("defaults to ollama + qwen3.5:4b + sqlite + max 6", () => {
    expect(loadEnv({})).toEqual({
      llmProvider: "ollama",
      ollamaHost: "http://127.0.0.1:11434",
      ollamaModel: "qwen3.5:4b",
      adapter: "sqlite",
      sqlitePath: "data/tasks.db",
      maxToolCalls: 6,
    });
  });
});

describe("createLlmProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects non-ollama providers", () => {
    expect(() =>
      createLlmProvider(loadEnv({ LLM_PROVIDER: "openai" })),
    ).toThrow(/not implemented in Project 4/);
  });

  it("POSTs /api/chat with qwen3.5:4b, tools, and temperature 0.1", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        message: {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: "1",
              function: {
                name: "find_project",
                arguments: { query: "Payments" },
              },
            },
          ],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const env = loadEnv({
      OLLAMA_HOST: "http://127.0.0.1:11434",
      OLLAMA_MODEL: "qwen3.5:4b",
    });
    const llm = createLlmProvider(env);
    const tools = ollamaTools();
    const result = await llm.chat(
      [{ role: "user", content: "find payments" }],
      tools,
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls.at(0) as unknown as
      | [string, RequestInit]
      | undefined;
    expect(call).toBeDefined();
    const [url, init] = call!;
    expect(url).toBe("http://127.0.0.1:11434/api/chat");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as {
      model: string;
      tools: unknown[];
      stream: boolean;
      options: { temperature: number };
    };
    expect(body.model).toBe("qwen3.5:4b");
    expect(body.tools).toHaveLength(2);
    expect(body.stream).toBe(false);
    expect(body.options.temperature).toBe(0.1);

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.name).toBe("find_project");
    expect(result.toolCalls[0]?.arguments).toEqual({ query: "Payments" });
  });
});

describe("live ollama smoke", () => {
  const runLive = process.env.RUN_LIVE_OLLAMA === "1";

  it.skipIf(!runLive)(
    "round-trips one chat with tools against a real Ollama",
    async () => {
      const env = loadEnv(process.env);
      const llm = createLlmProvider(env);
      const result = await llm.chat(
        [
          {
            role: "system",
            content: "You must call find_project for the user request.",
          },
          { role: "user", content: "Find the Payments project." },
        ],
        ollamaTools(),
      );
      expect(result.message.role).toBe("assistant");
    },
    120_000,
  );
});
