import { afterEach, describe, expect, it, vi } from "vitest";
import { createGithubIssuesAdapter } from "../../src/adapters/github-issues.js";
import { dedupeKey } from "../../src/adapters/dedupe.js";

describe("github issues adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("finds a project/label by query", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain("/repos/acme/widgets/labels");
      return Response.json([{ id: 11, name: "Payments" }]);
    });

    const adapter = createGithubIssuesAdapter({
      token: "t",
      owner: "acme",
      repo: "widgets",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await adapter.findProject("pay");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.projectName).toBe("Payments");
      expect(result.data.projectId).toBe("11");
    }
  });

  it("creates an issue and skips duplicates via dedupe marker", async () => {
    const args = {
      title: "Investigate duplicate payment webhooks",
      assignee: "james",
      due_date: "2026-08-11",
      project: "Payments",
    };
    const key = dedupeKey(args.title, args.project, args.due_date);
    const marker = `<!-- dedupe:${key} -->`;

    let createCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/search/issues")) {
        if (createCount === 0) {
          return Response.json({ items: [] });
        }
        return Response.json({
          items: [
            {
              id: 99,
              number: 42,
              title: args.title,
              body: `${marker}\nAssignee: james`,
              state: "open",
            },
          ],
        });
      }

      if (method === "POST" && url.endsWith("/issues")) {
        createCount += 1;
        const body = JSON.parse(String(init?.body)) as {
          title: string;
          body: string;
          labels: string[];
          assignees: string[];
        };
        expect(body.title).toBe(args.title);
        expect(body.labels).toEqual(["Payments"]);
        expect(body.assignees).toEqual(["james"]);
        expect(body.body).toContain(marker);
        return Response.json({
          id: 1,
          number: 42,
          title: args.title,
          body: body.body,
          state: "open",
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    const adapter = createGithubIssuesAdapter({
      token: "t",
      owner: "acme",
      repo: "widgets",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const first = await adapter.createTask(args);
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.data.created).toBe(true);
      expect(first.data.taskId).toBe("42");
    }
    expect(createCount).toBe(1);

    const second = await adapter.createTask(args);
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.data.created).toBe(false);
      expect(second.data.reason).toBe("DUPLICATE_SKIPPED");
      expect(second.data.taskId).toBe("42");
    }
    expect(createCount).toBe(1);
  });
});
