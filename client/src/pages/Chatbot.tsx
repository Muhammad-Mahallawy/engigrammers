import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Database,
  ExternalLink,
  MessageSquare,
  Orbit,
  Plus,
  Send,
  ShieldCheck,
  Square,
  Sparkles,
} from "lucide-react";
import type { ChatRequest } from "@shared/chat";
import { CHAT_MESSAGE_MAX } from "@shared/chat";
import { Experiment, sourcePdf, outcomeInfo } from "@/lib/flowtrace";
import {
  ChatMessage as Message,
  chatHistory,
  experimentChatContext,
  freshChatSession,
  fitChatRequest,
  loadChatSession,
  newConversationId,
  saveChatSession,
  sendChatMessage,
} from "@/lib/chat";
import ChatMessage from "@/components/ChatMessage";

interface Props {
  selectedRecords: Experiment[];
  dataAvailable: boolean;
  onDetail: (record: Experiment) => void;
}
const suggestions = [
  {
    label: "Understand the physics",
    text: "What is low-flow quenching?",
    icon: Orbit,
  },
  {
    label: "Read the measurements",
    text: "Explain the difference between initial and final airflow.",
    icon: Database,
  },
  {
    label: "Investigate uncertainty",
    text: "Why are some final outcomes unspecified?",
    icon: BookOpen,
  },
];

