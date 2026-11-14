import express from "express";
import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type Server,
} from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeUpstreamReply, registerChatProxy } from "./chatProxy";

const sessionId = "11111111-1111-4111-8111-111111111111";

async function listen(app: express.Express): Promise<Server> {
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  return server;
}

async function request(
  server: Server,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Test server has no address");
  return await new Promise((resolve, reject) => {
    const req = httpRequest({
      hostname: "127.0.0.1",
      port: address.port,
      path,
      method,
      headers:
        body === undefined ? undefined : { "content-type": "application/json" },
    });
    let responseBody = "";
    req.on("response", (response: IncomingMessage) => {
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => {
        responseBody += chunk;
      });
      response.on("end", () => {
        try {
          resolve({
            status: response.statusCode || 0,
            body: JSON.parse(responseBody),
          });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.FLOWTRACE_CHAT_WEBHOOK_URL;
  delete process.env.FLOWTRACE_CHAT_TIMEOUT_MS;
});

describe("normalizeUpstreamReply", () => {
  it("normalizes plain text, JSON fields, and one-item arrays", () => {
    expect(normalizeUpstreamReply("hello", "text/plain")).toEqual({
      reply: "hello",
    });
    expect(
      normalizeUpstreamReply('{"output":"hello"}', "application/json")
    ).toEqual({
      reply: "hello",
    });
    expect(
      normalizeUpstreamReply('[{"text":"hello"}]', "application/json")
    ).toEqual({
      reply: "hello",
    });
  });

  it("rejects workflow acknowledgments, HTML, and malformed output", () => {
    expect(() =>
      normalizeUpstreamReply("Workflow got started", "text/plain")
    ).toThrow();
    expect(() =>
      normalizeUpstreamReply("<html>provider error</html>", "text/html")
    ).toThrow();
    expect(() =>
      normalizeUpstreamReply('{"unexpected":true}', "application/json")
    ).toThrow();
  });
});

describe("chat proxy", () => {
  it("validates the request before calling the upstream", async () => {
    process.env.FLOWTRACE_CHAT_WEBHOOK_URL = "https://example.invalid/webhook";
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const server = await listen(
      (() => {
        const app = express();
        registerChatProxy(app);
        return app;
      })()
    );
    try {
      const result = await request(server, "POST", "/api/chat", {
        sessionId,
        message: "   ",
        history: [],
        experiments: [],
      });
      expect(result.status).toBe(400);
      expect(result.body).toEqual({
        error: "Invalid chat request.",
        code: "badRequest",
      });
      expect(upstream).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it("returns a safe error for an unregistered 404 webhook", async () => {
    process.env.FLOWTRACE_CHAT_WEBHOOK_URL = "https://example.invalid/webhook";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not registered", { status: 404 }))
    );
    const app = express();
    registerChatProxy(app);
    const server = await listen(app);
    try {
      const result = await request(server, "POST", "/api/chat", {
        sessionId,
        message: "Explain the result",
        history: [],
        experiments: [],
      });
      expect(result.status).toBe(502);
      expect(result.body).toEqual({
        error:
          "Chatbot webhook is not registered; activate the workflow and verify the POST production URL.",
        code: "UNREGISTERED",
      });
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it("reports configuration without making an external request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const app = express();
    registerChatProxy(app);
    const server = await listen(app);
    try {
      const result = await request(server, "GET", "/api/chat/status");
      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        configured: false,
        mode: "n8n",
        memoryVerified: false,
      });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
