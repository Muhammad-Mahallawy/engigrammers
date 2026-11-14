import { useState } from "react";
import { Streamdown } from "streamdown";
import {
  Check,
  Copy,
  Orbit,
  RefreshCw,
  UserRound,
  AlertCircle,
} from "lucide-react";
import type { ChatMessage as Message } from "@/lib/chat";
import { safeChatUrl } from "@/lib/chat";
import { toast } from "sonner";

export default function ChatMessage({
  message,
  busy,
  onRetry,
}: {
  message: Message;
  busy: boolean;
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const assistant = message.role === "assistant";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast(
        "Copy is unavailable in this browser. Select the answer text to copy it."
      );
    }
  };
  return (
    <article
      className={`chat-message ${assistant ? "assistant" : "user"}`}
      aria-label={assistant ? "Research assistant message" : "Your message"}
    >
      <span className="chat-avatar" aria-hidden="true">
        {assistant ? <Orbit size={19} /> : <UserRound size={17} />}
      </span>
      <div className="chat-message-body">
        <div className="chat-message-byline">
          <strong>{assistant ? "FLOWTRACE" : "You"}</strong>
          <span>{assistant ? "RESEARCH ASSISTANT" : "QUESTION"}</span>
          {assistant && message.status === "complete" && (
            <button
              className="chat-copy"
              onClick={copy}
              aria-label="Copy assistant answer"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
        {message.status === "pending" ? (
          <div className="chat-thinking" role="status">
            <span>
              <i />
              <i />
              <i />
            </span>
            Waiting for your n8n workflow…
          </div>
        ) : message.status === "error" || message.status === "stopped" ? (
          <div className="chat-message-error" role="status">
            <AlertCircle size={16} />
            <div>
              <strong>
                {message.status === "stopped"
                  ? "Stopped waiting"
                  : "No answer received"}
              </strong>
              <p>{message.error}</p>
              {message.retryPayload && (
                <button className="text-link" disabled={busy} onClick={onRetry}>
                  <RefreshCw size={12} /> Retry this message
                </button>
              )}
            </div>
          </div>
        ) : assistant ? (
          <Streamdown
            className="chat-markdown"
            skipHtml
            rehypePlugins={[]}
            remarkPlugins={[]}
            parseIncompleteMarkdown={false}
            controls={false}
            urlTransform={safeChatUrl}
            disallowedElements={[
              "img",
              "iframe",
              "script",
              "style",
              "video",
              "audio",
              "object",
              "embed",
              "form",
              "input",
            ]}
            components={{
              a: ({ children, href }) =>
                href ? (
                  <a
                    href={href}
                    target={href.startsWith("/") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ) : (
                  <span>{children}</span>
                ),
              code: ({ children }) => <code>{children}</code>,
              pre: ({ children }) => <pre>{children}</pre>,
            }}
          >
            {message.content}
          </Streamdown>
        ) : (
          <p className="chat-user-text">{message.content}</p>
        )}
        {message.context?.length ? (
          <div className="chat-sent-context">
            <span>Record context sent</span>
            {message.context.map(record => (
              <span key={record.test_id}>{record.test_id}</span>
            ))}
          </div>
        ) : null}
        {assistant && message.status === "complete" && (
          <small className="chat-answer-note">
            AI interpretation · verify record-specific claims against the source
          </small>
        )}
      </div>
    </article>
  );
}
