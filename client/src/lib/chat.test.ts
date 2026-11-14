import { describe, expect, it } from "vitest";
import {
  chatHistory,
  experimentChatContext,
  freshChatSession,
  restoreChatSession,
  safeChatUrl,
} from "./chat";
import type { ChatMessage } from "./chat";
import type { Experiment } from "./flowtrace";

describe("research chat state and safety", () => {
  it("starts distinct anonymous conversations", () => {
    const a = freshChatSession();
    const b = freshChatSession();
    expect(a.sessionId).not.toBe(b.sessionId);
    expect(a.messages).toEqual([]);
  });
  it("restores messages while turning interrupted requests into explicit stopped states", () => {
    const session = freshChatSession();
    session.messages = [
      { id: "question", role: "user", content: "Question", status: "complete" },
      { id: "reply", role: "assistant", content: "", status: "pending" },
    ];
    const restored = restoreChatSession(JSON.stringify(session));
    expect(restored.sessionId).toBe(session.sessionId);
    expect(restored.messages[1].status).toBe("stopped");
    expect(restored.messages[1].error).toContain("interrupted");
  });
  it("rejects corrupt storage and limits history to completed turn pairs", () => {
    expect(restoreChatSession("{bad").messages).toEqual([]);
    const messages: ChatMessage[] = [
      { id: "q1", role: "user", content: "First", status: "complete" },
      { id: "a1", role: "assistant", content: "Answer", status: "complete" },
      { id: "q2", role: "user", content: "Failed", status: "complete" },
      { id: "a2", role: "assistant", content: "", status: "error" },
    ];
    expect(chatHistory(messages)).toEqual([
      { role: "user", content: "First" },
      { role: "assistant", content: "Answer" },
    ]);
  });
  it("rejects dangerous links and permits ordinary source links", () => {
    expect(safeChatUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeChatUrl("data:text/html,bad")).toBeUndefined();
    expect(safeChatUrl("//external.example")).toBeUndefined();
    expect(safeChatUrl("/evidence")).toBe("/evidence");
    expect(
      safeChatUrl("https://ntrs.nasa.gov/citations/20210011385")
    ).toContain("ntrs.nasa.gov");
  });
  it("preserves missing API values and separately labels supplied CSV pressure ranges", () => {
    const record = {
      id: "bass2-B1",
      test_id: "B1",
      material: "PMMA",
      source_id: "bass2-summary",
      pressure_kpa: null,
      flow_final_cm_s: null,
      outcome_status: "unknown",
      outcome: null,
      nasa_notes: null,
    } as Experiment;
    const context = experimentChatContext(record);
    expect(context.pressure_kpa).toBeNull();
    expect(context.flow_final_cm_s).toBeNull();
    expect(context.source_csv_pressure_range_kpa).toBe("99.2–99.5");
    expect(context.outcome_status).toBe("unknown");
  });
});

import { fitChatRequest } from "./chat";
import type { ChatRequest } from "../../../shared/chat";
describe("chat payload budget", () => {
  it("drops oldest completed history pairs before exceeding the JSON parser byte limit", () => {
    const request: ChatRequest = {
      sessionId: freshChatSession().sessionId,
      message: "Current question",
      experiments: [],
      history: Array.from({ length: 12 }, (_, i) => ({
        role: i % 2 ? "assistant" : "user",
        content: "漢".repeat(8000),
      })),
    };
    const fitted = fitChatRequest(request);
    expect(
      new TextEncoder().encode(JSON.stringify(fitted)).byteLength
    ).toBeLessThanOrEqual(60 * 1024);
    expect(fitted.history.length % 2).toBe(0);
    expect(fitted.message).toBe(request.message);
    expect(fitted.experiments).toEqual([]);
    expect(request.history).toHaveLength(12);
  });
});

describe("complete scientific record context", () => {
  it("preserves dimensions and recorded/derived airflow alongside pressure provenance", () => {
    const record = {
      id: "bass2-test",
      test_id: "TEST",
      material: "SIBAL fabric",
      thickness_mm: 0.25,
      width_mm: 20,
      flow_as_recorded: "10 to 2.2",
      flow_initial_cm_s: 10,
      flow_final_cm_s: 2.2,
      flow_change_cm_s: -7.8,
      flow_ratio: 0.22,
      pressure_kpa: 101,
      source_id: "bass2-summary",
    } as Experiment;
    const context = experimentChatContext(record);
    expect(context.id).toBe(record.id);
    expect(context.thickness_mm).toBe(0.25);
    expect(context.width_mm).toBe(20);
    expect(context.flow_as_recorded).toBe(record.flow_as_recorded);
    expect(context.flow_change_cm_s).toBe(-7.8);
    expect(context.flow_ratio).toBe(0.22);
  });
});
