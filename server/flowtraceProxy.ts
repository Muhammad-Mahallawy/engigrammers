import type { Express, NextFunction, Request, Response } from "express";

const DEFAULT_FLOWTRACE_API_URL = "http://127.0.0.1:8000";
const DEFAULT_TIMEOUT_MS = 10_000;
const ALLOWED_SINGLE_SEGMENT_ROUTES = new Set([
  "health",
  "filters",
  "compare",
  "insights",
]);

type FlowtraceRoute = {
  upstreamPath: string;
};

function routeFor(pathname: string): FlowtraceRoute | null {
  if (!pathname.startsWith("/")) return null;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1 && ALLOWED_SINGLE_SEGMENT_ROUTES.has(segments[0])) {
    return { upstreamPath: `/api/${segments[0]}` };
  }
  if (segments.length === 1 && segments[0] === "experiments") {
    return { upstreamPath: "/api/experiments" };
  }
  if (segments.length === 2 && segments[0] === "experiments" && segments[1]) {
    return {
      upstreamPath: `/api/experiments/${encodeURIComponent(segments[1])}`,
    };
  }
  return null;
}

function upstreamOrigin(): URL {
  const configured =
    process.env.FLOWTRACE_API_URL?.trim() || DEFAULT_FLOWTRACE_API_URL;
  const origin = new URL(configured);
  if (!/^https?:$/.test(origin.protocol)) {
    throw new Error("FLOWTRACE_API_URL must use http or https");
  }
  return origin;
}

function timeoutMs(): number {
  const configured = Number(
    process.env.FLOWTRACE_PROXY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS
  );
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_TIMEOUT_MS;
}

function requestQuery(request: Request): string {
  const queryStart = request.originalUrl.indexOf("?");
  return queryStart === -1 ? "" : request.originalUrl.slice(queryStart);
}

function unavailableMessage(error: unknown): string {
  if (error instanceof Error && error.name === "TimeoutError") {
    return "The FLOWTRACE API did not respond before the proxy timeout.";
  }
  if (error instanceof Error && error.message.includes("FLOWTRACE_API_URL")) {
    return error.message;
  }
  return "The FLOWTRACE API is unavailable. Start the FastAPI backend or set FLOWTRACE_API_URL to a reachable upstream.";
}

export async function flowtraceProxy(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  if (request.method !== "GET") {
    response
      .status(405)
      .json({ error: "FLOWTRACE proxy supports GET requests only" });
    return;
  }

  const route = routeFor(request.path);
  if (!route) {
    response.status(404).json({ error: "Unknown FLOWTRACE API route" });
    return;
  }

  try {
    const target = upstreamOrigin();
    target.pathname = route.upstreamPath;
    target.search = requestQuery(request);
    const upstream = await fetch(target, {
      method: "GET",
      headers: { Accept: request.get("accept") || "application/json" },
      signal: AbortSignal.timeout(timeoutMs()),
    });

    const contentType = upstream.headers.get("content-type");
    if (contentType) response.setHeader("Content-Type", contentType);
    const cacheControl = upstream.headers.get("cache-control");
    if (cacheControl) response.setHeader("Cache-Control", cacheControl);
    const body = Buffer.from(await upstream.arrayBuffer());
    response.status(upstream.status).send(body);
  } catch (error) {
    // Keep the proxy failure explicit; never substitute fabricated or stale data.
    response
      .status(502)
      .json({
        error: "FLOWTRACE upstream unavailable",
        detail: unavailableMessage(error),
      });
  }

  // The middleware fully handles all allowlisted requests. This is retained for type-level
  // compatibility with Express middleware consumers that inspect the function signature.
  void next;
}

export function registerFlowtraceProxy(app: Express): void {
  app.use("/api/flowtrace", flowtraceProxy);
}

export const flowtraceProxyDefaults = {
  apiUrl: DEFAULT_FLOWTRACE_API_URL,
  timeoutMs: DEFAULT_TIMEOUT_MS,
};
