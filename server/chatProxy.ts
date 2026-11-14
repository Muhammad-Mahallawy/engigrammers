import express, {
  type ErrorRequestHandler,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { z } from "zod";
import {
  CHAT_HISTORY_MAX,
  CHAT_MESSAGE_MAX,
  type ChatReply,
} from "../shared/chat";

const CHAT_BODY_LIMIT = "64kb";
const UPSTREAM_BODY_MAX = 128 * 1024;
const REPLY_MAX = 24_000;
const DEFAULT_TIMEOUT_MS = 90_000;
const MAX_TIMEOUT_MS = 90_000;
const WINDOW_MS = 60_000;
const SESSION_REQUESTS_PER_WINDOW = 10;
const IP_REQUESTS_PER_WINDOW = 30;
const MAX_IN_FLIGHT = 8;
const MAX_TRACKED_KEYS = 4096;

const boundedNullableString = (max: number) => z.string().max(max).nullable();

const chatExperimentSchema = z
  .object({
    id: z.string().max(256),
    test_id: z.string().max(256),
    material: z.string().max(256),
    investigation: boundedNullableString(2_000),
    thickness_mm: z.number().finite().nullable(),
    width_mm: z.number().finite().nullable(),
    flow_direction: boundedNullableString(128),
    flow_initial_cm_s: z.number().finite().nullable(),
    flow_final_cm_s: z.number().finite().nullable(),
    flow_as_recorded: boundedNullableString(2_000),
    flow_change_cm_s: z.number().finite().nullable(),
    flow_ratio: z.number().finite().nullable(),
    oxygen_vol_pct: z.number().finite().nullable(),
    pressure_kpa: z.number().finite().nullable(),
    outcome: boundedNullableString(2_000),
    outcome_label: boundedNullableString(256),
    outcome_status: z.enum(["recorded", "unspecified", "unknown"]),
    nasa_notes: boundedNullableString(4_000),
    source_id: boundedNullableString(256),
    pdf_page: z.number().int().min(1).max(1_000_000).nullable(),
    source_csv_pressure_range_kpa: boundedNullableString(512),
    source_url: boundedNullableString(2_048),
  })
  .strict();

const chatRequestSchema = z
  .object({
    sessionId: z.string().uuid(),
    message: z.string().trim().min(1).max(CHAT_MESSAGE_MAX),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().max(8_000),
          })
          .strict()
      )
      .max(CHAT_HISTORY_MAX),
    experiments: z.array(chatExperimentSchema).max(4).default([]),
  })
  .strict();

type ValidChatRequest = z.infer<typeof chatRequestSchema>;
type WindowEntry = { startedAt: number; count: number };

const sessionWindows = new Map<string, WindowEntry>();
const ipWindows = new Map<string, WindowEntry>();
const activeSessions = new Set<string>();
let inFlight = 0;

class UpstreamBodyTooLargeError extends Error {
  constructor() {
    super("Upstream response exceeded the body limit");
    this.name = "UpstreamBodyTooLargeError";
  }
}

class InvalidUpstreamReplyError extends Error {
  constructor() {
    super("Upstream response did not contain a valid reply");
    this.name = "InvalidUpstreamReplyError";
  }
}

function sendError(
  response: Response,
  status: number,
  code: string,
  error: string
): void {
  response.set("Cache-Control", "no-store");
  response.status(status).json({ error, code });
}

function configuredWebhook(): URL | null {
  const value = process.env.FLOWTRACE_CHAT_WEBHOOK_URL?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function timeoutMs(): number {
  const value = Number(
    process.env.FLOWTRACE_CHAT_TIMEOUT_MS || DEFAULT_TIMEOUT_MS
  );
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.floor(value), MAX_TIMEOUT_MS);
}

