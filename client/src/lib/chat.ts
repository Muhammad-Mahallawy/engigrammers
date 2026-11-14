import type {
  ChatExperimentContext,
  ChatHistoryEntry,
  ChatRequest,
} from "@shared/chat";
import { Experiment, sourcePressureRange, sourceUrl } from "./flowtrace";

export const CHAT_STORAGE_KEY = "flowtrace-research-chat-v1";
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "complete" | "pending" | "error" | "stopped";
  error?: string;
  retryPayload?: ChatRequest;
  context?: ChatExperimentContext[];
}
export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
}
export function newConversationId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues)
    globalThis.crypto.getRandomValues(bytes);
  else
    bytes.forEach((_, i) => {
      bytes[i] = Math.floor(Math.random() * 256);
    });
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function freshChatSession(): ChatSession {
  return { sessionId: newConversationId(), messages: [] };
}
export function restoreChatSession(raw: string | null): ChatSession {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (
      !parsed ||
      typeof parsed.sessionId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(parsed.sessionId) ||
      !Array.isArray(parsed.messages)
    )
      return freshChatSession();
    const messages: ChatMessage[] = parsed.messages
      .slice(-40)
      .filter(
        (item: ChatMessage) =>
          item &&
          typeof item.id === "string" &&
          ["user", "assistant"].includes(item.role) &&
          typeof item.content === "string" &&
          item.content.length <= 24000 &&
          ["complete", "pending", "error", "stopped"].includes(item.status)
      )
      .map((item: ChatMessage) =>
        item.status === "pending"
          ? {
              ...item,
              status: "stopped",
              error:
                "This request was interrupted. Retry manually if needed; the previous workflow may still have run.",
            }
          : item
      );
    return { sessionId: parsed.sessionId, messages };
  } catch {
    return freshChatSession();
  }
}
export function loadChatSession(): ChatSession {
  try {
    return restoreChatSession(sessionStorage.getItem(CHAT_STORAGE_KEY));
  } catch {
    return freshChatSession();
  }
}
export function saveChatSession(session: ChatSession): boolean {
  try {
    sessionStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify({ ...session, messages: session.messages.slice(-40) })
    );
    return true;
  } catch {
    return false;
  }
}
export function chatHistory(messages: ChatMessage[]): ChatHistoryEntry[] {
  const history: ChatHistoryEntry[] = [];
  for (let index = 0; index < messages.length - 1; index++) {
    const question = messages[index];
    const answer = messages[index + 1];
    if (
      question.role === "user" &&
      answer.role === "assistant" &&
      question.status === "complete" &&
      answer.status === "complete" &&
      question.content &&
      answer.content
    ) {
      history.push(
        { role: "user", content: question.content.slice(0, 8000) },
        { role: "assistant", content: answer.content.slice(0, 8000) }
      );
      index++;
    }
  }
  return history.slice(-12);
}
export function fitChatRequest(request: ChatRequest): ChatRequest {
  const fitted = { ...request, history: request.history.slice(-12) };
  const bytes = () =>
    new TextEncoder().encode(JSON.stringify(fitted)).byteLength;
  while (bytes() > 60 * 1024 && fitted.history.length)
    fitted.history = fitted.history.slice(2);
  if (bytes() > 60 * 1024)
    throw new Error(
      "This message and its record context are too large. Shorten the question or turn off experiment context."
    );
  return fitted;
}
export function experimentChatContext(
  record: Experiment
): ChatExperimentContext {
  return {
    id: record.id,
    test_id: record.test_id,
    material: record.material,
    investigation: record.investigation,
    thickness_mm: record.thickness_mm ?? null,
    width_mm: record.width_mm ?? null,
    flow_direction: record.flow_direction,
    flow_initial_cm_s: record.flow_initial_cm_s,
    flow_final_cm_s: record.flow_final_cm_s,
    flow_as_recorded: record.flow_as_recorded ?? null,
    flow_change_cm_s: record.flow_change_cm_s ?? null,
    flow_ratio: record.flow_ratio ?? null,
    oxygen_vol_pct: record.oxygen_vol_pct,
    pressure_kpa: record.pressure_kpa,
    outcome: record.outcome,
    outcome_label: record.outcome_label,
    outcome_status: record.outcome_status,
    nasa_notes: record.nasa_notes,
    source_id: record.source_id,
    pdf_page: record.pdf_page,
    source_csv_pressure_range_kpa: sourcePressureRange(record),
    source_url: sourceUrl(record.source_id),
  };
}
export function safeChatUrl(value: string): string | undefined {
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\u0000-\u0020]/.test(value)
  )
    return value;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
export async function sendChatMessage(
  payload: ChatRequest,
  signal: AbortSignal
): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json"))
    throw new Error(
      "The chat server did not return a valid reply. Please check its configuration."
    );
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : "The research assistant is unavailable. Retry manually when the connection is restored."
    );
  if (typeof body.reply !== "string" || !body.reply.trim())
    throw new Error(
      "The workflow returned no answer. Check the n8n response configuration."
    );
  return body.reply;
}