export default function Chatbot({
  selectedRecords,
  dataAvailable,
  onDetail,
}: Props) {
  const [session, setSession] = useState(loadChatSession);
  const [draft, setDraft] = useState("");
  const [includeContext, setIncludeContext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [atBottom, setAtBottom] = useState(true);
  const [composerError, setComposerError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const pendingId = useRef<string | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const status = useQuery({
    queryKey: ["chat-status"],
    queryFn: async () => {
      const response = await fetch("/api/chat/status", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Chat configuration unavailable");
      return response.json() as Promise<{
        configured: boolean;
        mode: string;
        memoryVerified: boolean;
      }>;
    },
    retry: false,
    staleTime: 30000,
  });

  useEffect(() => {
    setStorageAvailable(saveChatSession(session));
  }, [session]);
  useEffect(() => {
    if (atBottom)
      scroll.current?.scrollTo({
        top: scroll.current.scrollHeight,
        behavior: "instant",
      });
  }, [session.messages, atBottom]);
  useEffect(
    () => () => {
      controller.current?.abort();
      controller.current = null;
    },
    []
  );
  const records = dataAvailable ? selectedRecords.slice(0, 4) : [];
  const updateMessage = (id: string, patch: Partial<Message>) =>
    setSession(previous => ({
      ...previous,
      messages: previous.messages.map(message =>
        message.id === id ? { ...message, ...patch } : message
      ),
    }));

  const execute = async (payload: ChatRequest, answerId: string) => {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    pendingId.current = answerId;
    setBusy(true);
    try {
      const reply = await sendChatMessage(payload, abort.signal);
      if (controller.current === abort)
        updateMessage(answerId, {
          content: reply,
          status: "complete",
          error: undefined,
          retryPayload: undefined,
        });
    } catch (error) {
      if (controller.current === abort)
        updateMessage(answerId, {
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "The workflow could not be reached. Retry manually when it is available.",
        });
    } finally {
      if (controller.current === abort) {
        controller.current = null;
        pendingId.current = null;
        setBusy(false);
      }
    }
  };
  const send = () => {
    const message = draft.trim();
    if (
      !message ||
      message.length > CHAT_MESSAGE_MAX ||
      controller.current ||
      status.data?.configured === false
    )
      return;
    const context = includeContext ? records.map(experimentChatContext) : [];
    let payload: ChatRequest;
    try {
      payload = fitChatRequest({
        sessionId: session.sessionId,
        message,
        history: chatHistory(session.messages),
        experiments: context,
      });
      setComposerError("");
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : "This request is too large."
      );
      return;
    }
    const answerId = newConversationId();
    setAtBottom(true);
    setSession(previous => ({
      ...previous,
      messages: [
        ...previous.messages,
        {
          id: newConversationId(),
          role: "user",
          content: message,
          status: "complete",
          context,
        },
        {
          id: answerId,
          role: "assistant",
          content: "",
          status: "pending",
          retryPayload: payload,
        },
      ],
    }));
    setDraft("");
    void execute(payload, answerId);
  };
  const stop = () => {
    controller.current?.abort();
    controller.current = null;
    if (pendingId.current)
      updateMessage(pendingId.current, {
        status: "stopped",
        error:
          "Waiting stopped locally. The n8n workflow may still finish; retrying can run it again.",
      });
    pendingId.current = null;
    setBusy(false);
  };
  const newChat = () => {
    controller.current?.abort();
    controller.current = null;
    pendingId.current = null;
    setBusy(false);
    setSession(freshChatSession());
    setDraft("");
    setComposerError("");
    setIncludeContext(false);
    setAtBottom(true);
    composer.current?.focus();
  };
  const retry = (message: Message) => {
    if (!message.retryPayload || controller.current) return;
    updateMessage(message.id, { status: "pending", error: undefined });
    void execute(message.retryPayload, message.id);
  };

  return (
    <>
      <section className="chat-page-heading">
        <div>
          <span className="eyebrow">A CONVERSATION WITH THE SCIENCE</span>
          <h1>
            Questions beyond the data<span className="cyan">.</span>
          </h1>
          <p>Ask about the experiments. Follow the evidence.</p>
        </div>
        <div
          className={`chat-service-pill ${status.data?.configured ? "configured" : ""}`}
        >
          <i />
          {status.isPending
            ? "Checking configuration"
            : status.data?.configured
              ? "n8n configured"
              : "Chat not configured"}
        </div>
      </section>
      {!storageAvailable && (
        <div className="notice chat-status-notice">
          Session storage is unavailable. This conversation will not survive
          leaving this tab.
        </div>
      )}
      {status.data?.configured === false && (
        <div className="notice chat-status-notice">
          Set FLOWTRACE_CHAT_WEBHOOK_URL in the frontend server environment and
          restart that server. No substitute assistant is used.
        </div>
      )}
      <div className="chat-layout">
        <section
          className="panel chat-console"
          aria-label="Research assistant conversation"
        >
          <div className="chat-console-head">
            <span className="chat-console-icon">
              <Orbit size={21} />
            </span>
            <div>
              <h2>FLOWTRACE Research Assistant</h2>
              <p>AI interpretation. Original evidence matters.</p>
            </div>
            <button
              className="secondary-button chat-new"
              onClick={newChat}
              title="Clear the local conversation and start a new session"
            >
              <Plus size={14} /> New chat
            </button>
          </div>
          <div
            className="chat-transcript"
            ref={scroll}
            role="log"
            aria-label="Chat messages"
            aria-live="polite"
            aria-relevant="additions text"
            onScroll={() => {
              const el = scroll.current;
              if (el)
                setAtBottom(
                  el.scrollHeight - el.scrollTop - el.clientHeight < 70
                );
            }}
          >
            {!session.messages.length ? (
              <div className="chat-empty">
                <div className="chat-empty-orbit">
                  <MessageSquare size={26} />
                  <i />
                  <i />
                </div>
                <span className="eyebrow">CURIOSITY IS THE FIRST VARIABLE</span>
                <h3>Where should we investigate?</h3>
                <p>
                  Explore combustion, understand experimental conditions,
                  <br className="desktop-break" /> or ask about a record you've
                  selected.
                </p>
                <div className="chat-suggestions">
                  {suggestions.map(item => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setDraft(item.text);
                        composer.current?.focus();
                      }}
                    >
                      <item.icon size={17} />
                      <span>
                        <small>{item.label}</small>
                        {item.text}
                      </span>
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                </div>
                <span className="chat-empty-foot">
                  Suggestions fill your question. You decide when to send.
                </span>
              </div>
            ) : (
              session.messages.map(message => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  busy={busy}
                  onRetry={() => retry(message)}
                />
              ))
            )}
          </div>
          {!atBottom && (
            <button
              className="chat-jump"
              onClick={() => {
                setAtBottom(true);
                scroll.current?.scrollTo({
                  top: scroll.current.scrollHeight,
                  behavior: "smooth",
                });
              }}
            >
              <ArrowDown size={12} /> Latest messages
            </button>
          )}
          <form
            className="chat-composer"
            onSubmit={event => {
              event.preventDefault();
              send();
            }}
          >
            {includeContext && records.length > 0 && (
              <div className="chat-context-composer">
                <Database size={11} /> Including{" "}
                {records.map(record => record.test_id).join(", ")}
              </div>
            )}
            <label className="sr-only" htmlFor="chat-question">
              Your question to the FLOWTRACE assistant
            </label>
            <div className="chat-compose-field">
              <textarea
                id="chat-question"
                ref={composer}
                value={draft}
                onChange={event => setDraft(event.target.value)}
                maxLength={CHAT_MESSAGE_MAX}
                placeholder="Ask about the science, a measurement, or an experiment…"
                rows={2}
                onKeyDown={event => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    send();
                  }
                }}
              />
              {busy ? (
                <button
                  type="button"
                  className="chat-send stopping"
                  onClick={stop}
                  aria-label="Stop waiting for the response"
                  title="Stop waiting (the workflow may continue)"
                >
                  <Square size={15} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="chat-send"
                  disabled={!draft.trim() || status.data?.configured === false}
                  aria-label="Send message"
                >
                  <Send size={17} />
                </button>
              )}
            </div>
            <div className="chat-composer-meta">
              <span>Enter to send · Shift + Enter for a new line</span>
              <span>
                {draft.length}/{CHAT_MESSAGE_MAX}
              </span>
            </div>
            {composerError && (
              <p className="chat-composer-error" role="alert">
                {composerError}
              </p>
            )}
          </form>
        </section>
        <aside
          className="chat-side"
          aria-label="Experiment context and assistant limitations"
        >
          <section className="panel chat-context-panel">
            <span className="eyebrow">GIVE YOUR QUESTION CONTEXT</span>
            <h2>Bring the evidence.</h2>
            <p>
              Optionally send the experiments selected in Explorer or Compare
              with your question.
            </p>
            <label className="chat-context-toggle">
              <input
                type="checkbox"
                checked={includeContext}
                disabled={!records.length}
                onChange={event => setIncludeContext(event.target.checked)}
              />
              <span>Include selected experiments</span>
              <span className="chat-toggle-track" aria-hidden="true" />
            </label>
            {!dataAvailable ? (
              <div className="chat-context-empty">
                Experiment API unavailable. You can still ask questions, but no
                record context will be sent.
              </div>
            ) : !records.length ? (
              <div className="chat-context-empty">
                No experiments selected.
                <Link href="/">
                  Choose in Explorer <ArrowUpRight size={12} />
                </Link>
              </div>
            ) : (
              <div className="chat-context-records">
                {records.map(record => (
                  <div
                    key={record.test_id}
                    className={includeContext ? "included" : ""}
                  >
                    <button onClick={() => onDetail(record)}>
                      <strong>{record.test_id}</strong>
                      <ArrowUpRight size={13} />
                    </button>
                    <span>
                      {record.material} · {outcomeInfo(record.outcome).label}
                    </span>
                    <small>
                      {includeContext
                        ? "Included with your next message"
                        : "Not sent — context is off"}
                    </small>
                    {record.source_id === "bass2-summary" && (
                      <a
                        href={sourcePdf(record.pdf_page)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Source page {record.pdf_page ?? "not recorded"}{" "}
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            <small className="chat-context-note">
              These are supplied record references, not proof that the AI has
              verified its answer.
            </small>
          </section>
          <section className="panel chat-honesty">
            <ShieldCheck size={20} />
            <h3>Interpretation, not prediction.</h3>
            <p>
              The assistant may be wrong. Check measurements and source pages.
              Unknown outcomes are not sustained flames. These records do not
              establish universal fire-safety thresholds.
            </p>
            <Link href="/evidence">
              Open the evidence library <ArrowUpRight size={12} />
            </Link>
          </section>
          <div className="chat-privacy">
            <Sparkles size={13} />
            <div>
              <strong>Your questions go to n8n.</strong>
              <p>
                Avoid sensitive information. Your workflow or model provider may
                retain messages. New chat clears this browser session only, not
                remote logs. Follow-up memory depends on your workflow.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