function pruneWindowMap(map: Map<string, WindowEntry>, now: number): void {
  for (const [key, entry] of map) {
    if (now - entry.startedAt >= WINDOW_MS) map.delete(key);
  }
  while (map.size > MAX_TRACKED_KEYS) {
    const oldest = map.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

function allowWindowRequest(
  map: Map<string, WindowEntry>,
  key: string,
  limit: number,
  now: number
): boolean {
  const current = map.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    map.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

function remoteKey(request: Request): string {
  return request.ip || request.socket.remoteAddress || "unknown";
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "::1" ||
    host === "0.0.0.0" ||
    (host.includes(":") && host.startsWith("fc")) ||
    (host.includes(":") && host.startsWith("fd")) ||
    host.startsWith("fe80:")
  ) {
    return true;
  }

  const octets = host.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }
  return (
    octets[0] === 0 ||
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function redactPrivateUrls(value: string): string {
  return value.replace(/\bhttps?:\/\/[^\s<>"']+/gi, candidate => {
    try {
      const url = new URL(candidate);
      return isPrivateHostname(url.hostname)
        ? "[redacted private URL]"
        : candidate;
    } catch {
      return candidate;
    }
  });
}

function normalizeReplyText(value: string): string {
  const reply = redactPrivateUrls(
    value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim()
  );
  if (!reply || reply.length > REPLY_MAX || /<\/?[a-z][^>]*>/i.test(reply)) {
    throw new InvalidUpstreamReplyError();
  }
  if (/^workflow\s+got\s+started[.!]?$/i.test(reply)) {
    throw new InvalidUpstreamReplyError();
  }
  return reply;
}

function isHtmlResponse(body: string, contentType: string): boolean {
  return (
    contentType.toLowerCase().includes("text/html") ||
    /<\/?[a-z][^>]*>/i.test(body)
  );
}

function replyField(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeJsonReply(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length !== 1) throw new InvalidUpstreamReplyError();
    return normalizeJsonReply(value[0]);
  }
  if (!value || typeof value !== "object")
    throw new InvalidUpstreamReplyError();
  const record = value as Record<string, unknown>;
  const reply =
    replyField(record.reply) ??
    replyField(record.output) ??
    replyField(record.text);
  if (reply === null) throw new InvalidUpstreamReplyError();
  return normalizeReplyText(reply);
}

export function normalizeUpstreamReply(
  body: string,
  contentType = ""
): ChatReply {
  if (isHtmlResponse(body, contentType)) throw new InvalidUpstreamReplyError();

  const trimmed = body.trim();
  if (!trimmed) throw new InvalidUpstreamReplyError();
  const looksJson =
    contentType.toLowerCase().includes("json") || /^[\[{]/.test(trimmed);
  if (!looksJson) return { reply: normalizeReplyText(body) };

  try {
    return { reply: normalizeJsonReply(JSON.parse(trimmed)) };
  } catch (error) {
    if (error instanceof InvalidUpstreamReplyError) throw error;
    throw new InvalidUpstreamReplyError();
  }
}

async function readUpstreamBody(
  response: globalThis.Response
): Promise<string> {
  if (!response.body) {
    const body = await response.arrayBuffer();
    if (body.byteLength > UPSTREAM_BODY_MAX)
      throw new UpstreamBodyTooLargeError();
    return new TextDecoder().decode(body);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > UPSTREAM_BODY_MAX) {
        await reader.cancel();
        throw new UpstreamBodyTooLargeError();
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

function upstreamError(error: unknown): {
  status: number;
  code: string;
  message: string;
} {
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return {
      status: 504,
      code: "timeout",
      message: "The chatbot upstream timed out.",
    };
  }
  return {
    status: 502,
    code: "upstreamUnavailable",
    message:
      "The chatbot upstream is unavailable or returned an invalid reply.",
  };
}

async function handleChat(request: Request, response: Response): Promise<void> {
  const parsed = chatRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "badRequest", "Invalid chat request.");
    return;
  }

  const webhook = configuredWebhook();
  if (!webhook) {
    sendError(
      response,
      503,
      "notConfigured",
      "Chatbot upstream is not configured."
    );
    return;
  }

  const now = Date.now();
  pruneWindowMap(sessionWindows, now);
  pruneWindowMap(ipWindows, now);
  const chatRequest = parsed.data;
  const ip = remoteKey(request);
  if (
    inFlight >= MAX_IN_FLIGHT ||
    activeSessions.has(chatRequest.sessionId) ||
    !allowWindowRequest(
      sessionWindows,
      chatRequest.sessionId,
      SESSION_REQUESTS_PER_WINDOW,
      now
    ) ||
    !allowWindowRequest(ipWindows, ip, IP_REQUESTS_PER_WINDOW, now)
  ) {
    sendError(response, 429, "rateLimit", "Chat request rate limit exceeded.");
    return;
  }

  inFlight += 1;
  activeSessions.add(chatRequest.sessionId);
  try {
    const upstreamPayload = {
      action: "sendMessage",
      sessionId: chatRequest.sessionId,
      chatInput: chatRequest.message,
      history: chatRequest.history,
      context: {
        application: "FLOWTRACE",
        experiments: chatRequest.experiments,
      },
    };
    const upstream = await fetch(webhook, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(upstreamPayload),
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs()),
    });

    if (upstream.status === 404) {
      sendError(
        response,
        502,
        "UNREGISTERED",
        "Chatbot webhook is not registered; activate the workflow and verify the POST production URL."
      );
      return;
    }
    if (upstream.status === 429) {
      sendError(
        response,
        429,
        "rateLimit",
        "Chatbot upstream rate limit exceeded."
      );
      return;
    }
    if (!upstream.ok) {
      sendError(
        response,
        502,
        "upstreamUnavailable",
        "The chatbot upstream is unavailable."
      );
      return;
    }

    const body = await readUpstreamBody(upstream);
    const normalized = normalizeUpstreamReply(
      body,
      upstream.headers.get("content-type") || ""
    );
    response.set("Cache-Control", "no-store");
    response.json(normalized);
  } catch (error) {
    const mapped = upstreamError(error);
    sendError(response, mapped.status, mapped.code, mapped.message);
  } finally {
    inFlight -= 1;
    activeSessions.delete(chatRequest.sessionId);
  }
}

const chatParserError: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next
) => {
  const parserError = error as { type?: string };
  if (parserError.type === "entity.too.large") {
    sendError(response, 413, "tooLarge", "Chat request body is too large.");
    return;
  }
  sendError(response, 400, "badRequest", "Invalid JSON chat request.");
};

export function registerChatProxy(app: Express): void {
  app.get("/api/chat/status", (_request, response) => {
    response.set("Cache-Control", "no-store");
    response.json({
      configured: configuredWebhook() !== null,
      mode: "n8n",
      memoryVerified: false,
    });
  });
  app.post(
    "/api/chat",
    express.json({ limit: CHAT_BODY_LIMIT, strict: true }),
    chatParserError,
    (request: Request, response: Response, next: NextFunction) => {
      void handleChat(request, response).catch(next);
    }
  );
  app.all("/api/chat", (_request, response) => {
    sendError(
      response,
      405,
      "methodNotAllowed",
      "Chat messages must use POST."
    );
  });
}
